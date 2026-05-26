// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IFanRepView {
    function score(address user) external view returns (uint64 total, uint64, uint64, uint64);
    function hasFanId(address user) external view returns (bool);
}

interface IQuestEngineView {
    function completed(bytes32 questId, address user) external view returns (bool);
}

/// @title Trophy
/// @notice Commemorative ERC-1155 collectibles for Kickoff. Each `trophyId` has a deterministic
///         mint rule: minimum total XP + a set of required quest completions + an optional claim
///         deadline. One mint per wallet per trophy. No randomness, no fees beyond gas.
/// @dev Append-only: a trophy's mint rule cannot be edited after it's defined. The owner of a trophy
///      cannot trade it away by design (these are commemoratives), but ERC-1155
///      transferability is preserved per the doc to avoid breaking external tooling — they are
///      simply non-purchasable in any official surface. The design constraint is honored at the mint surface.
contract Trophy is ERC1155, AccessControl {
    bytes32 public constant TROPHY_REGISTRAR_ROLE = keccak256("TROPHY_REGISTRAR_ROLE");

    struct Rule {
        uint64 requiredXP;
        uint64 windowEnd; // 0 = open-ended
        bytes32[] requiredQuestIds;
        bool exists;
    }

    mapping(uint256 trophyId => Rule) private _rules;
    mapping(uint256 => mapping(address => bool)) public claimed;

    IFanRepView public immutable fanRep;
    IQuestEngineView public immutable questEngine;

    event TrophyDefined(uint256 indexed trophyId, uint64 requiredXP, uint64 windowEnd, bytes32[] requiredQuestIds);
    event TrophyClaimed(uint256 indexed trophyId, address indexed user);

    error TrophyExists();
    error TrophyUnknown();
    error AlreadyClaimed();
    error InsufficientXP();
    error QuestMissing();
    error WindowExpired();
    error NoFanId();

    constructor(string memory uri_, address fanRep_, address questEngine_, address admin) ERC1155(uri_) {
        require(fanRep_ != address(0) && questEngine_ != address(0) && admin != address(0), "zero addr");
        fanRep = IFanRepView(fanRep_);
        questEngine = IQuestEngineView(questEngine_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TROPHY_REGISTRAR_ROLE, admin);
    }

    // --- registration (deterministic, append-only) ---

    /// @notice Define a trophy's mint rule. Append-only: the rule cannot be edited after the call.
    function defineTrophy(
        uint256 trophyId,
        uint64 requiredXP,
        uint64 windowEnd,
        bytes32[] calldata requiredQuestIds
    ) external onlyRole(TROPHY_REGISTRAR_ROLE) {
        if (_rules[trophyId].exists) revert TrophyExists();
        Rule storage r = _rules[trophyId];
        r.requiredXP = requiredXP;
        r.windowEnd = windowEnd;
        for (uint256 i = 0; i < requiredQuestIds.length; ++i) {
            r.requiredQuestIds.push(requiredQuestIds[i]);
        }
        r.exists = true;
        emit TrophyDefined(trophyId, requiredXP, windowEnd, requiredQuestIds);
    }

    // --- claim ---

    /// @notice Claim the trophy. Caller must satisfy XP threshold + all required quest completions
    ///         and (if set) be within the window. One mint per wallet per trophyId.
    function claim(uint256 trophyId) external {
        Rule storage r = _rules[trophyId];
        if (!r.exists) revert TrophyUnknown();
        if (claimed[trophyId][msg.sender]) revert AlreadyClaimed();
        if (r.windowEnd != 0 && block.timestamp > r.windowEnd) revert WindowExpired();
        if (!fanRep.hasFanId(msg.sender)) revert NoFanId();

        (uint64 total,,,) = fanRep.score(msg.sender);
        if (total < r.requiredXP) revert InsufficientXP();

        uint256 n = r.requiredQuestIds.length;
        for (uint256 i = 0; i < n; ++i) {
            if (!questEngine.completed(r.requiredQuestIds[i], msg.sender)) revert QuestMissing();
        }

        claimed[trophyId][msg.sender] = true;
        _mint(msg.sender, trophyId, 1, "");
        emit TrophyClaimed(trophyId, msg.sender);
    }

    /// @notice Trusted operator (e.g. AgentLeague) can mint a gated trophy directly to a verified
    ///         winner address. Still respects "one per wallet" and "must be defined", but skips the
    ///         caller-driven XP/quest gating because the operator has already verified eligibility
    ///         off-trophy (e.g. league standings). Used by the AI Champion flow.
    function operatorMint(uint256 trophyId, address to) external onlyRole(TROPHY_REGISTRAR_ROLE) {
        Rule storage r = _rules[trophyId];
        if (!r.exists) revert TrophyUnknown();
        if (claimed[trophyId][to]) revert AlreadyClaimed();
        claimed[trophyId][to] = true;
        _mint(to, trophyId, 1, "");
        emit TrophyClaimed(trophyId, to);
    }

    // --- views ---

    function getRule(uint256 trophyId)
        external
        view
        returns (uint64 requiredXP, uint64 windowEnd, bytes32[] memory requiredQuestIds, bool exists)
    {
        Rule storage r = _rules[trophyId];
        return (r.requiredXP, r.windowEnd, r.requiredQuestIds, r.exists);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
