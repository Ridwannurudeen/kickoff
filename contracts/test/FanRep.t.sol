// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, stdError} from "forge-std/Test.sol";
import {FanRep} from "../src/FanRep.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract FanRepTest is Test {
    FanRep rep;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address recorder = makeAddr("recorder");

    function setUp() public {
        rep = new FanRep(admin);
        bytes32 role = rep.XP_RECORDER_ROLE();
        vm.prank(admin);
        rep.grantRole(role, recorder);
    }

    // --- mint ---

    function test_mint_assignsUniqueTokenId() public {
        vm.prank(alice);
        uint256 idA = rep.mint();
        vm.prank(bob);
        uint256 idB = rep.mint();
        assertEq(idA, 1);
        assertEq(idB, 2);
        assertEq(rep.ownerOf(idA), alice);
        assertEq(rep.ownerOf(idB), bob);
    }

    function test_mint_revertsOnSecondMintBySameWallet() public {
        vm.prank(alice);
        rep.mint();
        vm.prank(alice);
        vm.expectRevert(FanRep.AlreadyMinted.selector);
        rep.mint();
    }

    function test_mint_recordsMintedAt() public {
        vm.warp(1_000_000);
        vm.prank(alice);
        rep.mint();
        assertEq(rep.mintedAt(alice), 1_000_000);
    }

    function test_hasFanId_reflectsMintState() public {
        assertFalse(rep.hasFanId(alice));
        vm.prank(alice);
        rep.mint();
        assertTrue(rep.hasFanId(alice));
    }

    // --- soulbound ---

    function test_transfer_revertsAsSoulbound() public {
        vm.prank(alice);
        uint256 id = rep.mint();
        vm.prank(alice);
        vm.expectRevert(FanRep.Soulbound.selector);
        rep.transferFrom(alice, bob, id);
    }

    function test_safeTransfer_revertsAsSoulbound() public {
        vm.prank(alice);
        uint256 id = rep.mint();
        vm.prank(alice);
        vm.expectRevert(FanRep.Soulbound.selector);
        rep.safeTransferFrom(alice, bob, id);
    }

    function test_approveThenTransfer_revertsAsSoulbound() public {
        vm.prank(alice);
        uint256 id = rep.mint();
        vm.prank(alice);
        rep.approve(bob, id);
        vm.prank(bob);
        vm.expectRevert(FanRep.Soulbound.selector);
        rep.transferFrom(alice, bob, id);
    }

    // --- favorite teams ---

    function test_setFavoriteTeams_storesAndEmits() public {
        vm.prank(alice);
        rep.mint();
        uint16[] memory teams = new uint16[](3);
        teams[0] = 1; teams[1] = 22; teams[2] = 365;
        vm.expectEmit(true, false, false, true);
        emit FanRep.FavoriteTeamsSet(alice, teams);
        vm.prank(alice);
        rep.setFavoriteTeams(teams);
        uint16[] memory got = rep.favoriteTeamsOf(alice);
        assertEq(got.length, 3);
        assertEq(got[0], 1); assertEq(got[1], 22); assertEq(got[2], 365);
    }

    function test_setFavoriteTeams_revertsIfNotMinted() public {
        uint16[] memory teams = new uint16[](1);
        teams[0] = 1;
        vm.prank(alice);
        vm.expectRevert(FanRep.NotMinted.selector);
        rep.setFavoriteTeams(teams);
    }

    function test_setFavoriteTeams_overwritesPriorList() public {
        vm.prank(alice);
        rep.mint();
        uint16[] memory t1 = new uint16[](2);
        t1[0] = 1; t1[1] = 2;
        vm.prank(alice);
        rep.setFavoriteTeams(t1);
        uint16[] memory t2 = new uint16[](1);
        t2[0] = 9;
        vm.prank(alice);
        rep.setFavoriteTeams(t2);
        assertEq(rep.favoriteTeamsOf(alice).length, 1);
        assertEq(rep.favoriteTeamsOf(alice)[0], 9);
    }

    // --- XP recording ---

    function test_recordXP_creditsDimensionAndTotal() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        vm.prank(alice);
        rep.mint();
        vm.prank(recorder);
        rep.recordXP(alice, dimPred, 100);
        (uint64 total, uint64 pred,,) = rep.score(alice);
        assertEq(total, 100);
        assertEq(pred, 100);
    }

    function test_recordXP_appendOnly_sumsAcrossCalls() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        bytes32 dimEng = rep.DIM_ENGAGEMENT_BREADTH();
        vm.prank(alice);
        rep.mint();
        vm.startPrank(recorder);
        rep.recordXP(alice, dimPred, 30);
        rep.recordXP(alice, dimPred, 40);
        rep.recordXP(alice, dimEng, 25);
        vm.stopPrank();
        (uint64 total, uint64 pred, uint64 engage,) = rep.score(alice);
        assertEq(pred, 70);
        assertEq(engage, 25);
        assertEq(total, 95);
    }

    function test_recordXP_revertsForNonRecorder() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        vm.prank(alice);
        rep.mint();
        vm.prank(alice);
        vm.expectRevert();
        rep.recordXP(alice, dimPred, 1);
    }

    function test_recordXP_revertsForUnmintedUser() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        vm.prank(recorder);
        vm.expectRevert(FanRep.NotMinted.selector);
        rep.recordXP(alice, dimPred, 1);
    }

    function test_recordXP_revertsOnUnknownDimension() public {
        vm.prank(alice);
        rep.mint();
        vm.prank(recorder);
        vm.expectRevert(FanRep.DimensionUnknown.selector);
        rep.recordXP(alice, keccak256("NONEXISTENT"), 1);
    }

    function test_recordXP_revertsOnZeroAmount() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        vm.prank(alice);
        rep.mint();
        vm.prank(recorder);
        vm.expectRevert(FanRep.ZeroAmount.selector);
        rep.recordXP(alice, dimPred, 0);
    }

    function test_recordXP_overflowReverts() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        vm.prank(alice);
        rep.mint();
        vm.startPrank(recorder);
        rep.recordXP(alice, dimPred, type(uint64).max);
        // 0.8.x checked arithmetic panics before the explicit XPOverflow guard fires
        vm.expectRevert(stdError.arithmeticError);
        rep.recordXP(alice, dimPred, 1);
        vm.stopPrank();
    }

    function test_recordXP_totalOverflowAcrossDimsReverts() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        bytes32 dimEng = rep.DIM_ENGAGEMENT_BREADTH();
        vm.prank(alice);
        rep.mint();
        vm.startPrank(recorder);
        rep.recordXP(alice, dimPred, type(uint64).max - 5);
        // total is now max-5; engagement adds 10 which overflows the grand total (arithmetic panic)
        vm.expectRevert(stdError.arithmeticError);
        rep.recordXP(alice, dimEng, 10);
        vm.stopPrank();
    }

    // --- dimensions ---

    function test_registerDimension_addsAndEmits() public {
        bytes32 dim = keccak256("CUSTOM");
        assertFalse(rep.dimensionRegistered(dim));
        vm.expectEmit(true, false, false, false);
        emit FanRep.DimensionRegistered(dim);
        vm.prank(admin);
        rep.registerDimension(dim);
        assertTrue(rep.dimensionRegistered(dim));
    }

    function test_registerDimension_revertsForNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        rep.registerDimension(keccak256("X"));
    }

    function test_registerDimension_revertsOnDuplicate() public {
        bytes32 dimPred = rep.DIM_PREDICTION_ACCURACY();
        vm.prank(admin);
        vm.expectRevert(FanRep.DimensionAlreadyRegistered.selector);
        rep.registerDimension(dimPred);
    }

    function test_registerDimension_revertsOnZero() public {
        vm.prank(admin);
        vm.expectRevert(FanRep.DimensionUnknown.selector);
        rep.registerDimension(bytes32(0));
    }

    // --- score / views ---

    function test_score_longevityDaysGrowsWithTime() public {
        vm.warp(1_000_000);
        vm.prank(alice);
        rep.mint();
        vm.warp(1_000_000 + 10 days + 5 hours);
        (,,, uint64 lon) = rep.score(alice);
        assertEq(lon, 10);
    }

    function test_score_zeroForUnminted() public view {
        (uint64 total, uint64 pred, uint64 engage, uint64 lon) = rep.score(alice);
        assertEq(total, 0);
        assertEq(pred, 0);
        assertEq(engage, 0);
        assertEq(lon, 0);
    }

    function test_xpOf_returnsPerDimension() public {
        bytes32 dimLeague = rep.DIM_AGENT_LEAGUE();
        vm.prank(alice);
        rep.mint();
        vm.prank(recorder);
        rep.recordXP(alice, dimLeague, 77);
        assertEq(rep.xpOf(alice, dimLeague), 77);
        assertEq(rep.xpOf(alice, rep.DIM_PREDICTION_ACCURACY()), 0);
    }

    function test_fanIdOf_returnsCorrectId() public {
        vm.prank(alice);
        uint256 id = rep.mint();
        assertEq(rep.fanIdOf(alice), id);
        assertEq(rep.fanIdOf(bob), 0);
    }

    function test_supportsInterface_accessControlAndERC721() public view {
        // ERC721 interface id
        assertTrue(rep.supportsInterface(0x80ac58cd));
        // AccessControl interface id
        assertTrue(rep.supportsInterface(0x7965db0b));
    }

    function test_seededDimensions_areAllRegistered() public view {
        assertTrue(rep.dimensionRegistered(rep.DIM_PREDICTION_ACCURACY()));
        assertTrue(rep.dimensionRegistered(rep.DIM_ENGAGEMENT_BREADTH()));
        assertTrue(rep.dimensionRegistered(rep.DIM_LONGEVITY()));
        assertTrue(rep.dimensionRegistered(rep.DIM_AGENT_LEAGUE()));
        assertTrue(rep.dimensionRegistered(rep.DIM_DONOR()));
    }
}
