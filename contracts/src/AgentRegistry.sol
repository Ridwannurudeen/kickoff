// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AgentRegistry
/// @notice Permissionless on-chain agent registry. Anyone can register an agent they operate; users
///         pay `priceWei` (in native gas asset — OKB on X Layer) per `callAgent`. The off-chain
///         service watches `Called` events and posts results back via `submitResult`, signed by the
///         agent's wallet. `composeAgents` fans a single tx out to multiple agents in one shot.
/// @dev Funds flow caller → agent wallet directly; the protocol takes zero fee in v1. Design constraint:
///      payments are *fee-for-service*, not stakes against an outcome.
contract AgentRegistry is ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Agent {
        address owner; // who registered (governance/ownership of the listing)
        address agentWallet; // who receives payments + signs results
        uint128 priceWei;
        string endpointHint;
        bool exists;
    }

    enum CallStatus {
        None,
        Pending,
        Replied
    }

    struct CallRecord {
        bytes32 agentId;
        address caller;
        uint256 paid;
        CallStatus status;
    }

    mapping(bytes32 agentId => Agent) private _agents;
    mapping(bytes32 callId => CallRecord) private _calls;
    /// @dev cheap monotonic nonce per caller for unique callIds
    mapping(address => uint64) public callerNonce;

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, address agentWallet, uint128 priceWei);
    event AgentUpdated(bytes32 indexed agentId, address agentWallet, uint128 priceWei, string endpointHint);
    event Called(bytes32 indexed callId, bytes32 indexed agentId, address indexed caller, uint256 paid, bytes payload);
    event Replied(bytes32 indexed callId, bytes32 indexed agentId, bytes result);

    error AgentExists();
    error AgentUnknown();
    error NotAgentOwner();
    error WrongPayment();
    error CallUnknown();
    error AlreadyReplied();
    error BadSignature();
    error ZeroAddr();

    // --- registration (permissionless) ---

    /// @notice Anyone may register a new agent they operate. `agentId` collisions revert.
    function registerAgent(bytes32 agentId, address agentWallet, uint128 priceWei, string calldata endpointHint)
        external
    {
        if (agentId == bytes32(0)) revert AgentUnknown();
        if (agentWallet == address(0)) revert ZeroAddr();
        if (_agents[agentId].exists) revert AgentExists();
        _agents[agentId] = Agent({
            owner: msg.sender, agentWallet: agentWallet, priceWei: priceWei, endpointHint: endpointHint, exists: true
        });
        emit AgentRegistered(agentId, msg.sender, agentWallet, priceWei);
    }

    /// @notice Update mutable fields of an agent listing. Owner only.
    function updateAgent(bytes32 agentId, address agentWallet, uint128 priceWei, string calldata endpointHint)
        external
    {
        Agent storage a = _agents[agentId];
        if (!a.exists) revert AgentUnknown();
        if (a.owner != msg.sender) revert NotAgentOwner();
        if (agentWallet == address(0)) revert ZeroAddr();
        a.agentWallet = agentWallet;
        a.priceWei = priceWei;
        a.endpointHint = endpointHint;
        emit AgentUpdated(agentId, agentWallet, priceWei, endpointHint);
    }

    // --- call / reply ---

    /// @notice Pay an agent for one call. Emits a `Called` event the off-chain service watches.
    function callAgent(bytes32 agentId, bytes calldata payload)
        external
        payable
        nonReentrant
        returns (bytes32 callId)
    {
        Agent storage a = _agents[agentId];
        if (!a.exists) revert AgentUnknown();
        if (msg.value != a.priceWei) revert WrongPayment();

        callId = _mkCallId(msg.sender);
        _calls[callId] = CallRecord({agentId: agentId, caller: msg.sender, paid: msg.value, status: CallStatus.Pending});
        emit Called(callId, agentId, msg.sender, msg.value, payload);

        // forward funds caller -> agent wallet (zero protocol fee)
        if (msg.value > 0) {
            (bool ok,) = a.agentWallet.call{value: msg.value}("");
            require(ok, "pay agent");
        }
    }

    /// @notice Fan a single payload out to multiple agents in one tx. Caller must send the sum of
    ///         each agent's `priceWei` as `msg.value`.
    function composeAgents(bytes32[] calldata agentIds, bytes calldata payload)
        external
        payable
        nonReentrant
        returns (bytes32[] memory callIds)
    {
        uint256 n = agentIds.length;
        require(n > 0, "empty");
        callIds = new bytes32[](n);
        uint256 totalPrice;
        // pre-sum to avoid partial state if msg.value is short
        for (uint256 i = 0; i < n; ++i) {
            Agent storage a = _agents[agentIds[i]];
            if (!a.exists) revert AgentUnknown();
            totalPrice += a.priceWei;
        }
        if (msg.value != totalPrice) revert WrongPayment();

        for (uint256 i = 0; i < n; ++i) {
            Agent storage a = _agents[agentIds[i]];
            bytes32 callId = _mkCallId(msg.sender);
            _calls[callId] = CallRecord({
                agentId: agentIds[i], caller: msg.sender, paid: a.priceWei, status: CallStatus.Pending
            });
            callIds[i] = callId;
            emit Called(callId, agentIds[i], msg.sender, a.priceWei, payload);
            if (a.priceWei > 0) {
                (bool ok,) = a.agentWallet.call{value: a.priceWei}("");
                require(ok, "pay agent");
            }
        }
    }

    /// @notice Agent posts its result, signed by `agentWallet`. The signature binds
    ///         {address(this), chainid, callId, keccak256(result)} to prevent replay.
    function submitResult(bytes32 callId, bytes calldata result, bytes calldata signature) external {
        CallRecord storage rec = _calls[callId];
        if (rec.status == CallStatus.None) revert CallUnknown();
        if (rec.status == CallStatus.Replied) revert AlreadyReplied();
        Agent storage a = _agents[rec.agentId];

        bytes32 digest = keccak256(
            abi.encode(address(this), block.chainid, callId, keccak256(result))
        ).toEthSignedMessageHash();
        address recovered = digest.recover(signature);
        if (recovered != a.agentWallet) revert BadSignature();

        rec.status = CallStatus.Replied;
        emit Replied(callId, rec.agentId, result);
    }

    // --- views ---

    function getAgent(bytes32 agentId)
        external
        view
        returns (address owner, address agentWallet, uint128 priceWei, string memory endpointHint, bool exists)
    {
        Agent storage a = _agents[agentId];
        return (a.owner, a.agentWallet, a.priceWei, a.endpointHint, a.exists);
    }

    function getCall(bytes32 callId)
        external
        view
        returns (bytes32 agentId, address caller, uint256 paid, uint8 status)
    {
        CallRecord storage r = _calls[callId];
        return (r.agentId, r.caller, r.paid, uint8(r.status));
    }

    function _mkCallId(address caller) internal returns (bytes32) {
        uint64 nonce = ++callerNonce[caller];
        return keccak256(abi.encode(address(this), block.chainid, caller, nonce, block.number));
    }
}
