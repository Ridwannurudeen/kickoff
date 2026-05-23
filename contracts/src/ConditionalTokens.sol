// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ConditionalTokens
/// @notice A simplified, binary-only conditional-tokens framework (Gnosis CTF-inspired).
///         Each condition is a single binary question. Outcome shares are ERC-1155 tokens.
///         A complete set (1 of each outcome) is always backed 1:1 by collateral, which
///         guarantees solvency. Resolution is gated by ORACLE_ROLE and is append-only.
contract ConditionalTokens is ERC1155, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    uint8 public constant MAX_OUTCOMES = 16;

    enum Status {
        None, // 0 - unknown condition
        Open, // 1 - tradeable
        Resolved, // 2 - payouts set
        Voided // 3 - cancelled, equal payouts (refund)
    }

    struct Condition {
        address collateral;
        uint8 outcomeSlotCount;
        Status status;
        uint256 payoutDenominator; // sum of numerators; 0 until resolved/voided
    }

    mapping(bytes32 conditionId => Condition) private _conditions;
    mapping(bytes32 conditionId => uint256[] numerators) private _payoutNumerators;

    event ConditionPrepared(
        bytes32 indexed conditionId, address indexed collateral, bytes32 indexed questionId, uint8 outcomeSlotCount
    );
    event PositionSplit(address indexed stakeholder, bytes32 indexed conditionId, uint256 amount);
    event PositionsMerge(address indexed stakeholder, bytes32 indexed conditionId, uint256 amount);
    event ConditionResolved(bytes32 indexed conditionId, address indexed oracle, uint256[] payoutNumerators);
    event ConditionVoided(bytes32 indexed conditionId, address indexed oracle);
    event PayoutRedemption(address indexed redeemer, bytes32 indexed conditionId, uint256 payout);

    constructor(string memory uri_, address admin) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
    }

    // --- lifecycle ---

    /// @notice Register a new binary condition for `questionId` collateralized by `collateral`.
    function prepareCondition(address collateral, bytes32 questionId, uint8 outcomeSlotCount)
        external
        returns (bytes32 conditionId)
    {
        require(outcomeSlotCount >= 2 && outcomeSlotCount <= MAX_OUTCOMES, "outcomes");
        require(collateral != address(0), "bad collateral");
        conditionId = keccak256(abi.encode(collateral, questionId, outcomeSlotCount));
        require(_conditions[conditionId].status == Status.None, "exists");
        _conditions[conditionId] = Condition({
            collateral: collateral, outcomeSlotCount: outcomeSlotCount, status: Status.Open, payoutDenominator: 0
        });
        emit ConditionPrepared(conditionId, collateral, questionId, outcomeSlotCount);
    }

    // --- split / merge complete sets ---

    /// @notice Lock `amount` collateral and mint `amount` of every outcome share to the caller.
    function splitPosition(bytes32 conditionId, uint256 amount) external nonReentrant {
        Condition storage c = _conditions[conditionId];
        require(c.status == Status.Open, "not open");
        require(amount > 0, "zero");
        IERC20(c.collateral).safeTransferFrom(msg.sender, address(this), amount);
        for (uint8 i = 0; i < c.outcomeSlotCount; ++i) {
            _mint(msg.sender, getPositionId(c.collateral, conditionId, i), amount, "");
        }
        emit PositionSplit(msg.sender, conditionId, amount);
    }

    /// @notice Burn `amount` of every outcome share from the caller and return `amount` collateral.
    ///         A complete set is worth exactly 1 collateral in every status, so merge is always safe.
    function mergePositions(bytes32 conditionId, uint256 amount) external nonReentrant {
        Condition storage c = _conditions[conditionId];
        require(c.status != Status.None, "no condition");
        require(amount > 0, "zero");
        for (uint8 i = 0; i < c.outcomeSlotCount; ++i) {
            _burn(msg.sender, getPositionId(c.collateral, conditionId, i), amount);
        }
        IERC20(c.collateral).safeTransfer(msg.sender, amount);
        emit PositionsMerge(msg.sender, conditionId, amount);
    }

    // --- resolution (oracle) ---

    /// @notice Set the final payouts. Append-only: a condition can only be resolved once.
    function reportPayouts(bytes32 conditionId, uint256[] calldata payouts) external onlyRole(ORACLE_ROLE) {
        Condition storage c = _conditions[conditionId];
        require(c.status == Status.Open, "not open");
        require(payouts.length == c.outcomeSlotCount, "len");
        uint256 den;
        for (uint256 i = 0; i < payouts.length; ++i) {
            den += payouts[i];
        }
        require(den > 0, "all zero");
        _payoutNumerators[conditionId] = payouts;
        c.payoutDenominator = den;
        c.status = Status.Resolved;
        emit ConditionResolved(conditionId, msg.sender, payouts);
    }

    /// @notice Cancel a condition. Every outcome pays equally, so each share refunds its pro-rata
    ///         slice of a complete set. Append-only.
    function voidCondition(bytes32 conditionId) external onlyRole(ORACLE_ROLE) {
        Condition storage c = _conditions[conditionId];
        require(c.status == Status.Open, "not open");
        uint256[] memory payouts = new uint256[](c.outcomeSlotCount);
        for (uint8 i = 0; i < c.outcomeSlotCount; ++i) {
            payouts[i] = 1;
        }
        _payoutNumerators[conditionId] = payouts;
        c.payoutDenominator = c.outcomeSlotCount;
        c.status = Status.Voided;
        emit ConditionVoided(conditionId, msg.sender);
    }

    // --- redeem ---

    /// @notice Burn all of the caller's outcome shares for a resolved/voided condition and pay out.
    function redeemPositions(bytes32 conditionId) external nonReentrant returns (uint256 payout) {
        Condition storage c = _conditions[conditionId];
        require(c.status == Status.Resolved || c.status == Status.Voided, "not resolved");
        uint256 den = c.payoutDenominator;
        uint256[] storage nums = _payoutNumerators[conditionId];
        for (uint8 i = 0; i < c.outcomeSlotCount; ++i) {
            uint256 id = getPositionId(c.collateral, conditionId, i);
            uint256 bal = balanceOf(msg.sender, id);
            if (bal == 0) continue;
            uint256 num = nums[i];
            if (num > 0) {
                payout += Math.mulDiv(bal, num, den);
            }
            _burn(msg.sender, id, bal);
        }
        require(payout > 0, "nothing to redeem");
        IERC20(c.collateral).safeTransfer(msg.sender, payout);
        emit PayoutRedemption(msg.sender, conditionId, payout);
    }

    // --- views ---

    function getPositionId(address collateral, bytes32 conditionId, uint8 outcomeIndex) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(collateral, conditionId, outcomeIndex)));
    }

    function getCondition(bytes32 conditionId)
        external
        view
        returns (address collateral, uint8 outcomeSlotCount, Status status, uint256 payoutDenominator)
    {
        Condition storage c = _conditions[conditionId];
        return (c.collateral, c.outcomeSlotCount, c.status, c.payoutDenominator);
    }

    function conditionStatus(bytes32 conditionId) external view returns (uint8) {
        return uint8(_conditions[conditionId].status);
    }

    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint8) {
        return _conditions[conditionId].outcomeSlotCount;
    }

    function collateralOf(bytes32 conditionId) external view returns (address) {
        return _conditions[conditionId].collateral;
    }

    function payoutNumerators(bytes32 conditionId) external view returns (uint256[] memory) {
        return _payoutNumerators[conditionId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
