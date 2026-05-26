// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanRep} from "../src/FanRep.sol";
import {QuestEngine} from "../src/QuestEngine.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract QuestEngineTest is Test {
    FanRep rep;
    QuestEngine engine;
    ConditionalTokens ct;
    MockUSDC usdc;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    // signer private key for EXTERNAL_PROOF tests
    uint256 signerKey = 0xA11CE;
    address signer;

    bytes32 constant Q_ATTEST = keccak256("watch-match");
    bytes32 constant Q_PRED = keccak256("predict-score");
    bytes32 constant Q_PROOF = keccak256("share-post");

    bytes32 conditionId;

    function setUp() public {
        signer = vm.addr(signerKey);
        rep = new FanRep(admin);
        usdc = new MockUSDC();
        ct = new ConditionalTokens("uri", address(this));
        engine = new QuestEngine(address(rep), address(ct), admin);
        bytes32 role = rep.XP_RECORDER_ROLE();
        vm.prank(admin);
        rep.grantRole(role, address(engine));

        // open a binary condition for PREDICTION tests
        conditionId = ct.prepareCondition(address(usdc), keccak256("match-1"), 2);

        // mint Fan IDs
        vm.prank(alice);
        rep.mint();
        vm.prank(bob);
        rep.mint();
    }

    function _registerAttest(uint64 start, uint64 end) internal {
        bytes32 dim = rep.DIM_ENGAGEMENT_BREADTH();
        vm.prank(admin);
        engine.registerQuest(QuestEngine.QuestType.SELF_ATTEST, Q_ATTEST, start, end, 50, dim, "");
    }

    function _registerPrediction(uint64 start, uint64 end, uint64 reward) internal {
        bytes32 dim = rep.DIM_PREDICTION_ACCURACY();
        bytes memory cfg = abi.encode(conditionId);
        vm.prank(admin);
        engine.registerQuest(QuestEngine.QuestType.PREDICTION, Q_PRED, start, end, reward, dim, cfg);
    }

    function _registerExternal(uint64 start, uint64 end) internal {
        bytes32 dim = rep.DIM_ENGAGEMENT_BREADTH();
        bytes memory cfg = abi.encode(signer);
        vm.prank(admin);
        engine.registerQuest(QuestEngine.QuestType.EXTERNAL_PROOF, Q_PROOF, start, end, 40, dim, cfg);
    }

    // --- registration ---

    function test_registerQuest_storesAndEmits() public {
        bytes32 dimEng = rep.DIM_ENGAGEMENT_BREADTH();
        vm.warp(1000);
        vm.expectEmit(true, false, false, true);
        emit QuestEngine.QuestRegistered(Q_ATTEST, QuestEngine.QuestType.SELF_ATTEST, 1000, 2000, 50, dimEng);
        _registerAttest(1000, 2000);
        (QuestEngine.QuestType t, uint64 s, uint64 e, uint64 xp, bytes32 dim,, bool exists) = engine.getQuest(Q_ATTEST);
        assertEq(uint256(t), uint256(QuestEngine.QuestType.SELF_ATTEST));
        assertEq(s, 1000); assertEq(e, 2000); assertEq(xp, 50);
        assertEq(dim, dimEng);
        assertTrue(exists);
    }

    function test_registerQuest_revertsForNonRegistrar() public {
        vm.prank(alice);
        vm.expectRevert();
        engine.registerQuest(QuestEngine.QuestType.SELF_ATTEST, Q_ATTEST, 1, 2, 1, bytes32(0), "");
    }

    function test_registerQuest_revertsOnDuplicate() public {
        _registerAttest(1000, 2000);
        vm.prank(admin);
        vm.expectRevert(QuestEngine.QuestExists.selector);
        engine.registerQuest(QuestEngine.QuestType.SELF_ATTEST, Q_ATTEST, 1000, 2000, 10, bytes32(0), "");
    }

    function test_registerQuest_revertsOnInvalidWindow() public {
        vm.prank(admin);
        vm.expectRevert(QuestEngine.InvalidWindow.selector);
        engine.registerQuest(QuestEngine.QuestType.SELF_ATTEST, Q_ATTEST, 200, 100, 5, bytes32(0), "");
    }

    function test_registerQuest_revertsOnZeroReward() public {
        vm.prank(admin);
        vm.expectRevert(QuestEngine.ZeroReward.selector);
        engine.registerQuest(QuestEngine.QuestType.SELF_ATTEST, Q_ATTEST, 1, 2, 0, bytes32(0), "");
    }

    // --- self attest ---

    function test_selfAttest_creditsXP() public {
        vm.warp(1000);
        _registerAttest(1000, 2000);
        vm.prank(alice);
        engine.completeSelfAttest(Q_ATTEST);
        (uint64 total,, uint64 engage,) = rep.score(alice);
        assertEq(total, 50);
        assertEq(engage, 50);
        assertTrue(engine.completed(Q_ATTEST, alice));
    }

    function test_selfAttest_emitsCompleted() public {
        vm.warp(1000);
        _registerAttest(1000, 2000);
        vm.expectEmit(true, true, false, true);
        emit QuestEngine.QuestCompleted(Q_ATTEST, alice, 50);
        vm.prank(alice);
        engine.completeSelfAttest(Q_ATTEST);
    }

    function test_selfAttest_revertsTwiceFromSameUser() public {
        vm.warp(1000);
        _registerAttest(1000, 2000);
        vm.prank(alice);
        engine.completeSelfAttest(Q_ATTEST);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.AlreadyCompleted.selector);
        engine.completeSelfAttest(Q_ATTEST);
    }

    function test_selfAttest_revertsBeforeWindow() public {
        vm.warp(500);
        _registerAttest(1000, 2000);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.WindowNotOpen.selector);
        engine.completeSelfAttest(Q_ATTEST);
    }

    function test_selfAttest_revertsAfterWindow() public {
        vm.warp(3000);
        _registerAttest(1000, 2000);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.WindowClosed.selector);
        engine.completeSelfAttest(Q_ATTEST);
    }

    function test_selfAttest_revertsForUnknownQuest() public {
        vm.prank(alice);
        vm.expectRevert(QuestEngine.QuestUnknown.selector);
        engine.completeSelfAttest(keccak256("nope"));
    }

    function test_selfAttest_revertsOnWrongType() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.WrongType.selector);
        engine.completeSelfAttest(Q_PRED);
    }

    function test_selfAttest_revertsIfNoFanId() public {
        address charlie = makeAddr("charlie");
        vm.warp(1000);
        _registerAttest(1000, 2000);
        vm.prank(charlie);
        vm.expectRevert(QuestEngine.NoFanId.selector);
        engine.completeSelfAttest(Q_ATTEST);
    }

    // --- prediction commit ---

    function test_predictionCommit_storesAndEmits() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 commit_ = keccak256(abi.encode(uint8(0), bytes32("salt")));
        vm.expectEmit(true, true, false, true);
        emit QuestEngine.PredictionCommitted(Q_PRED, alice, commit_);
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        assertEq(engine.predictionCommit(Q_PRED, alice), commit_);
    }

    function test_predictionCommit_revertsTwiceFromSameUser() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 commit_ = keccak256(abi.encode(uint8(0), bytes32("salt")));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.AlreadyCommitted.selector);
        engine.commitPrediction(Q_PRED, commit_);
    }

    function test_predictionCommit_revertsAfterEnd() public {
        vm.warp(3000);
        _registerPrediction(1000, 2000, 100);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.WindowClosed.selector);
        engine.commitPrediction(Q_PRED, keccak256(abi.encode(uint8(0), bytes32("salt"))));
    }

    function test_predictionCommit_revertsOnWrongType() public {
        vm.warp(1000);
        _registerAttest(1000, 2000);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.WrongType.selector);
        engine.commitPrediction(Q_ATTEST, keccak256(abi.encode(uint8(0), bytes32("salt"))));
    }

    function test_predictionCommit_revertsForNonFanHolder() public {
        address charlie = makeAddr("charlie");
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        vm.prank(charlie);
        vm.expectRevert(QuestEngine.NoFanId.selector);
        engine.commitPrediction(Q_PRED, keccak256(abi.encode(uint8(0), bytes32("salt"))));
    }

    // --- prediction settle ---

    function test_settlePrediction_winnerGetsFullReward() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = keccak256(abi.encode(uint8(0), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        // resolve as outcome 0 winner
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        engine.settlePrediction(Q_PRED, alice, 0, salt);
        (uint64 total, uint64 pred,,) = rep.score(alice);
        assertEq(pred, 100);
        assertEq(total, 100);
        assertTrue(engine.completed(Q_PRED, alice));
    }

    function test_settlePrediction_loserGetsZero() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = keccak256(abi.encode(uint8(1), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        engine.settlePrediction(Q_PRED, alice, 1, salt);
        (uint64 total, uint64 pred,,) = rep.score(alice);
        assertEq(pred, 0);
        assertEq(total, 0);
        assertTrue(engine.completed(Q_PRED, alice));
    }

    function test_settlePrediction_proRataOnTie() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = keccak256(abi.encode(uint8(0), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 1; // tie
        ct.reportPayouts(conditionId, payouts);
        engine.settlePrediction(Q_PRED, alice, 0, salt);
        (, uint64 pred,,) = rep.score(alice);
        assertEq(pred, 50);
    }

    function test_settlePrediction_revertsIfNotResolved() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = keccak256(abi.encode(uint8(0), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        vm.expectRevert(QuestEngine.ConditionNotResolved.selector);
        engine.settlePrediction(Q_PRED, alice, 0, salt);
    }

    function test_settlePrediction_revertsOnBadReveal() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = keccak256(abi.encode(uint8(0), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        // wrong salt
        vm.expectRevert(QuestEngine.BadReveal.selector);
        engine.settlePrediction(Q_PRED, alice, 0, bytes32(uint256(0xBAD)));
    }

    function test_settlePrediction_revertsTwice() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = keccak256(abi.encode(uint8(0), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        engine.settlePrediction(Q_PRED, alice, 0, salt);
        vm.expectRevert(QuestEngine.AlreadyCompleted.selector);
        engine.settlePrediction(Q_PRED, alice, 0, salt);
    }

    function test_settlePrediction_revertsIfNotCommitted() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        vm.expectRevert(QuestEngine.NotCommitted.selector);
        engine.settlePrediction(Q_PRED, alice, 0, bytes32(0));
    }

    function test_settlePrediction_keeperCanSettleForOthers() public {
        vm.warp(1000);
        _registerPrediction(1000, 2000, 100);
        bytes32 salt = bytes32(uint256(7));
        bytes32 commit_ = keccak256(abi.encode(uint8(0), salt));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, commit_);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        // bob (a keeper / third party) submits the reveal for alice
        vm.prank(bob);
        engine.settlePrediction(Q_PRED, alice, 0, salt);
        (, uint64 pred,,) = rep.score(alice);
        assertEq(pred, 100);
    }

    // --- external proof ---

    function _signExternal(bytes32 questId, address user) internal view returns (bytes memory sig) {
        bytes32 digest = keccak256(abi.encode(address(engine), block.chainid, questId, user));
        bytes32 ethDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethDigest);
        sig = abi.encodePacked(r, s, v);
    }

    function test_externalProof_creditsOnValidSignature() public {
        vm.warp(1000);
        _registerExternal(1000, 2000);
        bytes memory sig = _signExternal(Q_PROOF, alice);
        vm.prank(alice);
        engine.completeExternalProof(Q_PROOF, sig);
        (uint64 total,, uint64 engage,) = rep.score(alice);
        assertEq(engage, 40);
        assertEq(total, 40);
    }

    function test_externalProof_revertsOnBadSignature() public {
        vm.warp(1000);
        _registerExternal(1000, 2000);
        // sign for bob, try to claim as alice
        bytes memory sig = _signExternal(Q_PROOF, bob);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.BadAttestation.selector);
        engine.completeExternalProof(Q_PROOF, sig);
    }

    function test_externalProof_revertsOnSignatureFromWrongSigner() public {
        vm.warp(1000);
        _registerExternal(1000, 2000);
        uint256 wrongKey = 0xBADBADBAD;
        bytes32 digest = keccak256(abi.encode(address(engine), block.chainid, Q_PROOF, alice));
        bytes32 ethDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethDigest);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.BadAttestation.selector);
        engine.completeExternalProof(Q_PROOF, sig);
    }

    function test_externalProof_revertsOnWrongType() public {
        vm.warp(1000);
        _registerAttest(1000, 2000);
        bytes memory sig = _signExternal(Q_ATTEST, alice);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.WrongType.selector);
        engine.completeExternalProof(Q_ATTEST, sig);
    }

    function test_externalProof_revertsTwice() public {
        vm.warp(1000);
        _registerExternal(1000, 2000);
        bytes memory sig = _signExternal(Q_PROOF, alice);
        vm.prank(alice);
        engine.completeExternalProof(Q_PROOF, sig);
        vm.prank(alice);
        vm.expectRevert(QuestEngine.AlreadyCompleted.selector);
        engine.completeExternalProof(Q_PROOF, sig);
    }
}
