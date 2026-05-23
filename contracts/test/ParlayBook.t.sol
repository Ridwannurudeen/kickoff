// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {FixedProductMarketMaker} from "../src/FixedProductMarketMaker.sol";
import {MarketMakerFactory} from "../src/MarketMakerFactory.sol";
import {ParlayBook} from "../src/ParlayBook.sol";

contract ParlayBookTest is Test {
    MockUSDC usdc;
    ConditionalTokens ct;
    FixedProductMarketMaker impl;
    MarketMakerFactory factory;
    ParlayBook book;
    address alice = makeAddr("alice");

    function setUp() public {
        usdc = new MockUSDC();
        ct = new ConditionalTokens("uri", address(this)); // this = admin + ORACLE_ROLE
        impl = new FixedProductMarketMaker();
        factory = new MarketMakerFactory(address(ct), address(impl), 200, address(this));
        book = new ParlayBook(address(usdc), address(ct), address(factory), 5000, 0, address(this)); // 50% cap, no liq floor
        usdc.mint(address(this), 1_000e6);
        usdc.approve(address(book), 1_000e6);
        book.depositHouse(1_000e6);
        usdc.mint(alice, 1_000e6);
    }

    function _mkt(bytes32 qid) internal returns (FixedProductMarketMaker m, bytes32 cid) {
        (address a, bytes32 c) = factory.createMarket(address(usdc), qid, 2, "m");
        m = FixedProductMarketMaker(a);
        cid = c;
        usdc.mint(address(this), 5_000e6);
        usdc.approve(a, 5_000e6);
        m.addLiquidity(5_000e6); // opens 50/50 -> 2x odds per leg
    }

    function _resolve(bytes32 cid, uint256 winIdx) internal {
        uint256[] memory p = new uint256[](2);
        p[winIdx] = 1;
        ct.reportPayouts(cid, p);
    }

    function _twoLegs() internal returns (address[] memory mk, uint8[] memory oc, bytes32 c1, bytes32 c2) {
        (FixedProductMarketMaker m1, bytes32 a1) = _mkt(keccak256(abi.encode(block.timestamp, "1")));
        (FixedProductMarketMaker m2, bytes32 a2) = _mkt(keccak256(abi.encode(block.timestamp, "2")));
        mk = new address[](2);
        mk[0] = address(m1);
        mk[1] = address(m2);
        oc = new uint8[](2);
        oc[0] = 0;
        oc[1] = 0;
        c1 = a1;
        c2 = a2;
    }

    function _place(address[] memory mk, uint8[] memory oc, uint256 stake) internal returns (uint256 id) {
        vm.startPrank(alice);
        usdc.approve(address(book), stake);
        id = book.placeParlay(mk, oc, stake);
        vm.stopPrank();
    }

    function test_parlay_winPays4x() public {
        (address[] memory mk, uint8[] memory oc, bytes32 c1, bytes32 c2) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        (,, uint256 payout,,,) = book.getParlay(id);
        assertEq(payout, 400e6, "two 2x legs = 4x");
        _resolve(c1, 0);
        _resolve(c2, 0);
        uint256 before = usdc.balanceOf(alice);
        book.settleParlay(id);
        assertEq(usdc.balanceOf(alice), before + payout, "winner paid full odds");
    }

    function test_parlay_loseHouseKeeps() public {
        (address[] memory mk, uint8[] memory oc, bytes32 c1, bytes32 c2) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        _resolve(c1, 0);
        _resolve(c2, 1); // chose 0, but 1 won -> parlay lost
        uint256 before = usdc.balanceOf(alice);
        book.settleParlay(id);
        assertEq(usdc.balanceOf(alice), before, "loser paid nothing");
        assertEq(book.lockedExposure(), 0, "exposure released");
    }

    function test_parlay_allVoidRefunds() public {
        (address[] memory mk, uint8[] memory oc, bytes32 c1, bytes32 c2) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        ct.voidCondition(c1);
        ct.voidCondition(c2);
        uint256 before = usdc.balanceOf(alice);
        book.settleParlay(id);
        assertEq(usdc.balanceOf(alice), before + 100e6, "all-void refunds stake");
    }

    function test_parlay_partialVoid_paysSurviving() public {
        (address[] memory mk, uint8[] memory oc, bytes32 c1, bytes32 c2) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        _resolve(c1, 0); // surviving leg won (2x)
        ct.voidCondition(c2); // voided leg drops out
        uint256 before = usdc.balanceOf(alice);
        book.settleParlay(id);
        assertEq(usdc.balanceOf(alice), before + 200e6, "void drops out; surviving 2x leg pays");
    }

    function test_parlay_partialVoid_lostLegHouseKeeps() public {
        (address[] memory mk, uint8[] memory oc, bytes32 c1, bytes32 c2) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        _resolve(c1, 1); // surviving leg LOST (chose 0, 1 won)
        ct.voidCondition(c2);
        uint256 before = usdc.balanceOf(alice);
        book.settleParlay(id);
        assertEq(usdc.balanceOf(alice), before, "a void cannot rescue a lost leg");
    }

    function test_parlay_fakeMarketRejected() public {
        (address[] memory mk, uint8[] memory oc,,) = _twoLegs();
        mk[0] = address(0xBEEF); // not factory-deployed
        vm.startPrank(alice);
        usdc.approve(address(book), 100e6);
        vm.expectRevert(bytes("unknown market"));
        book.placeParlay(mk, oc, 100e6);
        vm.stopPrank();
    }

    function test_parlay_staleCancelRefunds() public {
        (address[] memory mk, uint8[] memory oc,,) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        vm.warp(block.timestamp + 31 days);
        uint256 before = usdc.balanceOf(alice);
        book.cancelStaleParlay(id);
        assertEq(usdc.balanceOf(alice), before + 100e6, "stale parlay refunds stake");
        assertEq(book.lockedExposure(), 0, "exposure released");
    }

    function test_parlay_exposureCapReverts() public {
        (address[] memory mk, uint8[] memory oc,,) = _twoLegs();
        // cap = 50% of 1000 free = 500; stake 200 -> payout 800 > 500
        vm.startPrank(alice);
        usdc.approve(address(book), 200e6);
        vm.expectRevert(bytes("exceeds house cap"));
        book.placeParlay(mk, oc, 200e6);
        vm.stopPrank();
    }

    function test_parlay_unresolvedReverts() public {
        (address[] memory mk, uint8[] memory oc, bytes32 c1,) = _twoLegs();
        uint256 id = _place(mk, oc, 100e6);
        _resolve(c1, 0); // only one leg resolved
        vm.expectRevert(bytes("leg unresolved"));
        book.settleParlay(id);
    }

    function test_parlay_minLegsReverts() public {
        (FixedProductMarketMaker m1,) = _mkt(keccak256("solo"));
        address[] memory mk = new address[](1);
        mk[0] = address(m1);
        uint8[] memory oc = new uint8[](1);
        oc[0] = 0;
        vm.startPrank(alice);
        usdc.approve(address(book), 100e6);
        vm.expectRevert(bytes("legs"));
        book.placeParlay(mk, oc, 100e6);
        vm.stopPrank();
    }

    function test_parlay_duplicateConditionReverts() public {
        // two legs on the SAME market/condition would inflate odds without risk -> must revert
        (FixedProductMarketMaker m1,) = _mkt(keccak256("dup"));
        address[] memory mk = new address[](2);
        mk[0] = address(m1);
        mk[1] = address(m1);
        uint8[] memory oc = new uint8[](2);
        oc[0] = 0;
        oc[1] = 0;
        vm.startPrank(alice);
        usdc.approve(address(book), 100e6);
        vm.expectRevert(bytes("duplicate condition"));
        book.placeParlay(mk, oc, 100e6);
        vm.stopPrank();
    }

    function test_withdrawHouse_respectsLockedExposure() public {
        (address[] memory mk, uint8[] memory oc,,) = _twoLegs();
        _place(mk, oc, 100e6); // locks 400; balance 1100 -> free 700
        assertEq(book.freeLiquidity(), 700e6);
        vm.expectRevert(bytes("exceeds free"));
        book.withdrawHouse(800e6);
        book.withdrawHouse(700e6);
        assertEq(book.freeLiquidity(), 0);
    }
}
