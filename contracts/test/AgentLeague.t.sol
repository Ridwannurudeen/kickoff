// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";
import {FanRep} from "../src/FanRep.sol";
import {QuestEngine} from "../src/QuestEngine.sol";
import {Trophy} from "../src/Trophy.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentLeague} from "../src/AgentLeague.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

/// @dev Receiver that toggles between "accept ERC-1155" and "revert in onERC1155Received".
///      Used to verify `closeSeason` survives a grief winner-owner and that the deferred mint
///      can be pull-claimed later once the receiver is flipped to accept.
contract ToggleReceiver is IERC1155Receiver {
    bool public reject = true;

    function setReject(bool v) external { reject = v; }

    function register(AgentRegistry reg, bytes32 agentId, address wallet) external {
        reg.registerAgent(agentId, wallet, 0, "hint-malicious");
    }

    function enter(AgentLeague league, bytes32 agentId) external {
        league.enterAgent(agentId);
    }

    function commit(AgentLeague league, bytes32 agentId, bytes32 questId, bytes32 c) external {
        league.submitPrediction(agentId, questId, c);
    }

    function claim(AgentLeague league, uint64 seasonId) external {
        league.claimAiChampionTrophy(seasonId);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        view
        returns (bytes4)
    {
        require(!reject, "rejected");
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        view
        returns (bytes4)
    {
        require(!reject, "rejected");
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}

contract AgentLeagueTest is Test {
    FanRep rep;
    QuestEngine engine;
    Trophy trophy;
    AgentRegistry reg;
    AgentLeague league;
    ConditionalTokens ct;
    MockUSDC usdc;

    address admin = makeAddr("admin");
    address ownerA = makeAddr("ownerA");
    address ownerB = makeAddr("ownerB");
    address ownerC = makeAddr("ownerC");
    address agentWalletA = makeAddr("agentWalletA");
    address agentWalletB = makeAddr("agentWalletB");
    address agentWalletC = makeAddr("agentWalletC");

    bytes32 constant AGENT_A = keccak256("agentA");
    bytes32 constant AGENT_B = keccak256("agentB");
    bytes32 constant AGENT_C = keccak256("agentC");

    bytes32 constant Q_PRED = keccak256("league-quest-1");
    bytes32 constant Q_PRED2 = keccak256("league-quest-2");
    uint256 constant AI_CHAMP_TROPHY = 42;

    bytes32 conditionId;
    bytes32 conditionId2;

    function setUp() public {
        rep = new FanRep(admin);
        usdc = new MockUSDC();
        ct = new ConditionalTokens("uri", address(this));
        engine = new QuestEngine(address(rep), address(ct), admin);
        trophy = new Trophy("ipfs://t/{id}", address(rep), address(engine), admin);
        reg = new AgentRegistry();
        league = new AgentLeague(address(reg), address(engine), address(ct), address(trophy), AI_CHAMP_TROPHY, admin);

        bytes32 recorderRole = rep.XP_RECORDER_ROLE();
        bytes32 trophyRegRole = trophy.TROPHY_REGISTRAR_ROLE();
        vm.startPrank(admin);
        rep.grantRole(recorderRole, address(engine));
        trophy.grantRole(trophyRegRole, address(league));
        // pre-define the AI Champion trophy so operatorMint can succeed
        bytes32[] memory noReqs = new bytes32[](0);
        trophy.defineTrophy(AI_CHAMP_TROPHY, 0, 0, noReqs);
        vm.stopPrank();

        // register 3 agents
        vm.prank(ownerA); reg.registerAgent(AGENT_A, agentWalletA, 0, "hintA");
        vm.prank(ownerB); reg.registerAgent(AGENT_B, agentWalletB, 0, "hintB");
        vm.prank(ownerC); reg.registerAgent(AGENT_C, agentWalletC, 0, "hintC");

        // prepare two binary conditions for prediction quests
        conditionId = ct.prepareCondition(address(usdc), keccak256("match-1"), 2);
        conditionId2 = ct.prepareCondition(address(usdc), keccak256("match-2"), 2);
    }

    function _registerPredQuest(bytes32 qid, bytes32 cid, uint64 start, uint64 end, uint64 reward) internal {
        bytes32 dim = rep.DIM_PREDICTION_ACCURACY();
        bytes memory cfg = abi.encode(cid);
        vm.prank(admin);
        engine.registerQuest(QuestEngine.QuestType.PREDICTION, qid, start, end, reward, dim, cfg);
    }

    function _openSeason(uint64 start, uint64 end) internal returns (uint64 sid) {
        vm.prank(admin);
        sid = league.openSeason(start, end);
    }

    function _commit(uint8 slot, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encode(slot, salt));
    }

    // --- season lifecycle ---

    function test_openSeason_assignsSequentialIds() public {
        uint64 s1 = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        assertEq(s1, 1);
        vm.warp(block.timestamp + 2000);
        // need to close first
        league.closeSeason(s1);
        uint64 s2 = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        assertEq(s2, 2);
    }

    function test_openSeason_setsActiveSeason() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        assertEq(league.activeSeasonId(), 1);
    }

    function test_openSeason_revertsForNonAdmin() public {
        vm.prank(ownerA);
        vm.expectRevert();
        league.openSeason(uint64(block.timestamp), uint64(block.timestamp + 1));
    }

    function test_openSeason_revertsIfAlreadyOpen() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(admin);
        vm.expectRevert(AgentLeague.SeasonOpenAlready.selector);
        league.openSeason(uint64(block.timestamp), uint64(block.timestamp + 1));
    }

    function test_openSeason_revertsOnInvalidWindow() public {
        vm.prank(admin);
        vm.expectRevert(AgentLeague.InvalidWindow.selector);
        league.openSeason(uint64(block.timestamp + 100), uint64(block.timestamp + 50));
    }

    function test_openSeason_emits() public {
        uint64 start = uint64(block.timestamp);
        uint64 end = uint64(block.timestamp + 1000);
        vm.expectEmit(true, false, false, true);
        emit AgentLeague.SeasonOpened(1, start, end);
        vm.prank(admin);
        league.openSeason(start, end);
    }

    // --- enter agent ---

    function test_enterAgent_addsToList() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(ownerA);
        league.enterAgent(AGENT_A);
        (bool entered, uint64 score, uint64 idx) = league.getEntry(1, AGENT_A);
        assertTrue(entered);
        assertEq(score, 0);
        assertEq(idx, 1);
        bytes32[] memory list = league.enteredAgents(1);
        assertEq(list.length, 1);
        assertEq(list[0], AGENT_A);
    }

    function test_enterAgent_revertsForNonOwner() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(ownerB);
        vm.expectRevert(AgentLeague.NotAgentOwner.selector);
        league.enterAgent(AGENT_A);
    }

    function test_enterAgent_revertsForUnknownAgent() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.AgentUnknown.selector);
        league.enterAgent(keccak256("nope"));
    }

    function test_enterAgent_revertsIfNoActiveSeason() public {
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.SeasonNotOpen.selector);
        league.enterAgent(AGENT_A);
    }

    function test_enterAgent_revertsOnDoubleEntry() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.startPrank(ownerA);
        league.enterAgent(AGENT_A);
        vm.expectRevert(AgentLeague.AlreadyEntered.selector);
        league.enterAgent(AGENT_A);
        vm.stopPrank();
    }

    function test_enterAgent_emits() public {
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.expectEmit(true, true, true, false);
        emit AgentLeague.AgentEntered(1, AGENT_A, ownerA);
        vm.prank(ownerA);
        league.enterAgent(AGENT_A);
    }

    // --- submit prediction ---

    function test_submitPrediction_storesCommit() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 500), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        bytes32 commit_ = _commit(0, bytes32(uint256(1)));
        vm.expectEmit(true, true, true, true);
        emit AgentLeague.PredictionCommitted(1, AGENT_A, Q_PRED, commit_);
        vm.prank(ownerA);
        league.submitPrediction(AGENT_A, Q_PRED, commit_);
        assertEq(league.predictionCommit(1, AGENT_A, Q_PRED), commit_);
    }

    function test_submitPrediction_revertsForNonOwner() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 500), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerB);
        vm.expectRevert(AgentLeague.NotAgentOwner.selector);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(1))));
    }

    function test_submitPrediction_revertsIfNotEntered() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 500), 100);
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.NotEntered.selector);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(1))));
    }

    function test_submitPrediction_revertsOnUnknownQuest() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.QuestUnknown.selector);
        league.submitPrediction(AGENT_A, keccak256("ghost"), _commit(0, bytes32(uint256(1))));
    }

    function test_submitPrediction_revertsOnWrongQuestType() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        bytes32 dim = rep.DIM_ENGAGEMENT_BREADTH();
        vm.prank(admin);
        engine.registerQuest(
            QuestEngine.QuestType.SELF_ATTEST,
            Q_PRED,
            uint64(block.timestamp),
            uint64(block.timestamp + 500),
            10,
            dim,
            ""
        );
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.WrongQuestType.selector);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(1))));
    }

    function test_submitPrediction_revertsAfterQuestEnd() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.warp(block.timestamp + 500);
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.WindowClosed.selector);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(1))));
    }

    function test_submitPrediction_revertsBeforeQuestStart() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp + 1000), uint64(block.timestamp + 2000), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.WindowNotOpen.selector);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(1))));
    }

    function test_submitPrediction_revertsOnDoubleCommit() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 2000), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.startPrank(ownerA);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(1))));
        vm.expectRevert(AgentLeague.AlreadyCommitted.selector);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, bytes32(uint256(2))));
        vm.stopPrank();
    }

    // --- score prediction ---

    function _setupForScore(uint8 winningSlot) internal {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        bytes32 commit_ = _commit(winningSlot, salt);
        vm.prank(ownerA);
        league.submitPrediction(AGENT_A, Q_PRED, commit_);
        // resolve outcome 0 winner
        vm.warp(block.timestamp + 200);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
    }

    function test_scorePrediction_winnerGetsFullReward() public {
        _setupForScore(0);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        (, uint64 score,) = league.getEntry(1, AGENT_A);
        assertEq(score, 100);
        assertTrue(league.scored(1, AGENT_A, Q_PRED));
    }

    function test_scorePrediction_loserGetsZero() public {
        _setupForScore(1);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        league.scorePrediction(AGENT_A, Q_PRED, 1, salt);
        (, uint64 score,) = league.getEntry(1, AGENT_A);
        assertEq(score, 0);
        assertTrue(league.scored(1, AGENT_A, Q_PRED));
    }

    function test_scorePrediction_anyoneCanScore() public {
        _setupForScore(0);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        // a random third party (the test contract itself) calls
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        (, uint64 score,) = league.getEntry(1, AGENT_A);
        assertEq(score, 100);
    }

    function test_scorePrediction_proRataOnTie() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        vm.prank(ownerA);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, salt));
        vm.warp(block.timestamp + 200);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 1;
        ct.reportPayouts(conditionId, payouts);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        (, uint64 score,) = league.getEntry(1, AGENT_A);
        assertEq(score, 50);
    }

    function test_scorePrediction_revertsOnBadReveal() public {
        _setupForScore(0);
        vm.expectRevert(AgentLeague.BadReveal.selector);
        league.scorePrediction(AGENT_A, Q_PRED, 0, bytes32(uint256(0xBAD)));
    }

    function test_scorePrediction_revertsIfNotCommitted() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        vm.expectRevert(AgentLeague.NotCommitted.selector);
        league.scorePrediction(AGENT_A, Q_PRED, 0, bytes32(uint256(0xC0FFEE)));
    }

    function test_scorePrediction_revertsIfNotResolved() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        vm.prank(ownerA);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, salt));
        vm.expectRevert(AgentLeague.ConditionNotResolved.selector);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
    }

    function test_scorePrediction_revertsTwice() public {
        _setupForScore(0);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        vm.expectRevert(AgentLeague.AlreadyScored.selector);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
    }

    function test_scorePrediction_revertsIfNotEntered() public {
        vm.warp(1000);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        // do not enter
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);
        vm.expectRevert(AgentLeague.NotEntered.selector);
        league.scorePrediction(AGENT_A, Q_PRED, 0, bytes32(uint256(0xC0FFEE)));
    }

    function test_scorePrediction_emits() public {
        _setupForScore(0);
        bytes32 salt = bytes32(uint256(0xC0FFEE));
        vm.expectEmit(true, true, true, true);
        emit AgentLeague.PredictionScored(1, AGENT_A, Q_PRED, 0, 100, 100);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
    }

    // --- leaderboard / close ---

    function test_leaderboard_sortsByScoreDesc() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        _registerPredQuest(Q_PRED2, conditionId2, uint64(block.timestamp), uint64(block.timestamp + 100), 200);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerB); league.enterAgent(AGENT_B);
        vm.prank(ownerC); league.enterAgent(AGENT_C);

        bytes32 salt = bytes32(uint256(0xBEEF));
        // A predicts slot 0 (correct) on Q_PRED -> 100; slot 0 (correct) on Q_PRED2 -> 200; total 300
        vm.startPrank(ownerA);
        league.submitPrediction(AGENT_A, Q_PRED, _commit(0, salt));
        league.submitPrediction(AGENT_A, Q_PRED2, _commit(0, salt));
        vm.stopPrank();
        // B predicts only Q_PRED slot 0 -> 100
        vm.prank(ownerB);
        league.submitPrediction(AGENT_B, Q_PRED, _commit(0, salt));
        // C predicts slot 1 on Q_PRED (wrong) -> 0
        vm.prank(ownerC);
        league.submitPrediction(AGENT_C, Q_PRED, _commit(1, salt));

        vm.warp(block.timestamp + 200);
        uint256[] memory p = new uint256[](2);
        p[0] = 1; p[1] = 0;
        ct.reportPayouts(conditionId, p);
        ct.reportPayouts(conditionId2, p);

        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        league.scorePrediction(AGENT_A, Q_PRED2, 0, salt);
        league.scorePrediction(AGENT_B, Q_PRED, 0, salt);
        league.scorePrediction(AGENT_C, Q_PRED, 1, salt);

        (bytes32[] memory ids, uint64[] memory scores, address[] memory owners) = league.leaderboard(sid);
        assertEq(ids.length, 3);
        assertEq(ids[0], AGENT_A); assertEq(scores[0], 300); assertEq(owners[0], ownerA);
        assertEq(ids[1], AGENT_B); assertEq(scores[1], 100); assertEq(owners[1], ownerB);
        assertEq(ids[2], AGENT_C); assertEq(scores[2], 0); assertEq(owners[2], ownerC);
    }

    function test_leaderboard_emptyForUnseededSeason() public view {
        (bytes32[] memory ids, uint64[] memory scores, address[] memory owners) = league.leaderboard(99);
        assertEq(ids.length, 0);
        assertEq(scores.length, 0);
        assertEq(owners.length, 0);
    }

    function test_leaderboard_tiesBreakOnEnterOrder() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 50);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerB); league.enterAgent(AGENT_B);

        bytes32 salt = bytes32(uint256(7));
        vm.prank(ownerA); league.submitPrediction(AGENT_A, Q_PRED, _commit(0, salt));
        vm.prank(ownerB); league.submitPrediction(AGENT_B, Q_PRED, _commit(0, salt));
        vm.warp(block.timestamp + 200);
        uint256[] memory p = new uint256[](2);
        p[0] = 1; p[1] = 0;
        ct.reportPayouts(conditionId, p);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        league.scorePrediction(AGENT_B, Q_PRED, 0, salt);

        (bytes32[] memory ids, uint64[] memory scores,) = league.leaderboard(sid);
        // Both have 50; A entered first, so A wins the tie
        assertEq(scores[0], 50); assertEq(scores[1], 50);
        assertEq(ids[0], AGENT_A);
        assertEq(ids[1], AGENT_B);
    }

    function test_closeSeason_anyoneCanCallAfterEnd() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        vm.warp(block.timestamp + 500);
        // a random caller can close
        vm.prank(ownerC);
        league.closeSeason(sid);
        (,, AgentLeague.SeasonStatus st,,) = league.getSeason(sid);
        assertEq(uint256(st), uint256(AgentLeague.SeasonStatus.Closed));
        assertEq(league.activeSeasonId(), 0);
    }

    function test_closeSeason_revertsBeforeEndForNonAdmin() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        vm.prank(ownerC);
        vm.expectRevert(AgentLeague.SeasonNotEnded.selector);
        league.closeSeason(sid);
    }

    function test_closeSeason_adminCanForceClose() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(admin);
        league.closeSeason(sid);
        (,, AgentLeague.SeasonStatus st,,) = league.getSeason(sid);
        assertEq(uint256(st), uint256(AgentLeague.SeasonStatus.Closed));
    }

    function test_closeSeason_revertsOnUnknown() public {
        vm.prank(admin);
        vm.expectRevert(AgentLeague.SeasonUnknown.selector);
        league.closeSeason(99);
    }

    function test_closeSeason_revertsTwice() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        vm.warp(block.timestamp + 500);
        league.closeSeason(sid);
        vm.expectRevert(AgentLeague.SeasonClosed_.selector);
        league.closeSeason(sid);
    }

    function test_closeSeason_mintsTrophyToWinner() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.prank(ownerB); league.enterAgent(AGENT_B);
        bytes32 salt = bytes32(uint256(9));
        vm.prank(ownerA); league.submitPrediction(AGENT_A, Q_PRED, _commit(0, salt));
        vm.prank(ownerB); league.submitPrediction(AGENT_B, Q_PRED, _commit(1, salt));
        vm.warp(block.timestamp + 200);
        uint256[] memory p = new uint256[](2);
        p[0] = 1; p[1] = 0;
        ct.reportPayouts(conditionId, p);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
        league.scorePrediction(AGENT_B, Q_PRED, 1, salt);
        // A wins
        vm.warp(block.timestamp + 10_000);
        league.closeSeason(sid);
        assertEq(trophy.balanceOf(ownerA, AI_CHAMP_TROPHY), 1);
        assertEq(trophy.balanceOf(ownerB, AI_CHAMP_TROPHY), 0);
        (,,, bytes32 winnerId, uint64 winnerScore) = league.getSeason(sid);
        assertEq(winnerId, AGENT_A);
        assertEq(winnerScore, 100);
    }

    function test_closeSeason_noWinnerIfAllZero() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        vm.warp(block.timestamp + 500);
        league.closeSeason(sid);
        (,,, bytes32 winnerId, uint64 winnerScore) = league.getSeason(sid);
        assertEq(winnerId, bytes32(0));
        assertEq(winnerScore, 0);
        // no trophy minted
        assertEq(trophy.balanceOf(ownerA, AI_CHAMP_TROPHY), 0);
    }

    function test_closeSeason_emits() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        vm.warp(block.timestamp + 500);
        vm.expectEmit(true, false, false, true);
        emit AgentLeague.SeasonClosed(sid, bytes32(0), 0);
        league.closeSeason(sid);
    }

    // --- post-close behavior ---

    function test_scorePrediction_revertsAfterClose() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 50), 100);
        vm.prank(ownerA); league.enterAgent(AGENT_A);
        bytes32 salt = bytes32(uint256(5));
        vm.prank(ownerA); league.submitPrediction(AGENT_A, Q_PRED, _commit(0, salt));
        vm.warp(block.timestamp + 200);
        uint256[] memory p = new uint256[](2);
        p[0] = 1; p[1] = 0;
        ct.reportPayouts(conditionId, p);
        league.closeSeason(sid);
        // scoring is no longer allowed once season is closed (activeSeasonId reset)
        vm.expectRevert(AgentLeague.SeasonNotOpen.selector);
        league.scorePrediction(AGENT_A, Q_PRED, 0, salt);
    }

    function test_seasonCount_tracksCounter() public {
        assertEq(league.seasonCount(), 0);
        _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1));
        assertEq(league.seasonCount(), 1);
    }

    // --- constructor ---

    function test_constructor_revertsOnZeroAddrs() public {
        vm.expectRevert(AgentLeague.ZeroAddr.selector);
        new AgentLeague(address(0), address(engine), address(ct), address(trophy), 1, admin);
        vm.expectRevert(AgentLeague.ZeroAddr.selector);
        new AgentLeague(address(reg), address(0), address(ct), address(trophy), 1, admin);
        vm.expectRevert(AgentLeague.ZeroAddr.selector);
        new AgentLeague(address(reg), address(engine), address(0), address(trophy), 1, admin);
        vm.expectRevert(AgentLeague.ZeroAddr.selector);
        new AgentLeague(address(reg), address(engine), address(ct), address(0), 1, admin);
        vm.expectRevert(AgentLeague.ZeroAddr.selector);
        new AgentLeague(address(reg), address(engine), address(ct), address(trophy), 1, address(0));
    }

    function test_constructor_setsImmutables() public view {
        assertEq(address(league.agentRegistry()), address(reg));
        assertEq(address(league.questEngine()), address(engine));
        assertEq(address(league.conditionalTokens()), address(ct));
        assertEq(address(league.trophy()), address(trophy));
        assertEq(league.aiChampionTrophyId(), AI_CHAMP_TROPHY);
    }

    // --- v2.1 fixes: closeSeason DoS pull-pattern ---

    /// @dev Sets up a season where a `ToggleReceiver` agent (initially rejecting ERC-1155 receives)
    ///      is the sole scorer, then warps past season end. Returns the seasonId and the receiver.
    function _seasonWonByToggleReceiver(bool initiallyReject)
        internal
        returns (uint64 sid, ToggleReceiver mal, bytes32 malAgentId)
    {
        mal = new ToggleReceiver();
        mal.setReject(initiallyReject);
        // The agent id is derived in Solidity (no 64-hex literal in source).
        malAgentId = keccak256(bytes("malicious-receiver-agent"));
        mal.register(reg, malAgentId, address(mal));

        vm.warp(1000);
        sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 5000));
        _registerPredQuest(Q_PRED, conditionId, uint64(block.timestamp), uint64(block.timestamp + 100), 100);
        mal.enter(league, malAgentId);

        bytes32 salt = bytes32(uint256(0xC0FFEE));
        mal.commit(league, malAgentId, Q_PRED, _commit(0, salt));

        vm.warp(block.timestamp + 200);
        uint256[] memory p = new uint256[](2);
        p[0] = 1; p[1] = 0;
        ct.reportPayouts(conditionId, p);
        league.scorePrediction(malAgentId, Q_PRED, 0, salt);

        vm.warp(block.timestamp + 10_000);
    }

    function test_closeSeason_doesNotRevert_whenWinnerOwnerRejectsERC1155() public {
        (uint64 sid, ToggleReceiver mal, bytes32 malAgentId) = _seasonWonByToggleReceiver(true);

        vm.recordLogs();
        league.closeSeason(sid);
        Vm.Log[] memory entries = vm.getRecordedLogs();

        // season is Closed and no trophy was minted
        (,, AgentLeague.SeasonStatus st, bytes32 winnerId,) = league.getSeason(sid);
        assertEq(uint256(st), uint256(AgentLeague.SeasonStatus.Closed));
        assertEq(winnerId, malAgentId);
        assertEq(league.championMinted(sid), false);
        assertEq(trophy.balanceOf(address(mal), AI_CHAMP_TROPHY), 0);

        // and AiChampionMintDeferred was emitted (don't peek the reasonHash payload)
        bytes32 deferredSig =
            keccak256("AiChampionMintDeferred(uint64,bytes32,address,bytes)");
        bool sawDeferred;
        for (uint256 i = 0; i < entries.length; ++i) {
            if (entries[i].topics.length > 0 && entries[i].topics[0] == deferredSig) {
                sawDeferred = true;
                break;
            }
        }
        assertTrue(sawDeferred, "expected AiChampionMintDeferred");
    }

    function test_claimAiChampionTrophy_pullWorks() public {
        (uint64 sid, ToggleReceiver mal,) = _seasonWonByToggleReceiver(true);
        league.closeSeason(sid);
        // close was deferred
        assertEq(league.championMinted(sid), false);

        // operator flips to accept ERC-1155, then pull-claims
        mal.setReject(false);
        mal.claim(league, sid);

        assertEq(league.championMinted(sid), true);
        assertEq(trophy.balanceOf(address(mal), AI_CHAMP_TROPHY), 1);
    }

    function test_claimAiChampionTrophy_revertsIfSeasonNotClosed() public {
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 1000));
        vm.prank(ownerA);
        vm.expectRevert(AgentLeague.SeasonNotClosed.selector);
        league.claimAiChampionTrophy(sid);
    }

    function test_claimAiChampionTrophy_revertsIfAlreadyClaimed() public {
        (uint64 sid, ToggleReceiver mal,) = _seasonWonByToggleReceiver(true);
        league.closeSeason(sid);
        mal.setReject(false);
        mal.claim(league, sid);
        // second claim from the same legitimate owner reverts
        vm.expectRevert(AgentLeague.AlreadyClaimed.selector);
        mal.claim(league, sid);
    }

    function test_claimAiChampionTrophy_revertsIfWrongCaller() public {
        (uint64 sid,,) = _seasonWonByToggleReceiver(true);
        league.closeSeason(sid);
        // a stranger calls the pull function — must revert
        vm.prank(ownerC);
        vm.expectRevert(AgentLeague.NotWinnerOwner.selector);
        league.claimAiChampionTrophy(sid);
    }

    function test_claimAiChampionTrophy_revertsIfNoWinner() public {
        // season closes with no scorer at all → winnerAgentId == 0
        vm.warp(1000);
        uint64 sid = _openSeason(uint64(block.timestamp), uint64(block.timestamp + 100));
        vm.warp(block.timestamp + 500);
        league.closeSeason(sid);
        vm.expectRevert(AgentLeague.NoWinner.selector);
        league.claimAiChampionTrophy(sid);
    }
}
