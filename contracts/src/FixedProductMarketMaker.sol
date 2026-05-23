// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";

/// @title FixedProductMarketMaker
/// @notice A categorical (N-outcome) constant-product market maker over conditional-token outcome
///         shares, faithful to the Gnosis FPMM mechanism — now with PUBLIC liquidity: the contract
///         is itself an ERC-20 LP token. Anyone can `addFunding`/`removeFunding`, and trading fees
///         are distributed pro-rata to LPs (Gnosis `feePoolWeight`/`withdrawnFees` accounting).
///         Deployed as an EIP-1167 clone (uses `initialize`, not a constructor). Outcome reserves
///         are read live from the contract's own ERC-1155 balances.
contract FixedProductMarketMaker is ERC20, ERC1155Holder, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 internal constant ONE = 1e18;
    uint256 internal constant BPS = 10_000;
    uint256 internal constant PRICE_SCALE = 1e36;

    bool private _initialized;

    IConditionalTokens public conditionalTokens;
    IERC20 public collateralToken;
    bytes32 public conditionId;
    uint256 public outcomeCount;
    uint256 public feeBps;
    address public owner; // market creator (informational)
    bool public closed;
    uint256[] public positionIds;

    // --- LP fee accounting (Gnosis) ---
    uint256 public feePoolWeight;
    uint256 internal totalWithdrawnFees;
    mapping(address => uint256) internal withdrawnFees;

    event FPMMInitialized(
        address conditionalTokens,
        address collateral,
        bytes32 conditionId,
        uint256 outcomeCount,
        uint256 feeBps,
        address owner
    );
    event FPMMFundingAdded(address indexed funder, uint256[] amountsAdded, uint256 sharesMinted);
    event FPMMFundingRemoved(
        address indexed funder, uint256[] amountsRemoved, uint256 collateralFeesRemoved, uint256 sharesBurnt
    );
    event FPMMBuy(
        address indexed buyer,
        uint8 outcomeIndex,
        uint256 investmentAmount,
        uint256 feeAmount,
        uint256 outcomeTokensBought
    );
    event FPMMSell(
        address indexed seller, uint8 outcomeIndex, uint256 returnAmount, uint256 feeAmount, uint256 outcomeTokensSold
    );
    event FeesWithdrawn(address indexed account, uint256 amount);
    event Closed();

    constructor() ERC20("Kickoff Liquidity", "kLP") {}

    /// @notice One-shot initializer for the clone.
    function initialize(address ct, address collateral, bytes32 cid, uint256 outcomeCount_, uint256 fee, address owner_)
        external
    {
        require(!_initialized, "init");
        require(fee <= 1000, "fee too high");
        require(outcomeCount_ >= 2 && outcomeCount_ <= 16, "outcomes");
        require(ct != address(0) && collateral != address(0) && owner_ != address(0), "zero addr");
        _initialized = true;
        conditionalTokens = IConditionalTokens(ct);
        collateralToken = IERC20(collateral);
        conditionId = cid;
        outcomeCount = outcomeCount_;
        feeBps = fee;
        owner = owner_;
        for (uint256 i = 0; i < outcomeCount_; ++i) {
            positionIds.push(conditionalTokens.getPositionId(collateral, cid, uint8(i)));
        }
        emit FPMMInitialized(ct, collateral, cid, outcomeCount_, fee, owner_);
    }

    // LP token: collateral-denominated shares; clones don't run the constructor, so pin name/symbol.
    function name() public pure override returns (string memory) {
        return "Kickoff Liquidity";
    }

    function symbol() public pure override returns (string memory) {
        return "kLP";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // --- public liquidity ---

    /// @notice Add liquidity. On the first funding an optional `distributionHint` sets the opening
    ///         line; afterwards funds are added at the current pool ratio and the excess outcome
    ///         shares are returned to the funder. Mints LP tokens. Permissionless.
    function addFunding(uint256 addedFunds, uint256[] calldata distributionHint)
        external
        nonReentrant
        returns (uint256 mintAmount)
    {
        return _addFunding(addedFunds, distributionHint);
    }

    /// @notice Convenience alias: add `amount` at the current ratio (no distribution hint).
    function addLiquidity(uint256 amount) external nonReentrant returns (uint256 mintAmount) {
        return _addFunding(amount, new uint256[](0));
    }

    function _addFunding(uint256 addedFunds, uint256[] memory distributionHint) internal returns (uint256 mintAmount) {
        require(!closed, "closed");
        require(addedFunds > 0, "zero");
        uint256 n = outcomeCount;
        uint256[] memory sendBack = new uint256[](n);
        uint256 supply = totalSupply();

        if (supply > 0) {
            require(distributionHint.length == 0, "hint only on first funding");
            uint256[] memory bal = getReserves();
            uint256 poolWeight;
            for (uint256 i = 0; i < n; ++i) {
                if (bal[i] > poolWeight) poolWeight = bal[i];
            }
            for (uint256 i = 0; i < n; ++i) {
                uint256 remaining = addedFunds * bal[i] / poolWeight;
                sendBack[i] = addedFunds - remaining;
            }
            mintAmount = addedFunds * supply / poolWeight;
        } else {
            if (distributionHint.length > 0) {
                require(distributionHint.length == n, "hint length");
                uint256 maxHint;
                for (uint256 i = 0; i < n; ++i) {
                    if (distributionHint[i] > maxHint) maxHint = distributionHint[i];
                }
                require(maxHint > 0, "bad hint");
                for (uint256 i = 0; i < n; ++i) {
                    uint256 remaining = addedFunds * distributionHint[i] / maxHint;
                    require(remaining > 0, "bad hint");
                    sendBack[i] = addedFunds - remaining;
                }
            }
            mintAmount = addedFunds;
        }

        collateralToken.safeTransferFrom(msg.sender, address(this), addedFunds);
        collateralToken.forceApprove(address(conditionalTokens), addedFunds);
        conditionalTokens.splitPosition(conditionId, addedFunds);
        _mint(msg.sender, mintAmount);

        for (uint256 i = 0; i < n; ++i) {
            if (sendBack[i] > 0) {
                conditionalTokens.safeTransferFrom(address(this), msg.sender, positionIds[i], sendBack[i], "");
                sendBack[i] = addedFunds - sendBack[i]; // report amount actually added to the pool
            } else {
                sendBack[i] = addedFunds;
            }
        }
        emit FPMMFundingAdded(msg.sender, sendBack, mintAmount);
    }

    /// @notice Burn `sharesToBurn` LP tokens for a pro-rata share of every outcome reserve, plus
    ///         the LP's accrued trading fees (settled during the burn). Allowed even after close.
    function removeFunding(uint256 sharesToBurn) external nonReentrant {
        require(sharesToBurn > 0, "zero");
        uint256 n = outcomeCount;
        uint256[] memory bal = getReserves();
        uint256 supply = totalSupply();
        uint256[] memory sendAmounts = new uint256[](n);
        for (uint256 i = 0; i < n; ++i) {
            sendAmounts[i] = bal[i] * sharesToBurn / supply;
        }

        uint256 feesBefore = collateralToken.balanceOf(address(this));
        _burn(msg.sender, sharesToBurn); // _update settles the LP's fees
        uint256 feesPaid = feesBefore - collateralToken.balanceOf(address(this));

        for (uint256 i = 0; i < n; ++i) {
            if (sendAmounts[i] > 0) {
                conditionalTokens.safeTransferFrom(address(this), msg.sender, positionIds[i], sendAmounts[i], "");
            }
        }
        emit FPMMFundingRemoved(msg.sender, sendAmounts, feesPaid, sharesToBurn);
    }

    // --- trading ---

    function calcBuyAmount(uint8 outcomeIndex, uint256 investmentAmount) public view returns (uint256) {
        require(outcomeIndex < outcomeCount, "idx");
        uint256[] memory r = getReserves();
        uint256 investMinusFees = investmentAmount - (investmentAmount * feeBps / BPS);
        uint256 ending = r[outcomeIndex] * ONE;
        for (uint256 j = 0; j < r.length; ++j) {
            if (j == outcomeIndex) continue;
            ending = Math.mulDiv(ending, r[j], r[j] + investMinusFees, Math.Rounding.Ceil);
        }
        require(ending > 0, "no liquidity");
        return r[outcomeIndex] + investMinusFees - Math.ceilDiv(ending, ONE);
    }

    function calcSellAmount(uint8 outcomeIndex, uint256 returnAmount) public view returns (uint256) {
        require(outcomeIndex < outcomeCount, "idx");
        uint256[] memory r = getReserves();
        uint256 returnPlusFees = returnAmount * BPS / (BPS - feeBps);
        uint256 ending = r[outcomeIndex] * ONE;
        for (uint256 j = 0; j < r.length; ++j) {
            if (j == outcomeIndex) continue;
            require(returnPlusFees < r[j], "insufficient liquidity");
            ending = Math.mulDiv(ending, r[j], r[j] - returnPlusFees, Math.Rounding.Ceil);
        }
        return returnPlusFees + Math.ceilDiv(ending, ONE) - r[outcomeIndex];
    }

    function buy(uint8 outcomeIndex, uint256 investmentAmount, uint256 minOutcomeTokensToBuy)
        external
        nonReentrant
        returns (uint256 tokensOut)
    {
        require(!closed, "closed");
        require(investmentAmount > 0, "zero");
        tokensOut = calcBuyAmount(outcomeIndex, investmentAmount);
        require(tokensOut > 0 && tokensOut >= minOutcomeTokensToBuy, "min not met");

        collateralToken.safeTransferFrom(msg.sender, address(this), investmentAmount);
        uint256 feeAmount = investmentAmount * feeBps / BPS;
        feePoolWeight += feeAmount; // fees -> LPs
        uint256 investMinusFees = investmentAmount - feeAmount;

        collateralToken.forceApprove(address(conditionalTokens), investMinusFees);
        conditionalTokens.splitPosition(conditionId, investMinusFees);
        conditionalTokens.safeTransferFrom(address(this), msg.sender, positionIds[outcomeIndex], tokensOut, "");

        emit FPMMBuy(msg.sender, outcomeIndex, investmentAmount, feeAmount, tokensOut);
    }

    function sell(uint8 outcomeIndex, uint256 returnAmount, uint256 maxOutcomeTokensToSell)
        external
        nonReentrant
        returns (uint256 tokensIn)
    {
        require(!closed, "closed");
        require(returnAmount > 0, "zero");
        tokensIn = calcSellAmount(outcomeIndex, returnAmount);
        require(tokensIn <= maxOutcomeTokensToSell, "max exceeded");

        conditionalTokens.safeTransferFrom(msg.sender, address(this), positionIds[outcomeIndex], tokensIn, "");
        uint256 feeAmount = returnAmount * feeBps / (BPS - feeBps);
        feePoolWeight += feeAmount; // fees -> LPs
        uint256 returnPlusFees = returnAmount + feeAmount;

        conditionalTokens.mergePositions(conditionId, returnPlusFees);
        collateralToken.safeTransfer(msg.sender, returnAmount);

        emit FPMMSell(msg.sender, outcomeIndex, returnAmount, feeAmount, tokensIn);
    }

    // --- close + LP fees ---

    function close() external {
        require(!closed, "already");
        uint8 s = conditionalTokens.conditionStatus(conditionId);
        require(s == 2 || s == 3, "not resolved");
        closed = true;
        emit Closed();
    }

    /// @notice Withdraw `account`'s accrued share of trading fees.
    function withdrawFees(address account) public {
        uint256 supply = totalSupply();
        uint256 rawAmount = supply == 0 ? 0 : feePoolWeight * balanceOf(account) / supply;
        uint256 withdrawable = rawAmount - withdrawnFees[account];
        if (withdrawable > 0) {
            withdrawnFees[account] = rawAmount;
            totalWithdrawnFees += withdrawable;
            collateralToken.safeTransfer(account, withdrawable);
            emit FeesWithdrawn(account, withdrawable);
        }
    }

    function feesWithdrawableBy(address account) public view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 rawAmount = supply == 0 ? 0 : feePoolWeight * balanceOf(account) / supply;
        return rawAmount > withdrawnFees[account] ? rawAmount - withdrawnFees[account] : 0;
    }

    /// @dev Gnosis fee bookkeeping: settle the sender's fees and shift the fee entitlement with the
    ///      LP tokens on every mint/burn/transfer. Runs before the balance change.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) withdrawFees(from);
        uint256 supply = totalSupply();
        // Canonical Gnosis FPMM bookkeeping. On the first mint (supply 0) feePoolWeight is 0 and
        // there are no prior LPs; the `value` offset seeded into feePoolWeight + withdrawnFees here
        // cancels exactly on withdrawal/exit (covered by the multi-LP regression tests).
        uint256 feeTransfer = supply == 0 ? value : feePoolWeight * value / supply;
        if (from != address(0)) {
            withdrawnFees[from] -= feeTransfer;
            totalWithdrawnFees -= feeTransfer;
        } else {
            feePoolWeight += feeTransfer;
        }
        if (to != address(0)) {
            withdrawnFees[to] += feeTransfer;
            totalWithdrawnFees += feeTransfer;
        } else {
            feePoolWeight -= feeTransfer;
        }
        super._update(from, to, value);
    }

    // --- views ---

    function getReserves() public view returns (uint256[] memory r) {
        r = new uint256[](outcomeCount);
        for (uint256 i = 0; i < outcomeCount; ++i) {
            r[i] = conditionalTokens.balanceOf(address(this), positionIds[i]);
        }
    }

    function getPositionIds() external view returns (uint256[] memory) {
        return positionIds;
    }

    function prices() external view returns (uint256[] memory p) {
        uint256 n = outcomeCount;
        p = new uint256[](n);
        uint256[] memory r = getReserves();
        uint256[] memory recip = new uint256[](n);
        uint256 sumRecip;
        for (uint256 i = 0; i < n; ++i) {
            if (r[i] == 0) return p;
            recip[i] = PRICE_SCALE / r[i];
            sumRecip += recip[i];
        }
        if (sumRecip == 0) return p;
        for (uint256 i = 0; i < n; ++i) {
            p[i] = recip[i] * ONE / sumRecip;
        }
    }
}
