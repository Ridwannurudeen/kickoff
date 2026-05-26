// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanRep} from "../src/FanRep.sol";
import {QuestEngine} from "../src/QuestEngine.sol";
import {Trophy} from "../src/Trophy.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract TrophyTest is Test {
    FanRep rep;
    QuestEngine engine;
    Trophy trophy;
    ConditionalTokens ct;
    MockUSDC usdc;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    bytes32 constant Q1 = keccak256("q1");
    bytes32 constant Q2 = keccak256("q2");

    function setUp() public {
        rep = new FanRep(admin);
        usdc = new MockUSDC();
        ct = new ConditionalTokens("uri", address(this));
        engine = new QuestEngine(address(rep), address(ct), admin);
        trophy = new Trophy("ipfs://trophy/{id}", address(rep), address(engine), admin);

        bytes32 recorderRole = rep.XP_RECORDER_ROLE();
        vm.prank(admin);
        rep.grantRole(recorderRole, address(engine));

        vm.prank(alice);
        rep.mint();
        vm.prank(bob);
        rep.mint();
    }

    function _registerAttest(bytes32 qid, uint64 reward) internal {
        bytes32 dim = rep.DIM_ENGAGEMENT_BREADTH();
        vm.prank(admin);
        engine.registerQuest(QuestEngine.QuestType.SELF_ATTEST, qid, 1, type(uint64).max, reward, dim, "");
    }

    function _completeAs(address who, bytes32 qid) internal {
        vm.prank(who);
        engine.completeSelfAttest(qid);
    }

    function _defineTrophy(uint256 id, uint64 reqXP, uint64 windowEnd, bytes32[] memory reqs) internal {
        vm.prank(admin);
        trophy.defineTrophy(id, reqXP, windowEnd, reqs);
    }

    // --- define ---

    function test_defineTrophy_storesAndEmits() public {
        bytes32[] memory reqs = new bytes32[](2);
        reqs[0] = Q1; reqs[1] = Q2;
        vm.expectEmit(true, false, false, true);
        emit Trophy.TrophyDefined(1, 100, 0, reqs);
        _defineTrophy(1, 100, 0, reqs);
        (uint64 reqXP, uint64 windowEnd, bytes32[] memory got, bool exists) = trophy.getRule(1);
        assertEq(reqXP, 100);
        assertEq(windowEnd, 0);
        assertEq(got.length, 2);
        assertEq(got[0], Q1); assertEq(got[1], Q2);
        assertTrue(exists);
    }

    function test_defineTrophy_revertsOnDuplicate() public {
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(1, 0, 0, reqs);
        vm.prank(admin);
        vm.expectRevert(Trophy.TrophyExists.selector);
        trophy.defineTrophy(1, 0, 0, reqs);
    }

    function test_defineTrophy_revertsForNonRegistrar() public {
        bytes32[] memory reqs = new bytes32[](0);
        vm.prank(alice);
        vm.expectRevert();
        trophy.defineTrophy(1, 0, 0, reqs);
    }

    // --- claim ---

    function test_claim_mintsERC1155() public {
        _registerAttest(Q1, 100);
        _completeAs(alice, Q1);
        bytes32[] memory reqs = new bytes32[](1);
        reqs[0] = Q1;
        _defineTrophy(7, 100, 0, reqs);
        vm.expectEmit(true, true, false, true);
        emit Trophy.TrophyClaimed(7, alice);
        vm.prank(alice);
        trophy.claim(7);
        assertEq(trophy.balanceOf(alice, 7), 1);
        assertTrue(trophy.claimed(7, alice));
    }

    function test_claim_revertsOnUnknownTrophy() public {
        vm.prank(alice);
        vm.expectRevert(Trophy.TrophyUnknown.selector);
        trophy.claim(99);
    }

    function test_claim_revertsOnInsufficientXP() public {
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(1, 50, 0, reqs);
        vm.prank(alice);
        vm.expectRevert(Trophy.InsufficientXP.selector);
        trophy.claim(1);
    }

    function test_claim_revertsOnMissingQuest() public {
        _registerAttest(Q1, 100);
        _completeAs(alice, Q1);
        bytes32[] memory reqs = new bytes32[](2);
        reqs[0] = Q1; reqs[1] = Q2;
        _defineTrophy(1, 0, 0, reqs);
        vm.prank(alice);
        vm.expectRevert(Trophy.QuestMissing.selector);
        trophy.claim(1);
    }

    function test_claim_revertsAfterWindowExpired() public {
        _registerAttest(Q1, 100);
        _completeAs(alice, Q1);
        bytes32[] memory reqs = new bytes32[](1);
        reqs[0] = Q1;
        _defineTrophy(1, 0, uint64(block.timestamp + 100), reqs);
        vm.warp(block.timestamp + 1000);
        vm.prank(alice);
        vm.expectRevert(Trophy.WindowExpired.selector);
        trophy.claim(1);
    }

    function test_claim_worksWithinWindow() public {
        _registerAttest(Q1, 100);
        _completeAs(alice, Q1);
        bytes32[] memory reqs = new bytes32[](1);
        reqs[0] = Q1;
        _defineTrophy(1, 0, uint64(block.timestamp + 1000), reqs);
        vm.prank(alice);
        trophy.claim(1);
        assertEq(trophy.balanceOf(alice, 1), 1);
    }

    function test_claim_revertsTwice() public {
        _registerAttest(Q1, 100);
        _completeAs(alice, Q1);
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(1, 0, 0, reqs);
        vm.prank(alice);
        trophy.claim(1);
        vm.prank(alice);
        vm.expectRevert(Trophy.AlreadyClaimed.selector);
        trophy.claim(1);
    }

    function test_claim_revertsIfNoFanId() public {
        address charlie = makeAddr("charlie");
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(1, 0, 0, reqs);
        vm.prank(charlie);
        vm.expectRevert(Trophy.NoFanId.selector);
        trophy.claim(1);
    }

    function test_claim_zeroRequirementsPassesForFanHolder() public {
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(2, 0, 0, reqs);
        vm.prank(alice);
        trophy.claim(2);
        assertEq(trophy.balanceOf(alice, 2), 1);
    }

    function test_claim_xpFromMultipleQuestsAggregates() public {
        _registerAttest(Q1, 60);
        _registerAttest(Q2, 50);
        _completeAs(alice, Q1);
        _completeAs(alice, Q2);
        bytes32[] memory reqs = new bytes32[](2);
        reqs[0] = Q1; reqs[1] = Q2;
        _defineTrophy(3, 100, 0, reqs);
        vm.prank(alice);
        trophy.claim(3);
        assertEq(trophy.balanceOf(alice, 3), 1);
    }

    // --- operator mint ---

    function test_operatorMint_skipsXPGate() public {
        bytes32[] memory reqs = new bytes32[](1);
        reqs[0] = Q1;
        _defineTrophy(5, 9999, 0, reqs);
        // alice has neither XP nor the quest completion, but operator mints
        vm.prank(admin);
        trophy.operatorMint(5, alice);
        assertEq(trophy.balanceOf(alice, 5), 1);
        assertTrue(trophy.claimed(5, alice));
    }

    function test_operatorMint_revertsForNonRegistrar() public {
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(6, 0, 0, reqs);
        vm.prank(alice);
        vm.expectRevert();
        trophy.operatorMint(6, bob);
    }

    function test_operatorMint_revertsOnUnknownTrophy() public {
        vm.prank(admin);
        vm.expectRevert(Trophy.TrophyUnknown.selector);
        trophy.operatorMint(404, alice);
    }

    function test_operatorMint_revertsOnDoubleMint() public {
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(8, 0, 0, reqs);
        vm.startPrank(admin);
        trophy.operatorMint(8, alice);
        vm.expectRevert(Trophy.AlreadyClaimed.selector);
        trophy.operatorMint(8, alice);
        vm.stopPrank();
    }

    function test_operatorMint_doesNotPreventDifferentRecipient() public {
        bytes32[] memory reqs = new bytes32[](0);
        _defineTrophy(9, 0, 0, reqs);
        vm.startPrank(admin);
        trophy.operatorMint(9, alice);
        trophy.operatorMint(9, bob);
        vm.stopPrank();
        assertEq(trophy.balanceOf(alice, 9), 1);
        assertEq(trophy.balanceOf(bob, 9), 1);
    }

    // --- views / interface ---

    function test_supportsInterface_accessControlAndERC1155() public view {
        // ERC1155
        assertTrue(trophy.supportsInterface(0xd9b67a26));
        // AccessControl
        assertTrue(trophy.supportsInterface(0x7965db0b));
    }

    function test_getRule_unknownReturnsEmpty() public view {
        (uint64 reqXP, uint64 windowEnd, bytes32[] memory reqs, bool exists) = trophy.getRule(404);
        assertEq(reqXP, 0);
        assertEq(windowEnd, 0);
        assertEq(reqs.length, 0);
        assertFalse(exists);
    }
}
