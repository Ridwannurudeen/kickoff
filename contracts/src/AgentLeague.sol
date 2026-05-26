// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";

interface IAgentRegistryView {
    function getAgent(bytes32 agentId)
        external
        view
        returns (address owner, address agentWallet, uint128 priceWei, string memory endpointHint, bool exists);
}

interface IQuestEngineLeagueView {
    enum QuestType {
        SELF_ATTEST,
        PREDICTION,
        EXTERNAL_PROOF
    }

    function getQuest(bytes32 questId)
        external
        view
        returns (
            QuestType qType,
            uint64 startsAt,
            uint64 endsAt,
            uint64 xpReward,
            bytes32 dim,
            bytes memory config,
            bool exists
        );
}

interface ITrophyOperator {
    function operatorMint(uint256 trophyId, address to) external;
}

/// @title AgentLeague
/// @notice Free, bring-your-own-agent prediction tournament. Anyone with an agent registered
///         in `AgentRegistry` can enter the active season, hash-commit predictions on
///         `PREDICTION`-type quests before kickoff, then reveal post-OO-settle to score points. The
///         top-ranked agent's owner can claim the AI Champion trophy on `closeSeason`.
/// @dev Design constraint: no entry fees, no payouts in money. Pure free-skill — points are a unit-less
///      score, the prize is a non-purchasable commemorative trophy. Append-only state: an agent's
///      score may only increase; once `closeSeason` runs, the winner is locked in and the trophy
///      mint is idempotent (`Trophy.operatorMint` rejects double-claims).
///
/// Design choices (called out per design doc §6.5):
/// - `openSeason` is admin-gated for v1 (simpler — Kickoff curates tournament stages). Permissionless
///   open could be added later without changing the on-chain state shape.
/// - Seasons are sequential: only one season at a time. `openSeason` reverts while a season is open.
/// - Commit-reveal scheme matches `QuestEngine`: commit = keccak256(abi.encode(uint8 slot, bytes32
///   salt)); reveal = (slot, salt). Agents pick a slot at commit time, the OO writes payouts, and the
///   agent's score gets `pointsPerQuest * payoutNumerator[slot] / denominator` (same "scaled by
///   closeness" rule as user predictions).
/// - Points per scored quest = the quest's own `xpReward` (read from QuestEngine). Same scoring
///   surface as users; one configuration source of truth.
/// - `closeSeason` is callable by anyone after `endsAt` (admin can also force-close earlier). It
///   ranks entered agents by cumulative score and grants the AI Champion trophy to the top-ranked
///   agent's owner. Ties: first-entered wins (deterministic by enter order).
contract AgentLeague is AccessControl {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    enum SeasonStatus {
        None,
        Open,
        Closed
    }

    struct Season {
        uint64 startsAt;
        uint64 endsAt;
        SeasonStatus status;
        bytes32 winnerAgentId; // set on closeSeason if any agent has score > 0
        uint64 winnerScore;
    }

    struct AgentEntry {
        bool entered;
        uint64 score;
        uint64 enterIndex; // 1-based; 0 means not entered (used for tie-break)
    }

    IAgentRegistryView public immutable agentRegistry;
    IQuestEngineLeagueView public immutable questEngine;
    IConditionalTokens public immutable conditionalTokens;
    ITrophyOperator public immutable trophy;
    /// @notice Trophy id minted to the season winner's owner via `Trophy.operatorMint`.
    uint256 public immutable aiChampionTrophyId;

    uint64 public activeSeasonId; // 0 = no active season; counter starts at 1
    uint64 private _seasonCounter;

    mapping(uint64 seasonId => Season) private _seasons;
    /// @dev seasonId → agentId → entry
    mapping(uint64 => mapping(bytes32 => AgentEntry)) private _entries;
    /// @dev seasonId → list of entered agentIds (enter order)
    mapping(uint64 => bytes32[]) private _enteredAgents;
    /// @dev seasonId → agentId → questId → committed prediction hash (0 if none)
    mapping(uint64 => mapping(bytes32 => mapping(bytes32 => bytes32))) public predictionCommit;
    /// @dev seasonId → agentId → questId → scored?
    mapping(uint64 => mapping(bytes32 => mapping(bytes32 => bool))) public scored;

    event SeasonOpened(uint64 indexed seasonId, uint64 startsAt, uint64 endsAt);
    event AgentEntered(uint64 indexed seasonId, bytes32 indexed agentId, address indexed owner);
    event PredictionCommitted(uint64 indexed seasonId, bytes32 indexed agentId, bytes32 indexed questId, bytes32 commit);
    event PredictionScored(
        uint64 indexed seasonId, bytes32 indexed agentId, bytes32 indexed questId, uint8 predictedSlot, uint64 award, uint64 newTotal
    );
    event SeasonClosed(uint64 indexed seasonId, bytes32 winnerAgentId, uint64 winnerScore);
    event AiChampionMinted(uint64 indexed seasonId, bytes32 indexed agentId, address indexed owner, uint256 trophyId);

    error SeasonOpenAlready();
    error SeasonNotOpen();
    error SeasonClosed_();
    error SeasonUnknown();
    error SeasonNotEnded();
    error InvalidWindow();
    error AgentUnknown();
    error NotAgentOwner();
    error AlreadyEntered();
    error NotEntered();
    error QuestUnknown();
    error WrongQuestType();
    error WindowNotOpen();
    error WindowClosed();
    error AlreadyCommitted();
    error NotCommitted();
    error BadReveal();
    error ConditionNotResolved();
    error AlreadyScored();
    error NoWinner();
    error ZeroAddr();
    error BadSlot();

    constructor(
        address agentRegistry_,
        address questEngine_,
        address conditionalTokens_,
        address trophy_,
        uint256 aiChampionTrophyId_,
        address admin
    ) {
        if (
            agentRegistry_ == address(0) || questEngine_ == address(0) || conditionalTokens_ == address(0)
                || trophy_ == address(0) || admin == address(0)
        ) revert ZeroAddr();
        agentRegistry = IAgentRegistryView(agentRegistry_);
        questEngine = IQuestEngineLeagueView(questEngine_);
        conditionalTokens = IConditionalTokens(conditionalTokens_);
        trophy = ITrophyOperator(trophy_);
        aiChampionTrophyId = aiChampionTrophyId_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // --- season lifecycle ---

    /// @notice Open a new season. Only one season may be open at a time. Admin-gated for v1.
    function openSeason(uint64 startsAt, uint64 endsAt) external onlyRole(ADMIN_ROLE) returns (uint64 seasonId) {
        if (activeSeasonId != 0) revert SeasonOpenAlready();
        if (endsAt <= startsAt) revert InvalidWindow();
        seasonId = ++_seasonCounter;
        _seasons[seasonId] = Season({
            startsAt: startsAt, endsAt: endsAt, status: SeasonStatus.Open, winnerAgentId: bytes32(0), winnerScore: 0
        });
        activeSeasonId = seasonId;
        emit SeasonOpened(seasonId, startsAt, endsAt);
    }

    /// @notice Enter an agent into the active season. Only the agent's `owner` (per AgentRegistry)
    ///         can enter it. Free; one entry per agent per season.
    function enterAgent(bytes32 agentId) external {
        uint64 sid = activeSeasonId;
        if (sid == 0) revert SeasonNotOpen();
        Season storage s = _seasons[sid];
        if (s.status != SeasonStatus.Open) revert SeasonNotOpen();

        (address owner,,,, bool exists) = agentRegistry.getAgent(agentId);
        if (!exists) revert AgentUnknown();
        if (owner != msg.sender) revert NotAgentOwner();

        AgentEntry storage e = _entries[sid][agentId];
        if (e.entered) revert AlreadyEntered();
        _enteredAgents[sid].push(agentId);
        e.entered = true;
        e.enterIndex = uint64(_enteredAgents[sid].length); // 1-based
        emit AgentEntered(sid, agentId, owner);
    }

    /// @notice Hash-commit a prediction for a `PREDICTION`-type quest. Must be called before the
    ///         quest's `endsAt` (i.e., before kickoff) AND while the season is open. The agent must
    ///         be entered in the active season; the caller must be the agent's owner.
    /// @dev commit = keccak256(abi.encode(uint8 slot, bytes32 salt))
    function submitPrediction(bytes32 agentId, bytes32 questId, bytes32 predictionCommit_) external {
        uint64 sid = activeSeasonId;
        if (sid == 0) revert SeasonNotOpen();
        Season storage s = _seasons[sid];
        if (s.status != SeasonStatus.Open) revert SeasonNotOpen();

        AgentEntry storage e = _entries[sid][agentId];
        if (!e.entered) revert NotEntered();

        (address owner,,,,) = agentRegistry.getAgent(agentId);
        if (owner != msg.sender) revert NotAgentOwner();

        (IQuestEngineLeagueView.QuestType qType, uint64 startsAt, uint64 endsAt,,,, bool exists) =
            questEngine.getQuest(questId);
        if (!exists) revert QuestUnknown();
        if (qType != IQuestEngineLeagueView.QuestType.PREDICTION) revert WrongQuestType();
        if (block.timestamp < startsAt) revert WindowNotOpen();
        if (block.timestamp > endsAt) revert WindowClosed();

        if (predictionCommit[sid][agentId][questId] != bytes32(0)) revert AlreadyCommitted();
        predictionCommit[sid][agentId][questId] = predictionCommit_;
        emit PredictionCommitted(sid, agentId, questId, predictionCommit_);
    }

    /// @notice Reveal a previously-committed prediction and credit points. Anyone can call (keeper-
    ///         friendly). Requires the OO to have resolved the underlying condition. Idempotent
    ///         per (season, agent, quest): one score per scored quest.
    /// @dev reveal must satisfy keccak256(abi.encode(predictedSlot, salt)) == commit.
    ///      score increment = quest.xpReward * payoutNumerators[predictedSlot] / sum(numerators).
    function scorePrediction(bytes32 agentId, bytes32 questId, uint8 predictedSlot, bytes32 salt) external {
        uint64 sid = activeSeasonId;
        if (sid == 0) revert SeasonNotOpen();
        if (_seasons[sid].status != SeasonStatus.Open) revert SeasonClosed_();

        AgentEntry storage e = _entries[sid][agentId];
        if (!e.entered) revert NotEntered();
        if (scored[sid][agentId][questId]) revert AlreadyScored();

        bytes32 commit_ = predictionCommit[sid][agentId][questId];
        if (commit_ == bytes32(0)) revert NotCommitted();
        if (keccak256(abi.encode(predictedSlot, salt)) != commit_) revert BadReveal();

        uint64 award = _calcAward(questId, predictedSlot);

        scored[sid][agentId][questId] = true;
        uint64 prev = e.score;
        uint64 next = prev + award;
        require(next >= prev, "score overflow");
        e.score = next;
        emit PredictionScored(sid, agentId, questId, predictedSlot, award, next);
    }

    /// @dev Reads the quest config, validates the condition is resolved, and computes the closeness-
    ///      scaled award. Pulled out to keep `scorePrediction`'s stack shallow.
    function _calcAward(bytes32 questId, uint8 predictedSlot) internal view returns (uint64 award) {
        (IQuestEngineLeagueView.QuestType qType,,, uint64 xpReward,, bytes memory config, bool exists) =
            questEngine.getQuest(questId);
        if (!exists) revert QuestUnknown();
        if (qType != IQuestEngineLeagueView.QuestType.PREDICTION) revert WrongQuestType();

        bytes32 conditionId = _decodePredictionConfig(config);
        if (conditionalTokens.conditionStatus(conditionId) != 2) revert ConditionNotResolved();
        uint8 slots = conditionalTokens.getOutcomeSlotCount(conditionId);
        if (predictedSlot >= slots) revert BadSlot();
        uint256[] memory nums = conditionalTokens.payoutNumerators(conditionId);
        uint256 den;
        for (uint256 i = 0; i < nums.length; ++i) {
            den += nums[i];
        }
        award = uint64((uint256(xpReward) * nums[predictedSlot]) / den);
    }

    /// @notice Close the active season and mint the AI Champion trophy to the top-ranked agent's
    ///         owner. Anyone can call after `endsAt`; admin can force-close earlier. Idempotent — a
    ///         season can only be closed once. If no agent scored > 0, the season closes without a
    ///         winner and no trophy is minted.
    function closeSeason(uint64 seasonId) external {
        Season storage s = _seasons[seasonId];
        if (s.status == SeasonStatus.None) revert SeasonUnknown();
        if (s.status == SeasonStatus.Closed) revert SeasonClosed_();
        if (block.timestamp < s.endsAt && !hasRole(ADMIN_ROLE, msg.sender)) revert SeasonNotEnded();

        bytes32[] storage agents = _enteredAgents[seasonId];
        bytes32 bestId;
        uint64 bestScore;
        // first-entered wins ties (iterating in enter order gives "strictly >" the right semantics)
        for (uint256 i = 0; i < agents.length; ++i) {
            AgentEntry storage e = _entries[seasonId][agents[i]];
            if (e.score > bestScore) {
                bestScore = e.score;
                bestId = agents[i];
            }
        }

        s.status = SeasonStatus.Closed;
        s.winnerAgentId = bestId;
        s.winnerScore = bestScore;
        if (activeSeasonId == seasonId) activeSeasonId = 0;
        emit SeasonClosed(seasonId, bestId, bestScore);

        if (bestId != bytes32(0)) {
            (address winnerOwner,,,,) = agentRegistry.getAgent(bestId);
            // operatorMint reverts on double-claim; if a prior season already minted this trophy
            // to the same owner, we surface the revert rather than silently swallow.
            trophy.operatorMint(aiChampionTrophyId, winnerOwner);
            emit AiChampionMinted(seasonId, bestId, winnerOwner, aiChampionTrophyId);
        }
    }

    // --- views ---

    /// @notice Returns ranked agents for `seasonId`. Sorted descending by score; ties broken by
    ///         enter order (earlier-entered wins). Returns parallel arrays of agentIds, scores,
    ///         and owner addresses.
    function leaderboard(uint64 seasonId)
        external
        view
        returns (bytes32[] memory agentIds, uint64[] memory scores, address[] memory owners)
    {
        bytes32[] storage entered = _enteredAgents[seasonId];
        uint256 n = entered.length;
        agentIds = new bytes32[](n);
        scores = new uint64[](n);
        owners = new address[](n);
        if (n == 0) return (agentIds, scores, owners);

        // copy into local arrays; sort by score desc, stable on enter index
        for (uint256 i = 0; i < n; ++i) {
            agentIds[i] = entered[i];
            scores[i] = _entries[seasonId][entered[i]].score;
        }
        // insertion sort (n is expected small — a few hundred at most for a single season)
        for (uint256 i = 1; i < n; ++i) {
            bytes32 idi = agentIds[i];
            uint64 sci = scores[i];
            uint256 j = i;
            while (j > 0 && scores[j - 1] < sci) {
                agentIds[j] = agentIds[j - 1];
                scores[j] = scores[j - 1];
                --j;
            }
            agentIds[j] = idi;
            scores[j] = sci;
        }
        for (uint256 i = 0; i < n; ++i) {
            (address owner,,,,) = agentRegistry.getAgent(agentIds[i]);
            owners[i] = owner;
        }
    }

    function getSeason(uint64 seasonId)
        external
        view
        returns (uint64 startsAt, uint64 endsAt, SeasonStatus status, bytes32 winnerAgentId, uint64 winnerScore)
    {
        Season storage s = _seasons[seasonId];
        return (s.startsAt, s.endsAt, s.status, s.winnerAgentId, s.winnerScore);
    }

    function getEntry(uint64 seasonId, bytes32 agentId)
        external
        view
        returns (bool entered, uint64 score, uint64 enterIndex)
    {
        AgentEntry storage e = _entries[seasonId][agentId];
        return (e.entered, e.score, e.enterIndex);
    }

    function enteredAgents(uint64 seasonId) external view returns (bytes32[] memory) {
        return _enteredAgents[seasonId];
    }

    function seasonCount() external view returns (uint64) {
        return _seasonCounter;
    }

    // --- internals ---

    function _decodePredictionConfig(bytes memory cfg) internal pure returns (bytes32 conditionId) {
        require(cfg.length == 32, "cfg");
        assembly { conditionId := mload(add(cfg, 32)) }
    }
}
