// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {FixedProductMarketMaker} from "../src/FixedProductMarketMaker.sol";
import {MarketMakerFactory} from "../src/MarketMakerFactory.sol";

contract KickoffTest is Test, ERC1155Holder {
    MockUSDC usdc;
    ConditionalTokens ct;
    FixedProductMarketMaker impl;
    MarketMakerFactory factory;

    FixedProductMarketMaker market; // binary market used by most tests
    bytes32 conditionId;

    address treasury;
    address oracle = makeAddr("oracle");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant FEE_BPS = 200; // 2%
    uint256 constant LIQ = 10_000e6;
    bytes32 constant QID = keccak256("Will France win the 2026 World Cup?");

    function setUp() public {
        treasury = address(this);
        usdc = new MockUSDC();
        ct = new ConditionalTokens("https://kickoff.example/{id}", address(this));
        impl = new FixedProductMarketMaker();
        factory = new MarketMakerFactory(address(ct), address(impl), FEE_BPS, treasury);
        ct.grantRole(ct.ORACLE_ROLE(), oracle);

        (address m, bytes32 cid) = factory.createMarket(address(usdc), QID, 2, "France to win");
        market = FixedProductMarketMaker(m);
        conditionId = cid;

        usdc.mint(treasury, LIQ);
        usdc.approve(address(market), LIQ);
        market.addLiquidity(LIQ);

        usdc.mint(alice, 2_000_000e6);
        usdc.mint(bob, 2_000_000e6);
    }

    // ------------------------------------------------------------------ helpers

    function _buy(FixedProductMarketMaker mkt, address who, uint8 outcome, uint256 amount)
        internal
        returns (uint256 out)
    {
        vm.startPrank(who);
        usdc.approve(address(mkt), amount);
        uint256 quote = mkt.calcBuyAmount(outcome, amount);
        out = mkt.buy(outcome, amount, quote);
        vm.stopPrank();
    }

    function _newMarket(uint8 outcomes, bytes32 qid, uint256 liq) internal returns (FixedProductMarketMaker mkt) {
        (address m,) = factory.createMarket(address(usdc), qid, outcomes, "m");
        mkt = FixedProductMarketMaker(m);
        usdc.mint(treasury, liq);
        usdc.approve(address(mkt), liq);
        mkt.addLiquidity(liq);
    }

    function _sumPrices(FixedProductMarketMaker mkt) internal view returns (uint256 s) {
        uint256[] memory p = mkt.prices();
        for (uint256 i = 0; i < p.length; ++i) {
            s += p[i];
        }
    }

    // ------------------------------------------------------------------ binary lifecycle

    function test_initialState_opensAtFiftyFifty() public view {
        uint256[] memory r = market.getReserves();
        assertEq(r.length, 2);
        assertEq(r[0], LIQ);
        assertEq(r[1], LIQ);
        uint256[] memory p = market.prices();
        assertEq(p[0], 0.5e18);
        assertEq(p[1], 0.5e18);
    }

    function test_buy_movesPriceUp_andQuoteMatchesExecution() public {
        uint256 amount = 500e6;
        uint256 quote = market.calcBuyAmount(0, amount);
        uint256 got = _buy(market, alice, 0, amount);
        assertEq(got, quote, "quote == execution");

        uint256 posId = ct.getPositionId(address(usdc), conditionId, 0);
        assertEq(ct.balanceOf(alice, posId), got);
        assertGt(market.prices()[0], 0.5e18, "buying outcome 0 raises its price");
    }

    function test_priceSumsToOne_afterTrades() public {
        _buy(market, alice, 0, 700e6);
        _buy(market, bob, 1, 300e6);
        assertApproxEqAbs(_sumPrices(market), 1e18, 2);
    }

    function test_fee_accruesToLPs_andWithdraws() public {
        _buy(market, alice, 0, 1_000e6);
        uint256 expectedFee = 1_000e6 * FEE_BPS / 10_000;
        // treasury is the sole LP (funded LIQ in setUp), so it earns the whole fee
        assertEq(market.feesWithdrawableBy(treasury), expectedFee, "sole LP earns the fee");
        uint256 before = usdc.balanceOf(treasury);
        market.withdrawFees(treasury);
        assertEq(usdc.balanceOf(treasury), before + expectedFee);
        assertEq(market.feesWithdrawableBy(treasury), 0);
    }

    function test_sell_returnsCollateral() public {
        uint256 shares = _buy(market, alice, 0, 500e6);
        vm.startPrank(alice);
        ct.setApprovalForAll(address(market), true);
        uint256 needed = market.calcSellAmount(0, 100e6);
        assertLe(needed, shares, "selling for 100 needs <= held shares");
        uint256 balBefore = usdc.balanceOf(alice);
        uint256 tokensIn = market.sell(0, 100e6, needed);
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), balBefore + 100e6);
        assertEq(tokensIn, needed);
    }

    function test_fullLifecycle_resolve_redeem() public {
        uint256 aliceShares = _buy(market, alice, 0, 1_000e6);
        _buy(market, bob, 1, 1_000e6);

        vm.prank(oracle);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);

        market.close();
        assertTrue(market.closed());

        vm.prank(alice);
        uint256 paid = ct.redeemPositions(conditionId);
        assertEq(paid, aliceShares, "winner paid 1 per winning share");

        vm.prank(bob);
        vm.expectRevert(bytes("nothing to redeem"));
        ct.redeemPositions(conditionId);
    }

    function test_void_refundsEqually() public {
        _buy(market, alice, 0, 1_000e6);
        vm.prank(oracle);
        ct.voidCondition(conditionId);
        uint256 posId = ct.getPositionId(address(usdc), conditionId, 0);
        uint256 yes = ct.balanceOf(alice, posId);
        vm.prank(alice);
        uint256 paid = ct.redeemPositions(conditionId);
        assertEq(paid, yes / 2);
    }

    function test_close_revertsBeforeResolution() public {
        vm.expectRevert(bytes("not resolved"));
        market.close();
    }

    function test_tradingBlockedAfterClose() public {
        vm.prank(oracle);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        market.close();
        vm.startPrank(alice);
        usdc.approve(address(market), 100e6);
        vm.expectRevert(bytes("closed"));
        market.buy(0, 100e6, 0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ categorical (3-way, e.g. 1X2)

    function test_categorical_opensUniform_andSumsToOne() public {
        FixedProductMarketMaker m3 = _newMarket(3, keccak256("USA vs MEX result"), 9_000e6);
        uint256[] memory r = m3.getReserves();
        assertEq(r.length, 3);
        assertEq(r[0], 9_000e6);
        assertEq(r[1], 9_000e6);
        assertEq(r[2], 9_000e6);
        uint256[] memory p = m3.prices();
        assertApproxEqAbs(p[0], uint256(1e18) / 3, 1);
        assertApproxEqAbs(p[0] + p[1] + p[2], 1e18, 3);
    }

    function test_categorical_buy_movesAndConserves() public {
        FixedProductMarketMaker m3 = _newMarket(3, keccak256("BRA vs ARG result"), 9_000e6);
        uint256 quote = m3.calcBuyAmount(0, 1_000e6);
        uint256 got = _buy(m3, alice, 0, 1_000e6);
        assertEq(got, quote);
        uint256[] memory p = m3.prices();
        assertGt(p[0], uint256(1e18) / 3, "bought outcome's price rises");
        assertLt(p[1], uint256(1e18) / 3, "others fall");
        assertApproxEqAbs(p[0] + p[1] + p[2], 1e18, 3);
    }

    function test_categorical_resolve_redeem() public {
        FixedProductMarketMaker m3 = _newMarket(3, keccak256("ESP vs GER result"), 9_000e6);
        bytes32 cid = m3.conditionId();
        uint256 aWin = _buy(m3, alice, 0, 1_000e6); // alice: home
        _buy(m3, bob, 1, 1_000e6); // bob: draw

        // outcome 1 (draw) wins
        vm.prank(oracle);
        uint256[] memory payouts = new uint256[](3);
        payouts[1] = 1;
        ct.reportPayouts(cid, payouts);

        // bob (draw) redeems 1:1; alice (home) gets nothing
        uint256 drawId = ct.getPositionId(address(usdc), cid, 1);
        uint256 bobDraw = ct.balanceOf(bob, drawId);
        vm.prank(bob);
        uint256 paid = ct.redeemPositions(cid);
        assertEq(paid, bobDraw);

        vm.prank(alice);
        vm.expectRevert(bytes("nothing to redeem"));
        ct.redeemPositions(cid);
        assertGt(aWin, 0);
    }

    function test_categorical_outcomeBounds() public {
        FixedProductMarketMaker m3 = _newMarket(3, keccak256("bounds"), 9_000e6);
        vm.expectRevert(bytes("idx"));
        m3.calcBuyAmount(3, 100e6);
    }

    function test_outcomeCount_limits() public {
        // 1 outcome rejected, 17 rejected, 16 ok
        vm.expectRevert(bytes("outcomes"));
        factory.createMarket(address(usdc), keccak256("one"), 1, "x");
        vm.expectRevert(bytes("outcomes"));
        factory.createMarket(address(usdc), keccak256("seventeen"), 17, "x");
        (address m,) = factory.createMarket(address(usdc), keccak256("sixteen"), 16, "x");
        assertEq(FixedProductMarketMaker(m).outcomeCount(), 16);
    }

    // ------------------------------------------------------------------ access control

    function test_reportPayouts_onlyOracle() public {
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        bytes32 role = ct.ORACLE_ROLE();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, alice, role));
        ct.reportPayouts(conditionId, payouts);
    }

    function test_reportPayouts_appendOnly() public {
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1;
        vm.prank(oracle);
        ct.reportPayouts(conditionId, payouts);
        vm.prank(oracle);
        vm.expectRevert(bytes("not open"));
        ct.reportPayouts(conditionId, payouts);
    }

    function test_reportPayouts_allZeroReverts() public {
        uint256[] memory payouts = new uint256[](2);
        vm.prank(oracle);
        vm.expectRevert(bytes("all zero"));
        ct.reportPayouts(conditionId, payouts);
    }

    function test_addFunding_isPermissionless() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 1_000e6);
        uint256 minted = market.addLiquidity(1_000e6);
        vm.stopPrank();
        assertGt(minted, 0, "any address can provide liquidity");
        assertEq(market.balanceOf(alice), minted, "LP tokens minted to the funder");
    }

    function test_lp_feeSplit_betweenFunders() public {
        // alice becomes a second LP equal to treasury's seed
        vm.startPrank(alice);
        usdc.approve(address(market), LIQ);
        market.addLiquidity(LIQ);
        vm.stopPrank();
        // bob trades, generating a fee shared 50/50
        _buy(market, bob, 0, 1_000e6);
        uint256 fee = 1_000e6 * FEE_BPS / 10_000;
        assertApproxEqAbs(market.feesWithdrawableBy(treasury), fee / 2, 2);
        assertApproxEqAbs(market.feesWithdrawableBy(alice), fee / 2, 2);
    }

    // Reviewer's CRITICAL claim: first/sole LP cannot fully exit after withdrawing fees.
    function test_lp_soleFullExitAfterWithdraw() public {
        _buy(market, alice, 0, 1_000e6); // accrue a fee for the sole LP (treasury)
        market.withdrawFees(treasury);
        uint256 lp = market.balanceOf(treasury);
        market.removeFunding(lp); // claimed to revert with underflow
        assertEq(market.balanceOf(treasury), 0, "sole LP fully exited");
    }

    // Reviewer's CRITICAL claim: two LPs both withdraw then both fully exit -> both revert.
    function test_lp_twoLPsWithdrawThenFullExit() public {
        vm.startPrank(alice);
        usdc.approve(address(market), LIQ);
        market.addLiquidity(LIQ);
        vm.stopPrank();
        _buy(market, bob, 0, 1_000e6);
        market.withdrawFees(treasury);
        vm.prank(alice);
        market.withdrawFees(alice);
        uint256 aliceLp = market.balanceOf(alice);
        market.removeFunding(market.balanceOf(treasury));
        vm.prank(alice);
        market.removeFunding(aliceLp);
        assertEq(market.balanceOf(treasury), 0);
        assertEq(market.balanceOf(alice), 0);
    }

    // Reviewer's CRITICAL claim: LP transfer after both withdraw -> revert in _update.
    function test_lp_transferAfterWithdraw() public {
        vm.startPrank(alice);
        usdc.approve(address(market), LIQ);
        market.addLiquidity(LIQ);
        vm.stopPrank();
        _buy(market, bob, 0, 1_000e6);
        market.withdrawFees(treasury);
        vm.prank(alice);
        market.withdrawFees(alice);
        uint256 aliceBal = market.balanceOf(alice);
        vm.prank(alice);
        market.transfer(bob, aliceBal);
        assertEq(market.balanceOf(alice), 0);
    }

    function test_removeFunding_returnsSharesAndFees() public {
        _buy(market, alice, 0, 1_000e6); // accrue a fee for the sole LP (treasury)
        uint256 lp = market.balanceOf(treasury);
        uint256 usdcBefore = usdc.balanceOf(treasury);
        uint256 yesId = ct.getPositionId(address(usdc), conditionId, 0);
        market.removeFunding(lp / 2);
        assertGt(ct.balanceOf(treasury, yesId), 0, "received pro-rata outcome shares");
        assertGt(usdc.balanceOf(treasury), usdcBefore, "received accrued fees on remove");
        assertEq(market.balanceOf(treasury), lp - lp / 2, "LP burned");
    }

    function test_createMarket_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.createMarket(address(usdc), keccak256("x"), 2, "x");
    }

    function test_duplicateCondition_reverts() public {
        vm.expectRevert(bytes("exists"));
        ct.prepareCondition(address(usdc), QID, 2);
    }

    function test_initialize_isOneShot() public {
        vm.expectRevert(bytes("init"));
        market.initialize(address(ct), address(usdc), conditionId, 2, 100, treasury);
    }

    // ------------------------------------------------------------------ solvency

    function test_solvency_collateralCoversReserves() public {
        _buy(market, alice, 0, 1_500e6);
        _buy(market, bob, 1, 800e6);
        uint256 ctBal = usdc.balanceOf(address(ct));
        uint256[] memory r = market.getReserves();
        uint256 minReserve = r[0] < r[1] ? r[0] : r[1];
        assertGe(ctBal, minReserve, "CT under-collateralized");
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_noFreeMoney(uint256 amount, uint8 outcomeRaw) public {
        uint8 outcome = uint8(bound(outcomeRaw, 0, 1));
        amount = bound(amount, 1e6, 500e6);
        uint256 shares = _buy(market, alice, outcome, amount);
        uint256 neededToRecover = market.calcSellAmount(outcome, amount);
        assertGe(neededToRecover, shares, "round trip cannot be profitable");
    }

    function testFuzz_priceBounds(uint256 amount, uint8 outcomeRaw) public {
        uint8 outcome = uint8(bound(outcomeRaw, 0, 1));
        amount = bound(amount, 1e6, 2_000e6);
        _buy(market, alice, outcome, amount);
        uint256[] memory p = market.prices();
        assertGt(p[0], 0);
        assertGt(p[1], 0);
        assertLt(p[0], 1e18);
        assertLt(p[1], 1e18);
        assertApproxEqAbs(p[0] + p[1], 1e18, 2);
    }

    function testFuzz_categorical_noFreeMoney(uint256 amount, uint8 outcomeRaw) public {
        FixedProductMarketMaker m3 = _newMarket(3, keccak256("fuzz3"), 20_000e6);
        uint8 outcome = uint8(bound(outcomeRaw, 0, 2));
        amount = bound(amount, 1e6, 1_000e6);
        uint256 shares = _buy(m3, alice, outcome, amount);
        uint256 needed = m3.calcSellAmount(outcome, amount);
        assertGe(needed, shares, "categorical round trip not profitable");
    }
}
