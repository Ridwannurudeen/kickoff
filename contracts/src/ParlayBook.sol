// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";

interface IMarket {
    function conditionId() external view returns (bytes32);
    function outcomeCount() external view returns (uint256);
    function prices() external view returns (uint256[] memory);
    function getReserves() external view returns (uint256[] memory);
}

interface IFactory {
    function marketCondition(address market) external view returns (bytes32);
}

/// @title ParlayBook
/// @notice House-backed fixed-odds parlays over Kickoff markets. A bettor combines 2..8 legs
///         (a factory-deployed market + a chosen outcome each); decimal odds are snapshotted from
///         each market's live `prices()` at placement, and the bettor wins `stake x product(odds)`
///         only if EVERY leg's chosen outcome wins. Payouts come from an owner-funded house pool.
/// @dev Hardened per the security review: legs must be FACTORY-VERIFIED markets (provenance), each
///      leg must clear a minimum-liquidity floor (blunts spot-odds manipulation), stale parlays can
///      be cancelled to release locked house funds, and partial-void settlement correctly drops the
///      voided legs while still letting a lost surviving leg win for the house.
contract ParlayBook is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 internal constant ONE = 1e18;
    uint256 internal constant BPS = 10_000;
    uint256 internal constant MIN_LEG_PRICE = ONE / 1000; // <= 1000x odds per leg (sanity + overflow guard)
    uint64 internal constant STALE_TIMEOUT = 30 days; // after this, an unsettleable parlay refunds

    IERC20 public immutable collateral;
    IConditionalTokens public immutable conditionalTokens;
    IFactory public immutable factory;

    uint256 public maxExposureBps; // max single-parlay payout as a fraction of free liquidity
    uint256 public minLiquidity; // min total reserves a leg's market must have (anti-manipulation)
    uint8 public minLegs;
    uint8 public maxLegs;
    uint256 public lockedExposure;

    struct Parlay {
        address bettor;
        uint256 stake;
        uint256 payout; // max payout (all legs win); also the reserved exposure
        uint64 placedAt;
        bool settled;
        bytes32[] conditionIds;
        uint8[] outcomes;
        uint256[] legOdds; // per-leg decimal odds, 1e18-scaled (for correct partial-void settlement)
        address[] markets; // stored for display/queries only — odds + provenance use the factory, not this
    }

    Parlay[] private _parlays;

    event HouseDeposited(uint256 amount);
    event HouseWithdrawn(uint256 amount);
    event ParlayPlaced(uint256 indexed id, address indexed bettor, uint256 stake, uint256 payout, uint256 legs);
    event ParlaySettled(uint256 indexed id, uint8 result, uint256 paid); // 0=lost,1=won,2=void/refund
    event ParamsUpdated(uint256 maxExposureBps, uint256 minLiquidity, uint8 minLegs, uint8 maxLegs);

    constructor(
        address collateral_,
        address conditionalTokens_,
        address factory_,
        uint256 maxExposureBps_,
        uint256 minLiquidity_,
        address owner_
    ) Ownable(owner_) {
        require(collateral_ != address(0) && conditionalTokens_ != address(0) && factory_ != address(0), "zero addr");
        require(maxExposureBps_ > 0 && maxExposureBps_ <= BPS, "exposure");
        collateral = IERC20(collateral_);
        conditionalTokens = IConditionalTokens(conditionalTokens_);
        factory = IFactory(factory_);
        maxExposureBps = maxExposureBps_;
        minLiquidity = minLiquidity_;
        minLegs = 2;
        maxLegs = 8;
    }

    // --- house liquidity (owner) ---

    function depositHouse(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "zero");
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        emit HouseDeposited(amount);
    }

    function withdrawHouse(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0 && amount <= freeLiquidity(), "exceeds free");
        collateral.safeTransfer(owner(), amount);
        emit HouseWithdrawn(amount);
    }

    function freeLiquidity() public view returns (uint256) {
        return collateral.balanceOf(address(this)) - lockedExposure;
    }

    // --- betting ---

    function placeParlay(address[] calldata markets, uint8[] calldata outcomes, uint256 stake)
        external
        nonReentrant
        returns (uint256 id)
    {
        uint256 n = markets.length;
        require(n == outcomes.length && n >= minLegs && n <= maxLegs, "legs");
        require(stake > 0, "stake");

        bytes32[] memory cids = new bytes32[](n);
        uint256[] memory legOdds = new uint256[](n);
        uint256 combinedOdds = ONE; // 1.0x, 1e18-scaled
        for (uint256 i = 0; i < n; ++i) {
            // (#1) provenance: only factory-deployed markets; the factory is the authority on the
            // condition id, so a fabricated market contract cannot spoof odds or the dup check.
            bytes32 cid = factory.marketCondition(markets[i]);
            require(cid != bytes32(0), "unknown market");
            for (uint256 j = 0; j < i; ++j) {
                require(cids[j] != cid, "duplicate condition");
            }
            require(conditionalTokens.conditionStatus(cid) == 1, "leg not open");

            IMarket m = IMarket(markets[i]);
            require(outcomes[i] < m.outcomeCount(), "idx");
            require(_totalReserves(m) >= minLiquidity, "thin market"); // (#2) anti-manipulation floor
            uint256 prob = m.prices()[outcomes[i]];
            require(prob >= MIN_LEG_PRICE, "leg odds too long");

            uint256 odds = ONE * ONE / prob; // decimal odds, 1e18-scaled
            legOdds[i] = odds;
            combinedOdds = combinedOdds * odds / ONE;
            cids[i] = cid;
        }

        uint256 payout = stake * combinedOdds / ONE;
        require(payout > stake, "no edge");
        require(payout <= freeLiquidity() * maxExposureBps / BPS, "exceeds house cap");

        collateral.safeTransferFrom(msg.sender, address(this), stake);
        lockedExposure += payout;

        id = _parlays.length;
        _parlays.push(
            Parlay({
                bettor: msg.sender,
                stake: stake,
                payout: payout,
                placedAt: uint64(block.timestamp),
                settled: false,
                conditionIds: cids,
                outcomes: outcomes,
                legOdds: legOdds,
                markets: markets
            })
        );
        emit ParlayPlaced(id, msg.sender, stake, payout, n);
    }

    /// @notice Settle a parlay once every leg is resolved/voided. Voided legs drop out (odds 1.0);
    ///         the bettor wins the product of the surviving legs' odds only if all surviving legs won.
    function settleParlay(uint256 id) external nonReentrant {
        Parlay storage p = _parlays[id];
        require(!p.settled, "settled");

        uint256 survivingOdds = ONE;
        uint256 surviving;
        bool anyLost;
        for (uint256 i = 0; i < p.conditionIds.length; ++i) {
            uint8 st = conditionalTokens.conditionStatus(p.conditionIds[i]);
            require(st == 2 || st == 3, "leg unresolved");
            if (st == 3) continue; // voided leg -> excluded
            ++surviving;
            uint256[] memory nums = conditionalTokens.payoutNumerators(p.conditionIds[i]);
            if (nums[p.outcomes[i]] == 0) {
                anyLost = true;
            } else {
                survivingOdds = survivingOdds * p.legOdds[i] / ONE;
            }
        }

        p.settled = true;
        lockedExposure -= p.payout;

        if (surviving == 0) {
            // every leg voided -> refund stake
            collateral.safeTransfer(p.bettor, p.stake);
            emit ParlaySettled(id, 2, p.stake);
        } else if (anyLost) {
            // a surviving leg lost -> house keeps the stake (a void cannot rescue a lost leg)
            emit ParlaySettled(id, 0, 0);
        } else {
            uint256 paid = p.stake * survivingOdds / ONE; // <= p.payout, so always covered by the lock
            collateral.safeTransfer(p.bettor, paid);
            emit ParlaySettled(id, 1, paid);
        }
    }

    /// @notice (#3) Refund a parlay whose legs never resolved, after a generous timeout, so the
    ///         reserved house liquidity isn't locked forever. Permissionless.
    function cancelStaleParlay(uint256 id) external nonReentrant {
        Parlay storage p = _parlays[id];
        require(!p.settled, "settled");
        require(block.timestamp >= uint256(p.placedAt) + STALE_TIMEOUT, "not stale");
        p.settled = true;
        lockedExposure -= p.payout;
        collateral.safeTransfer(p.bettor, p.stake);
        emit ParlaySettled(id, 2, p.stake);
    }

    // --- admin ---

    function setParams(uint256 maxExposureBps_, uint256 minLiquidity_, uint8 minLegs_, uint8 maxLegs_)
        external
        onlyOwner
    {
        require(maxExposureBps_ > 0 && maxExposureBps_ <= BPS, "exposure");
        require(minLegs_ >= 2 && maxLegs_ >= minLegs_ && maxLegs_ <= 12, "legs");
        maxExposureBps = maxExposureBps_;
        minLiquidity = minLiquidity_;
        minLegs = minLegs_;
        maxLegs = maxLegs_;
        emit ParamsUpdated(maxExposureBps_, minLiquidity_, minLegs_, maxLegs_);
    }

    // --- views ---

    function parlaysLength() external view returns (uint256) {
        return _parlays.length;
    }

    function getParlay(uint256 id)
        external
        view
        returns (
            address bettor,
            uint256 stake,
            uint256 payout,
            bool settled,
            address[] memory markets,
            uint8[] memory outcomes
        )
    {
        Parlay storage p = _parlays[id];
        return (p.bettor, p.stake, p.payout, p.settled, p.markets, p.outcomes);
    }

    function _totalReserves(IMarket m) internal view returns (uint256 tot) {
        uint256[] memory r = m.getReserves();
        for (uint256 i = 0; i < r.length; ++i) {
            tot += r[i];
        }
    }
}
