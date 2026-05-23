// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";

/// @title OptimisticOracle
/// @notice Bonded optimistic resolution for Kickoff conditions. Anyone can propose a result by
///         posting a bond; if undisputed for the liveness window, anyone can settle it and the
///         result is written to ConditionalTokens. A disputer can post an equal bond inside the
///         window, escalating to an ARBITER (a Safe/committee in v1) who decides the outcome; the
///         bonds go to whichever side the written result agrees with. This contract must hold
///         ORACLE_ROLE on the ConditionalTokens so it can call reportPayouts.
/// @dev Each proposal SNAPSHOTS its bond and deadline at propose time, so changing the global
///      `bondAmount`/`liveness` only affects future proposals (never corrupts a live one's bond
///      conservation or dispute window).
contract OptimisticOracle is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    enum PStatus {
        None,
        Proposed,
        Disputed,
        Settled
    }

    struct Proposal {
        address proposer;
        address disputer;
        uint64 proposedAt;
        uint64 deadline; // proposedAt + liveness, snapshotted at propose
        PStatus status;
        uint256 bond; // bondAmount snapshotted at propose (each leg posts this)
        uint256[] payouts;
    }

    IConditionalTokens public immutable conditionalTokens;
    IERC20 public immutable bondToken;
    uint256 public bondAmount; // applies to FUTURE proposals
    uint64 public liveness; // applies to FUTURE proposals
    uint64 public arbitrationWindow; // after this, a stuck disputed proposal can be cancelled

    mapping(bytes32 conditionId => Proposal) private _proposals;

    event Proposed(bytes32 indexed conditionId, address indexed proposer, uint256[] payouts, uint64 deadline);
    event Disputed(bytes32 indexed conditionId, address indexed disputer);
    event Settled(bytes32 indexed conditionId, uint256[] payouts);
    event DisputeResolved(bytes32 indexed conditionId, bool proposerWon, uint256[] payouts);
    event ProposalCancelled(bytes32 indexed conditionId);
    event ParamsUpdated(uint256 bondAmount, uint64 liveness);
    event ArbitrationWindowUpdated(uint64 arbitrationWindow);

    constructor(
        address conditionalTokens_,
        address bondToken_,
        uint256 bondAmount_,
        uint64 liveness_,
        address admin,
        address arbiter
    ) {
        require(conditionalTokens_ != address(0) && bondToken_ != address(0), "zero addr");
        require(liveness_ > 0, "liveness");
        conditionalTokens = IConditionalTokens(conditionalTokens_);
        bondToken = IERC20(bondToken_);
        bondAmount = bondAmount_;
        liveness = liveness_;
        arbitrationWindow = 7 days;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITER_ROLE, arbiter);
    }

    /// @notice Propose a result for an Open condition, posting `bondAmount` of the bond token.
    function propose(bytes32 conditionId, uint256[] calldata payouts) external nonReentrant {
        Proposal storage p = _proposals[conditionId];
        require(p.status == PStatus.None, "exists");
        require(conditionalTokens.conditionStatus(conditionId) == 1, "not open");
        _validatePayouts(conditionId, payouts);

        uint256 bond = bondAmount; // snapshot
        p.proposer = msg.sender;
        p.proposedAt = uint64(block.timestamp);
        p.deadline = uint64(block.timestamp) + liveness; // snapshot window
        p.status = PStatus.Proposed;
        p.bond = bond;
        p.payouts = payouts;

        if (bond > 0) bondToken.safeTransferFrom(msg.sender, address(this), bond);
        emit Proposed(conditionId, msg.sender, payouts, p.deadline);
    }

    /// @notice Dispute a live proposal within its (snapshotted) liveness window, posting an equal bond.
    function dispute(bytes32 conditionId) external nonReentrant {
        Proposal storage p = _proposals[conditionId];
        require(p.status == PStatus.Proposed, "not proposed");
        require(block.timestamp < p.deadline, "window over");

        p.disputer = msg.sender;
        p.status = PStatus.Disputed;

        if (p.bond > 0) bondToken.safeTransferFrom(msg.sender, address(this), p.bond);
        emit Disputed(conditionId, msg.sender);
    }

    /// @notice Settle an undisputed proposal after its window; writes the result on-chain.
    function settle(bytes32 conditionId) external nonReentrant {
        Proposal storage p = _proposals[conditionId];
        require(p.status == PStatus.Proposed, "not settleable");
        require(block.timestamp >= p.deadline, "too early");

        p.status = PStatus.Settled;
        uint256 bond = p.bond;
        address proposer = p.proposer;
        uint256[] memory payouts = p.payouts;

        conditionalTokens.reportPayouts(conditionId, payouts);
        if (bond > 0) bondToken.safeTransfer(proposer, bond); // refund proposer
        emit Settled(conditionId, payouts);
    }

    /// @notice Arbiter resolves a dispute by writing `finalPayouts`. The bonds (both legs) go to
    ///         whichever side the written result agrees with: proposer if it equals their proposal,
    ///         otherwise the disputer. The award cannot disagree with the written result.
    function resolveDispute(bytes32 conditionId, uint256[] calldata finalPayouts)
        external
        nonReentrant
        onlyRole(ARBITER_ROLE)
    {
        Proposal storage p = _proposals[conditionId];
        require(p.status == PStatus.Disputed, "not disputed");
        _validatePayouts(conditionId, finalPayouts);

        bool proposerWon = _payoutsEqual(p.payouts, finalPayouts);
        p.status = PStatus.Settled;
        uint256 bond = p.bond;
        address winner = proposerWon ? p.proposer : p.disputer;

        conditionalTokens.reportPayouts(conditionId, finalPayouts);
        if (bond > 0) bondToken.safeTransfer(winner, bond * 2); // both bonds to the correct side
        emit DisputeResolved(conditionId, proposerWon, finalPayouts);
    }

    /// @notice Escape hatch. Refunds posted bond(s) when a proposal can no longer settle:
    ///         (a) the condition was resolved/voided out-of-band (terminal), or
    ///         (b) it's Disputed and the arbiter never ruled within `arbitrationWindow`
    ///             (resets the proposal so the condition can be re-proposed).
    function cancelProposal(bytes32 conditionId) external nonReentrant {
        Proposal storage p = _proposals[conditionId];
        PStatus st = p.status;
        require(st == PStatus.Proposed || st == PStatus.Disputed, "nothing to cancel");

        bool conditionOpen = conditionalTokens.conditionStatus(conditionId) == 1;
        bool arbiterTimedOut = st == PStatus.Disputed && block.timestamp >= uint256(p.proposedAt) + arbitrationWindow;
        require(!conditionOpen || arbiterTimedOut, "still resolvable");

        uint256 bond = p.bond;
        address proposer = p.proposer;
        address disputer = p.disputer;
        bool wasDisputed = st == PStatus.Disputed;

        if (conditionOpen) {
            delete _proposals[conditionId]; // arbiter timed out — allow a fresh proposal
        } else {
            p.status = PStatus.Settled; // condition resolved out-of-band — terminal
        }

        if (bond > 0) {
            bondToken.safeTransfer(proposer, bond);
            if (wasDisputed) bondToken.safeTransfer(disputer, bond);
        }
        emit ProposalCancelled(conditionId);
    }

    // --- admin (affects FUTURE proposals only) ---

    function setParams(uint256 bondAmount_, uint64 liveness_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(liveness_ > 0, "liveness");
        bondAmount = bondAmount_;
        liveness = liveness_;
        emit ParamsUpdated(bondAmount_, liveness_);
    }

    function setArbitrationWindow(uint64 window) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(window > 0, "window");
        arbitrationWindow = window;
        emit ArbitrationWindowUpdated(window);
    }

    // --- views ---

    function getProposal(bytes32 conditionId)
        external
        view
        returns (address proposer, address disputer, uint64 proposedAt, uint8 status, uint256[] memory payouts)
    {
        Proposal storage p = _proposals[conditionId];
        return (p.proposer, p.disputer, p.proposedAt, uint8(p.status), p.payouts);
    }

    function _validatePayouts(bytes32 conditionId, uint256[] calldata payouts) internal view {
        uint8 n = conditionalTokens.getOutcomeSlotCount(conditionId);
        require(n >= 2 && payouts.length == n, "bad length");
        uint256 sum;
        for (uint256 i = 0; i < payouts.length; ++i) {
            sum += payouts[i];
        }
        require(sum > 0, "all zero");
    }

    function _payoutsEqual(uint256[] storage a, uint256[] calldata b) internal view returns (bool) {
        if (a.length != b.length) return false;
        for (uint256 i = 0; i < a.length; ++i) {
            if (a[i] != b[i]) return false;
        }
        return true;
    }
}
