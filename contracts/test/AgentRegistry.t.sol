// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry reg;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 agentKey = 0xBEEF;
    address agentWallet;

    bytes32 constant A1 = keccak256("match-analyst");
    bytes32 constant A2 = keccak256("personal-stats");

    receive() external payable {}

    function setUp() public {
        agentWallet = vm.addr(agentKey);
        reg = new AgentRegistry();
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _register(address owner, bytes32 id, uint128 price) internal {
        vm.prank(owner);
        reg.registerAgent(id, agentWallet, price, "https://x.example/agent");
    }

    function _sign(bytes32 callId, bytes memory result) internal view returns (bytes memory sig) {
        bytes32 digest = keccak256(abi.encode(address(reg), block.chainid, callId, keccak256(result)));
        bytes32 ethDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentKey, ethDigest);
        sig = abi.encodePacked(r, s, v);
    }

    // --- registration ---

    function test_register_storesAgent() public {
        _register(alice, A1, 1 ether);
        (address owner, address wallet_, uint128 price, string memory hint, bool exists) = reg.getAgent(A1);
        assertEq(owner, alice);
        assertEq(wallet_, agentWallet);
        assertEq(price, 1 ether);
        assertEq(hint, "https://x.example/agent");
        assertTrue(exists);
    }

    function test_register_emits() public {
        vm.expectEmit(true, true, false, true);
        emit AgentRegistry.AgentRegistered(A1, alice, agentWallet, 0.1 ether);
        _register(alice, A1, 0.1 ether);
    }

    function test_register_revertsOnZeroId() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.AgentUnknown.selector);
        reg.registerAgent(bytes32(0), agentWallet, 0, "x");
    }

    function test_register_revertsOnZeroWallet() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.ZeroAddr.selector);
        reg.registerAgent(A1, address(0), 0, "x");
    }

    function test_register_revertsOnDuplicateId() public {
        _register(alice, A1, 0);
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.AgentExists.selector);
        reg.registerAgent(A1, agentWallet, 0, "x");
    }

    function test_register_permissionless_anyoneCanRegister() public {
        _register(bob, A1, 0);
        (address owner,,,,) = reg.getAgent(A1);
        assertEq(owner, bob);
    }

    // --- update ---

    function test_updateAgent_changesFields() public {
        _register(alice, A1, 1 ether);
        address newWallet = makeAddr("newWallet");
        vm.prank(alice);
        reg.updateAgent(A1, newWallet, 2 ether, "new-endpoint");
        (, address wallet_, uint128 price, string memory hint,) = reg.getAgent(A1);
        assertEq(wallet_, newWallet);
        assertEq(price, 2 ether);
        assertEq(hint, "new-endpoint");
    }

    function test_updateAgent_revertsForNonOwner() public {
        _register(alice, A1, 1 ether);
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.NotAgentOwner.selector);
        reg.updateAgent(A1, agentWallet, 0, "x");
    }

    function test_updateAgent_revertsOnUnknownAgent() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.AgentUnknown.selector);
        reg.updateAgent(A1, agentWallet, 0, "x");
    }

    function test_updateAgent_revertsOnZeroWallet() public {
        _register(alice, A1, 0);
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.ZeroAddr.selector);
        reg.updateAgent(A1, address(0), 0, "x");
    }

    // --- call ---

    function test_callAgent_paysAgentWallet() public {
        _register(alice, A1, 0.1 ether);
        uint256 walletBefore = agentWallet.balance;
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0.1 ether}(A1, "hello");
        assertEq(agentWallet.balance - walletBefore, 0.1 ether);
        (bytes32 agId, address caller, uint256 paid, uint8 status) = reg.getCall(callId);
        assertEq(agId, A1);
        assertEq(caller, bob);
        assertEq(paid, 0.1 ether);
        assertEq(status, 1); // Pending
    }

    function test_callAgent_emitsCalled() public {
        _register(alice, A1, 0.1 ether);
        vm.recordLogs();
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0.1 ether}(A1, "ping");
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < entries.length; ++i) {
            if (entries[i].topics[0] == keccak256("Called(bytes32,bytes32,address,uint256,bytes)")) {
                assertEq(entries[i].topics[1], callId);
                assertEq(entries[i].topics[2], A1);
                found = true;
            }
        }
        assertTrue(found);
    }

    function test_callAgent_revertsOnWrongPayment() public {
        _register(alice, A1, 0.1 ether);
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.WrongPayment.selector);
        reg.callAgent{value: 0.05 ether}(A1, "x");
    }

    function test_callAgent_revertsOnUnknownAgent() public {
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.AgentUnknown.selector);
        reg.callAgent{value: 0}(A1, "x");
    }

    function test_callAgent_zeroPriceWorks() public {
        _register(alice, A1, 0);
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0}(A1, "free");
        (,, uint256 paid,) = reg.getCall(callId);
        assertEq(paid, 0);
    }

    function test_callAgent_callIdsAreUnique() public {
        _register(alice, A1, 0);
        vm.prank(bob);
        bytes32 c1 = reg.callAgent{value: 0}(A1, "a");
        vm.prank(bob);
        bytes32 c2 = reg.callAgent{value: 0}(A1, "b");
        assertTrue(c1 != c2);
    }

    // --- compose ---

    function test_composeAgents_paysEach() public {
        _register(alice, A1, 0.1 ether);
        // second agent with a different wallet
        uint256 k2 = 0xCAFE;
        address w2 = vm.addr(k2);
        vm.prank(alice);
        reg.registerAgent(A2, w2, 0.2 ether, "x");

        uint256 w1Before = agentWallet.balance;
        uint256 w2Before = w2.balance;
        bytes32[] memory ids = new bytes32[](2);
        ids[0] = A1; ids[1] = A2;
        vm.prank(bob);
        bytes32[] memory callIds = reg.composeAgents{value: 0.3 ether}(ids, "payload");
        assertEq(callIds.length, 2);
        assertEq(agentWallet.balance - w1Before, 0.1 ether);
        assertEq(w2.balance - w2Before, 0.2 ether);
    }

    function test_composeAgents_revertsOnWrongSum() public {
        _register(alice, A1, 0.1 ether);
        vm.prank(alice);
        reg.registerAgent(A2, agentWallet, 0.2 ether, "x");
        bytes32[] memory ids = new bytes32[](2);
        ids[0] = A1; ids[1] = A2;
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.WrongPayment.selector);
        reg.composeAgents{value: 0.25 ether}(ids, "x");
    }

    function test_composeAgents_revertsOnEmpty() public {
        bytes32[] memory ids = new bytes32[](0);
        vm.prank(bob);
        vm.expectRevert(bytes("empty"));
        reg.composeAgents{value: 0}(ids, "x");
    }

    function test_composeAgents_revertsOnUnknownAgent() public {
        _register(alice, A1, 0.1 ether);
        bytes32[] memory ids = new bytes32[](2);
        ids[0] = A1; ids[1] = keccak256("does-not-exist");
        vm.prank(bob);
        vm.expectRevert(AgentRegistry.AgentUnknown.selector);
        reg.composeAgents{value: 0.1 ether}(ids, "x");
    }

    // --- submit result ---

    function test_submitResult_marksReplied() public {
        _register(alice, A1, 0.1 ether);
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0.1 ether}(A1, "ping");
        bytes memory result = "ok";
        bytes memory sig = _sign(callId, result);
        vm.expectEmit(true, true, false, true);
        emit AgentRegistry.Replied(callId, A1, result);
        reg.submitResult(callId, result, sig);
        (,,, uint8 status) = reg.getCall(callId);
        assertEq(status, 2);
    }

    function test_submitResult_revertsOnDoubleReply() public {
        _register(alice, A1, 0);
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0}(A1, "x");
        bytes memory result = "r";
        bytes memory sig = _sign(callId, result);
        reg.submitResult(callId, result, sig);
        vm.expectRevert(AgentRegistry.AlreadyReplied.selector);
        reg.submitResult(callId, result, sig);
    }

    function test_submitResult_revertsOnUnknownCall() public {
        bytes32 fakeId = keccak256("fake");
        vm.expectRevert(AgentRegistry.CallUnknown.selector);
        reg.submitResult(fakeId, "x", hex"00");
    }

    function test_submitResult_revertsOnBadSignature() public {
        _register(alice, A1, 0);
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0}(A1, "x");
        // sign with wrong key
        uint256 wrongKey = 0xDEAD;
        bytes32 digest = keccak256(abi.encode(address(reg), block.chainid, callId, keccak256(bytes("r"))));
        bytes32 ethDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethDigest);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.expectRevert(AgentRegistry.BadSignature.selector);
        reg.submitResult(callId, "r", sig);
    }

    function test_submitResult_revertsIfResultMismatched() public {
        _register(alice, A1, 0);
        vm.prank(bob);
        bytes32 callId = reg.callAgent{value: 0}(A1, "x");
        // sign for "expected" but submit "tampered"
        bytes memory sig = _sign(callId, "expected");
        vm.expectRevert(AgentRegistry.BadSignature.selector);
        reg.submitResult(callId, "tampered", sig);
    }
}

