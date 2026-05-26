// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";

interface IFanRep {
    function recordXP(address user, bytes32 dim, uint64 amount) external;
    function hasFanId(address user) external view returns (bool);
}

/// @title QuestEngine
/// @notice Quest engine. Three quest types — SELF_ATTEST (user attests), PREDICTION (hash
///         commit → OO settles → XP scaled by closeness), EXTERNAL_PROOF (admin-signed attestation).
///         XP is credited to FanRep dimensions; no money flows anywhere.
/// @dev PREDICTION quests reuse the existing OptimisticOracle/ConditionalTokens stack: quest config
///      encodes the conditionId; settlement reads the resolved `payoutNumerators` to score the
///      predicted outcome slot. State is append-only — completions cannot be reversed or re-credited.
contract QuestEngine is AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant QUEST_REGISTRAR_ROLE = keccak256("QUEST_REGISTRAR_ROLE");

    enum QuestType {
        SELF_ATTEST,
        PREDICTION,
        EXTERNAL_PROOF
    }

    struct Quest {
        QuestType qType;
        uint64 startsAt;
        uint64 endsAt;
        uint64 xpReward;
        bytes32 dim; // FanRep dimension to credit
        bytes config; // type-specific config (see _decode* helpers)
        bool exists;
    }

    /// @dev PREDICTION config: ABI(bytes32 conditionId)
    /// @dev EXTERNAL_PROOF config: ABI(address attestationSigner)
    /// @dev SELF_ATTEST config: empty bytes
    mapping(bytes32 questId => Quest) private _quests;
    /// @dev questId → user → completed? (append-only)
    mapping(bytes32 => mapping(address => bool)) public completed;
    /// @dev PREDICTION: questId → user → committed prediction hash (0 if none)
    mapping(bytes32 => mapping(address => bytes32)) public predictionCommit;

    IFanRep public immutable fanRep;
    IConditionalTokens public immutable conditionalTokens;

    event QuestRegistered(
        bytes32 indexed questId, QuestType qType, uint64 startsAt, uint64 endsAt, uint64 xpReward, bytes32 dim
    );
    event QuestCompleted(bytes32 indexed questId, address indexed user, uint64 xpAwarded);
    event PredictionCommitted(bytes32 indexed questId, address indexed user, bytes32 commit);

    error QuestExists();
    error QuestUnknown();
    error WindowNotOpen();
    error WindowClosed();
    error AlreadyCompleted();
    error AlreadyCommitted();
    error NotCommitted();
    error WrongType();
    error BadReveal();
    error ConditionNotResolved();
    error BadAttestation();
    error InvalidWindow();
    error NoFanId();
    error ZeroReward();

    constructor(address fanRep_, address conditionalTokens_, address admin) {
        require(fanRep_ != address(0) && conditionalTokens_ != address(0) && admin != address(0), "zero addr");
        fanRep = IFanRep(fanRep_);
        conditionalTokens = IConditionalTokens(conditionalTokens_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(QUEST_REGISTRAR_ROLE, admin);
    }

    // --- registration (admin) ---

    function registerQuest(
        QuestType qType,
        bytes32 questId,
        uint64 startsAt,
        uint64 endsAt,
        uint64 xpReward,
        bytes32 dim,
        bytes calldata config
    ) external onlyRole(QUEST_REGISTRAR_ROLE) {
        if (_quests[questId].exists) revert QuestExists();
        if (endsAt <= startsAt) revert InvalidWindow();
        if (xpReward == 0) revert ZeroReward();
        _quests[questId] = Quest({
            qType: qType, startsAt: startsAt, endsAt: endsAt, xpReward: xpReward, dim: dim, config: config, exists: true
        });
        emit QuestRegistered(questId, qType, startsAt, endsAt, xpReward, dim);
    }

    // --- completion ---

    /// @notice SELF_ATTEST: user attests once in window. One credit per wallet per quest.
    function completeSelfAttest(bytes32 questId) external {
        Quest storage q = _quests[questId];
        if (!q.exists) revert QuestUnknown();
        if (q.qType != QuestType.SELF_ATTEST) revert WrongType();
        _requireWindowOpen(q);
        _award(questId, q, msg.sender);
    }

    /// @notice PREDICTION step 1: commit a hash before `endsAt` (i.e., before kickoff).
    ///         commit = keccak256(abi.encode(predictedSlot, salt)). One commit per wallet per quest.
    function commitPrediction(bytes32 questId, bytes32 commit_) external {
        Quest storage q = _quests[questId];
        if (!q.exists) revert QuestUnknown();
        if (q.qType != QuestType.PREDICTION) revert WrongType();
        _requireWindowOpen(q);
        if (!fanRep.hasFanId(msg.sender)) revert NoFanId();
        if (predictionCommit[questId][msg.sender] != bytes32(0)) revert AlreadyCommitted();
        predictionCommit[questId][msg.sender] = commit_;
        emit PredictionCommitted(questId, msg.sender, commit_);
    }

    /// @notice PREDICTION step 2: after the OO has resolved the condition, anyone can settle for a
    ///         given user by revealing their (slot, salt). XP is full if the user's predicted slot
    ///         has a non-zero payoutNumerator (i.e., it won or partial-won), zero otherwise. This is
    ///         the "scaled by closeness" rule: a tied outcome partial-credits proportionally.
    function settlePrediction(bytes32 questId, address user, uint8 predictedSlot, bytes32 salt) external {
        Quest storage q = _quests[questId];
        if (!q.exists) revert QuestUnknown();
        if (q.qType != QuestType.PREDICTION) revert WrongType();
        if (completed[questId][user]) revert AlreadyCompleted();
        bytes32 commit_ = predictionCommit[questId][user];
        if (commit_ == bytes32(0)) revert NotCommitted();
        if (keccak256(abi.encode(predictedSlot, salt)) != commit_) revert BadReveal();

        bytes32 conditionId = _decodePredictionConfig(q.config);
        // require the OO to have settled the condition; status 2 = Resolved
        if (conditionalTokens.conditionStatus(conditionId) != 2) revert ConditionNotResolved();
        uint8 slots = conditionalTokens.getOutcomeSlotCount(conditionId);
        require(predictedSlot < slots, "slot");
        uint256[] memory nums = conditionalTokens.payoutNumerators(conditionId);
        uint256 den;
        for (uint256 i = 0; i < nums.length; ++i) {
            den += nums[i];
        }
        // closeness: pro-rata. correct slot gets full reward; partial credit if outcome was a tie.
        uint64 award = uint64((uint256(q.xpReward) * nums[predictedSlot]) / den);
        // record completion regardless (one shot per user); only call recordXP if non-zero.
        completed[questId][user] = true;
        if (award > 0) {
            fanRep.recordXP(user, q.dim, award);
        }
        emit QuestCompleted(questId, user, award);
    }

    /// @notice EXTERNAL_PROOF: user submits a signature from the quest's attestation signer that
    ///         binds {questId, user}. One credit per wallet per quest.
    function completeExternalProof(bytes32 questId, bytes calldata signature) external {
        Quest storage q = _quests[questId];
        if (!q.exists) revert QuestUnknown();
        if (q.qType != QuestType.EXTERNAL_PROOF) revert WrongType();
        _requireWindowOpen(q);

        address signer = _decodeExternalProofConfig(q.config);
        bytes32 digest = keccak256(abi.encode(address(this), block.chainid, questId, msg.sender)).toEthSignedMessageHash();
        address recovered = digest.recover(signature);
        if (recovered != signer) revert BadAttestation();

        _award(questId, q, msg.sender);
    }

    // --- internals ---

    function _requireWindowOpen(Quest storage q) internal view {
        if (block.timestamp < q.startsAt) revert WindowNotOpen();
        if (block.timestamp > q.endsAt) revert WindowClosed();
    }

    function _award(bytes32 questId, Quest storage q, address user) internal {
        if (completed[questId][user]) revert AlreadyCompleted();
        if (!fanRep.hasFanId(user)) revert NoFanId();
        completed[questId][user] = true;
        fanRep.recordXP(user, q.dim, q.xpReward);
        emit QuestCompleted(questId, user, q.xpReward);
    }

    function _decodePredictionConfig(bytes storage cfg) internal view returns (bytes32 conditionId) {
        bytes memory c = cfg;
        require(c.length == 32, "cfg");
        assembly { conditionId := mload(add(c, 32)) }
    }

    function _decodeExternalProofConfig(bytes storage cfg) internal view returns (address signer) {
        bytes memory c = cfg;
        signer = abi.decode(c, (address));
    }

    // --- views ---

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
        )
    {
        Quest storage q = _quests[questId];
        return (q.qType, q.startsAt, q.endsAt, q.xpReward, q.dim, q.config, q.exists);
    }
}
