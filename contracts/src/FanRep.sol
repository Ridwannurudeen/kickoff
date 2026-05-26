// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title FanRep
/// @notice Soulbound ERC-721 carrying a multi-dimensional reputation score. One FanID per wallet;
///         non-transferable (mint + burn-from-self only). Reputation dimensions are admin-registered
///         and credited exclusively by trusted modules (e.g. QuestEngine, AgentLeague) via
///         role-gated `recordXP`. Storage is append-only — no admin override on user balances.
/// @dev Design constraint: no money is associated with the SBT or its reputation. XP is unit-less merit.
contract FanRep is ERC721, AccessControl {
    bytes32 public constant XP_RECORDER_ROLE = keccak256("XP_RECORDER_ROLE");

    /// @dev Canonical dimension ids (admin can register more, but these are reserved at deploy time).
    bytes32 public constant DIM_PREDICTION_ACCURACY = keccak256("PREDICTION_ACCURACY");
    bytes32 public constant DIM_ENGAGEMENT_BREADTH = keccak256("ENGAGEMENT_BREADTH");
    bytes32 public constant DIM_LONGEVITY = keccak256("LONGEVITY");
    bytes32 public constant DIM_AGENT_LEAGUE = keccak256("AGENT_LEAGUE");
    bytes32 public constant DIM_DONOR = keccak256("DONOR");

    struct FanID {
        uint256 tokenId;
        uint64 mintedAt;
        // per-dimension XP — read via `score()` for the canonical surface
        mapping(bytes32 dim => uint64 xp) xpByDim;
        // append-only aggregate of all dimensions (also equals sum of xpByDim)
        uint64 totalXP;
    }

    mapping(address user => FanID) private _fans;
    mapping(bytes32 dim => bool) public dimensionRegistered;

    uint256 private _nextTokenId = 1;

    event FanMinted(address indexed user, uint256 indexed tokenId);
    event DimensionRegistered(bytes32 indexed dim);
    event XPRecorded(address indexed user, bytes32 indexed dim, uint64 amount, uint64 newDimTotal, uint64 newGrandTotal);
    event FavoriteTeamsSet(address indexed user, uint16[] teamIds);

    error AlreadyMinted();
    error NotMinted();
    error Soulbound();
    error DimensionUnknown();
    error DimensionAlreadyRegistered();
    error ZeroAmount();
    error XPOverflow();

    /// @dev Favorite teams are profile metadata: stored, emitted, no scoring effect.
    mapping(address user => uint16[]) private _favoriteTeams;

    constructor(address admin) ERC721("Kickoff Fan ID", "FANID") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        // seed the canonical dimensions
        dimensionRegistered[DIM_PREDICTION_ACCURACY] = true;
        dimensionRegistered[DIM_ENGAGEMENT_BREADTH] = true;
        dimensionRegistered[DIM_LONGEVITY] = true;
        dimensionRegistered[DIM_AGENT_LEAGUE] = true;
        dimensionRegistered[DIM_DONOR] = true;
        emit DimensionRegistered(DIM_PREDICTION_ACCURACY);
        emit DimensionRegistered(DIM_ENGAGEMENT_BREADTH);
        emit DimensionRegistered(DIM_LONGEVITY);
        emit DimensionRegistered(DIM_AGENT_LEAGUE);
        emit DimensionRegistered(DIM_DONOR);
    }

    // --- mint ---

    /// @notice Anyone may mint exactly one FanID for themselves. Non-transferable thereafter.
    function mint() external returns (uint256 tokenId) {
        if (_fans[msg.sender].tokenId != 0) revert AlreadyMinted();
        tokenId = _nextTokenId++;
        FanID storage f = _fans[msg.sender];
        f.tokenId = tokenId;
        f.mintedAt = uint64(block.timestamp);
        _safeMint(msg.sender, tokenId);
        emit FanMinted(msg.sender, tokenId);
    }

    /// @notice Profile metadata: which teams the user follows. No scoring effect.
    function setFavoriteTeams(uint16[] calldata teamIds) external {
        if (_fans[msg.sender].tokenId == 0) revert NotMinted();
        _favoriteTeams[msg.sender] = teamIds;
        emit FavoriteTeamsSet(msg.sender, teamIds);
    }

    function favoriteTeamsOf(address user) external view returns (uint16[] memory) {
        return _favoriteTeams[user];
    }

    // --- XP (trusted modules only, append-only) ---

    /// @notice Credit `amount` XP in `dim` to `user`. Append-only; admins cannot override balances.
    ///         Caller must hold XP_RECORDER_ROLE (granted to QuestEngine, AgentLeague, etc.).
    function recordXP(address user, bytes32 dim, uint64 amount) external onlyRole(XP_RECORDER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (!dimensionRegistered[dim]) revert DimensionUnknown();
        FanID storage f = _fans[user];
        if (f.tokenId == 0) revert NotMinted();
        uint64 prev = f.xpByDim[dim];
        uint64 next = prev + amount;
        if (next < prev) revert XPOverflow();
        uint64 prevTotal = f.totalXP;
        uint64 nextTotal = prevTotal + amount;
        if (nextTotal < prevTotal) revert XPOverflow();
        f.xpByDim[dim] = next;
        f.totalXP = nextTotal;
        emit XPRecorded(user, dim, amount, next, nextTotal);
    }

    // --- admin (registers, no balance writes) ---

    /// @notice Register a new XP dimension. Admin only. Append-only — dimensions cannot be removed.
    function registerDimension(bytes32 dim) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (dim == bytes32(0)) revert DimensionUnknown();
        if (dimensionRegistered[dim]) revert DimensionAlreadyRegistered();
        dimensionRegistered[dim] = true;
        emit DimensionRegistered(dim);
    }

    // --- views ---

    /// @notice Canonical composable read surface. Returns total XP plus the dimensions the doc names
    ///         directly so external apps can read them with one call.
    function score(address user)
        external
        view
        returns (uint64 total, uint64 predictionAccuracyBps, uint64 engagementBreadth, uint64 longevityDays)
    {
        FanID storage f = _fans[user];
        total = f.totalXP;
        predictionAccuracyBps = f.xpByDim[DIM_PREDICTION_ACCURACY];
        engagementBreadth = f.xpByDim[DIM_ENGAGEMENT_BREADTH];
        // longevity in days since mint; 0 if not minted
        longevityDays = f.mintedAt == 0 ? 0 : uint64((block.timestamp - f.mintedAt) / 1 days);
    }

    function xpOf(address user, bytes32 dim) external view returns (uint64) {
        return _fans[user].xpByDim[dim];
    }

    function fanIdOf(address user) external view returns (uint256) {
        return _fans[user].tokenId;
    }

    function mintedAt(address user) external view returns (uint64) {
        return _fans[user].mintedAt;
    }

    function hasFanId(address user) external view returns (bool) {
        return _fans[user].tokenId != 0;
    }

    // --- soulbound enforcement ---

    /// @dev OZ v5 ERC-721 routes mint/transfer/burn through `_update`. Allow mint (from==0) and
    ///      burn-from-self (to==0 and caller==owner) only; revert any other movement.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = _ownerOf(tokenId);
        // mint: from == 0
        // burn-from-self: to == 0 AND auth == owner (auth comes from the public entrypoint)
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
