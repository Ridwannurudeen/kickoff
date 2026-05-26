// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {FanRep} from "../src/FanRep.sol";
import {QuestEngine} from "../src/QuestEngine.sol";
import {Trophy} from "../src/Trophy.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentLeague} from "../src/AgentLeague.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/// @notice End-to-end happy path exercising every v2 contract in one flow:
///   1) admin wires up the stack (roles + Trophy definitions)
///   2) Alice mints Fan ID, registers an agent, enters the active AgentLeague season
///   3) admin registers a PREDICTION quest pegged to a binary ConditionalTokens condition
///   4) Alice commits a prediction in QuestEngine AND in AgentLeague (her agent)
///   5) the condition is reported as outcome 0 = winner
///   6) Alice's user prediction settles → QuestEngine credits Fan XP
///   7) Alice's agent prediction is scored → AgentLeague tallies points
///   8) Alice claims the "Pollster" trophy (XP gating via FanRep + completion via QuestEngine)
///   9) season closes → top agent's owner gets the AI Champion trophy
contract V2EndToEndTest is Test {
    FanRep rep;
    QuestEngine engine;
    Trophy trophy;
    AgentRegistry reg;
    AgentLeague league;
    ConditionalTokens ct;
    MockUSDC usdc;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address aliceAgentWallet = makeAddr("aliceAgentWallet");

    bytes32 constant ALICE_AGENT = keccak256("alice-bot");
    bytes32 constant Q_PRED = keccak256("watch-france-vs-brazil");
    uint256 constant POLLSTER_TROPHY = 100;
    uint256 constant AI_CHAMP_TROPHY = 200;

    bytes32 conditionId;

    function setUp() public {
        rep = new FanRep(admin);
        usdc = new MockUSDC();
        ct = new ConditionalTokens("uri", address(this));
        engine = new QuestEngine(address(rep), address(ct), admin);
        trophy = new Trophy("ipfs://t/{id}", address(rep), address(engine), admin);
        reg = new AgentRegistry();
        league = new AgentLeague(address(reg), address(engine), address(ct), address(trophy), AI_CHAMP_TROPHY, admin);

        // wire roles + define trophies
        bytes32 recorderRole = rep.XP_RECORDER_ROLE();
        bytes32 trophyRegRole = trophy.TROPHY_REGISTRAR_ROLE();
        vm.startPrank(admin);
        rep.grantRole(recorderRole, address(engine));
        trophy.grantRole(trophyRegRole, address(league));
        // Pollster: ≥ 100 XP and completed Q_PRED
        bytes32[] memory reqs = new bytes32[](1);
        reqs[0] = Q_PRED;
        trophy.defineTrophy(POLLSTER_TROPHY, 100, 0, reqs);
        // AI Champion: empty gating; minted via operatorMint from AgentLeague
        bytes32[] memory noReqs = new bytes32[](0);
        trophy.defineTrophy(AI_CHAMP_TROPHY, 0, 0, noReqs);
        vm.stopPrank();

        conditionId = ct.prepareCondition(address(usdc), keccak256("france-vs-brazil"), 2);
    }

    function test_fullHappyPath_mintToTrophyToLeagueChampion() public {
        // 1) Alice mints Fan ID
        vm.prank(alice);
        rep.mint();
        assertTrue(rep.hasFanId(alice));

        // 2) Alice registers her agent in the permissionless registry
        vm.prank(alice);
        reg.registerAgent(ALICE_AGENT, aliceAgentWallet, 0, "https://alice.example/agent");

        // 3) admin opens a season
        vm.warp(1_700_000_000);
        vm.prank(admin);
        uint64 sid = league.openSeason(uint64(block.timestamp), uint64(block.timestamp + 1 days));

        // 4) Alice enters her agent into the league
        vm.prank(alice);
        league.enterAgent(ALICE_AGENT);

        // 5) admin registers a PREDICTION quest pegged to the condition
        bytes32 dim = rep.DIM_PREDICTION_ACCURACY();
        bytes memory cfg = abi.encode(conditionId);
        vm.prank(admin);
        engine.registerQuest(
            QuestEngine.QuestType.PREDICTION,
            Q_PRED,
            uint64(block.timestamp),
            uint64(block.timestamp + 1 hours),
            100, // 100 XP, matches Pollster's required XP exactly so this single quest funds the claim
            dim,
            cfg
        );

        // 6) Alice commits her own prediction (as a user) and her agent's prediction (in the league)
        bytes32 saltUser = bytes32(uint256(0xABCDEF));
        bytes32 saltAgent = bytes32(uint256(0x123456));
        bytes32 userCommit = keccak256(abi.encode(uint8(0), saltUser));
        bytes32 agentCommit = keccak256(abi.encode(uint8(0), saltAgent));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, userCommit);
        vm.prank(alice);
        league.submitPrediction(ALICE_AGENT, Q_PRED, agentCommit);

        // 7) match finishes; oracle resolves outcome 0 = winner
        vm.warp(block.timestamp + 2 hours);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);

        // 8) Alice's user prediction settles -> FanRep is credited 100 XP
        engine.settlePrediction(Q_PRED, alice, 0, saltUser);
        (uint64 total, uint64 pred,,) = rep.score(alice);
        assertEq(total, 100, "total XP after quest settlement");
        assertEq(pred, 100, "prediction XP after quest settlement");
        assertTrue(engine.completed(Q_PRED, alice));

        // 9) the league scores Alice's agent
        league.scorePrediction(ALICE_AGENT, Q_PRED, 0, saltAgent);
        (, uint64 agentScore,) = league.getEntry(sid, ALICE_AGENT);
        assertEq(agentScore, 100, "agent league score");

        // 10) Alice now meets every gate (XP ≥ 100, completed Q_PRED) → claim Pollster
        vm.prank(alice);
        trophy.claim(POLLSTER_TROPHY);
        assertEq(trophy.balanceOf(alice, POLLSTER_TROPHY), 1, "Pollster minted");

        // 11) season closes -> Alice's agent is top -> she gets the AI Champion trophy automatically
        vm.warp(block.timestamp + 2 days);
        league.closeSeason(sid);
        assertEq(trophy.balanceOf(alice, AI_CHAMP_TROPHY), 1, "AI Champion minted to top agent's owner");

        // 12) leaderboard reflects Alice as the winner
        (bytes32[] memory ids, uint64[] memory scores, address[] memory owners) = league.leaderboard(sid);
        assertEq(ids.length, 1);
        assertEq(ids[0], ALICE_AGENT);
        assertEq(scores[0], 100);
        assertEq(owners[0], alice);

        // 13) season is sealed; subsequent close reverts
        vm.expectRevert(AgentLeague.SeasonClosed_.selector);
        league.closeSeason(sid);
    }

    /// @notice Same wiring, but the agent loses while the user wins — proves XP+trophy flow doesn't
    ///         depend on league success, and the league cleanly closes with no winner gated by zero
    ///         scores (uses operatorMint-skip path).
    function test_userQuestSucceeds_agentLeaguePredictionLoses() public {
        vm.prank(alice);
        rep.mint();
        vm.prank(alice);
        reg.registerAgent(ALICE_AGENT, aliceAgentWallet, 0, "x");

        vm.warp(1_700_000_000);
        vm.prank(admin);
        uint64 sid = league.openSeason(uint64(block.timestamp), uint64(block.timestamp + 1 days));
        vm.prank(alice);
        league.enterAgent(ALICE_AGENT);

        bytes32 dim = rep.DIM_PREDICTION_ACCURACY();
        bytes memory cfg = abi.encode(conditionId);
        vm.prank(admin);
        engine.registerQuest(
            QuestEngine.QuestType.PREDICTION,
            Q_PRED,
            uint64(block.timestamp),
            uint64(block.timestamp + 1 hours),
            100,
            dim,
            cfg
        );

        // user picks correctly; agent picks wrong
        bytes32 salt = bytes32(uint256(7));
        vm.prank(alice);
        engine.commitPrediction(Q_PRED, keccak256(abi.encode(uint8(0), salt)));
        vm.prank(alice);
        league.submitPrediction(ALICE_AGENT, Q_PRED, keccak256(abi.encode(uint8(1), salt)));

        vm.warp(block.timestamp + 2 hours);
        uint256[] memory payouts = new uint256[](2);
        payouts[0] = 1; payouts[1] = 0;
        ct.reportPayouts(conditionId, payouts);

        engine.settlePrediction(Q_PRED, alice, 0, salt);
        league.scorePrediction(ALICE_AGENT, Q_PRED, 1, salt);

        (uint64 total,,,) = rep.score(alice);
        assertEq(total, 100, "user XP unaffected by league outcome");
        (, uint64 agentScore,) = league.getEntry(sid, ALICE_AGENT);
        assertEq(agentScore, 0, "agent score is 0 on a wrong pick");

        // alice can still claim Pollster (her user-side perf met the gate)
        vm.prank(alice);
        trophy.claim(POLLSTER_TROPHY);
        assertEq(trophy.balanceOf(alice, POLLSTER_TROPHY), 1);

        // season closes; no winner has score > 0 -> no AI Champion minted
        vm.warp(block.timestamp + 2 days);
        league.closeSeason(sid);
        assertEq(trophy.balanceOf(alice, AI_CHAMP_TROPHY), 0, "no AI Champion when all scores are zero");
        (,,, bytes32 winnerId, uint64 winnerScore) = league.getSeason(sid);
        assertEq(winnerId, bytes32(0));
        assertEq(winnerScore, 0);
    }
}
