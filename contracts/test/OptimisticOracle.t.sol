// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {OptimisticOracle} from "../src/OptimisticOracle.sol";

contract OptimisticOracleTest is Test {
    MockUSDC usdc;
    ConditionalTokens ct;
    OptimisticOracle oo;

    address arbiter = makeAddr("arbiter");
    address proposer = makeAddr("proposer");
    address disputer = makeAddr("disputer");

    uint256 constant BOND = 100e6;
    uint64 constant LIVENESS = 2 hours;
    bytes32 conditionId;

    function setUp() public {
        usdc = new MockUSDC();
        ct = new ConditionalTokens("uri", address(this));
        oo = new OptimisticOracle(address(ct), address(usdc), BOND, LIVENESS, address(this), arbiter);
        // the oracle must be able to write results
        ct.grantRole(ct.ORACLE_ROLE(), address(oo));

        conditionId = ct.prepareCondition(address(usdc), keccak256("q"), 2);

        usdc.mint(proposer, 1_000e6);
        usdc.mint(disputer, 1_000e6);
        vm.prank(proposer);
        usdc.approve(address(oo), type(uint256).max);
        vm.prank(disputer);
        usdc.approve(address(oo), type(uint256).max);
    }

    function _payouts(uint256 a, uint256 b) internal pure returns (uint256[] memory p) {
        p = new uint256[](2);
        p[0] = a;
        p[1] = b;
    }

    function _propose(address who, uint256[] memory p) internal {
        vm.prank(who);
        oo.propose(conditionId, p);
    }

    // ------------------------------------------------------------- happy path

    function test_propose_settle_undisputed() public {
        _propose(proposer, _payouts(1, 0));
        assertEq(usdc.balanceOf(proposer), 900e6, "bond escrowed");

        vm.warp(block.timestamp + LIVENESS);
        oo.settle(conditionId);

        assertEq(ct.conditionStatus(conditionId), 2, "condition resolved");
        uint256[] memory nums = ct.payoutNumerators(conditionId);
        assertEq(nums[0], 1);
        assertEq(nums[1], 0);
        assertEq(usdc.balanceOf(proposer), 1_000e6, "bond refunded");
    }

    function test_dispute_resolve_proposerWins() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(disputer);
        oo.dispute(conditionId);
        assertEq(usdc.balanceOf(disputer), 900e6, "disputer bond escrowed");

        vm.prank(arbiter);
        oo.resolveDispute(conditionId, _payouts(1, 0)); // matches proposal -> proposer wins

        assertEq(ct.conditionStatus(conditionId), 2);
        assertEq(usdc.balanceOf(proposer), 1_100e6, "proposer wins both bonds");
        assertEq(usdc.balanceOf(disputer), 900e6, "disputer loses bond");
    }

    function test_dispute_resolve_disputerWins() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(disputer);
        oo.dispute(conditionId);

        vm.prank(arbiter);
        oo.resolveDispute(conditionId, _payouts(0, 1)); // differs from proposal -> disputer wins

        uint256[] memory nums = ct.payoutNumerators(conditionId);
        assertEq(nums[1], 1, "arbiter's result written");
        assertEq(usdc.balanceOf(disputer), 1_100e6, "disputer wins both bonds");
        assertEq(usdc.balanceOf(proposer), 900e6, "proposer loses bond");
    }

    // ------------------------------------------------------------- guards

    function test_settle_revertsBeforeLiveness() public {
        _propose(proposer, _payouts(1, 0));
        vm.expectRevert(bytes("too early"));
        oo.settle(conditionId);
    }

    function test_dispute_revertsAfterWindow() public {
        _propose(proposer, _payouts(1, 0));
        vm.warp(block.timestamp + LIVENESS);
        vm.prank(disputer);
        vm.expectRevert(bytes("window over"));
        oo.dispute(conditionId);
    }

    function test_settle_revertsIfDisputed() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(disputer);
        oo.dispute(conditionId);
        vm.warp(block.timestamp + LIVENESS);
        vm.expectRevert(bytes("not settleable"));
        oo.settle(conditionId);
    }

    function test_propose_revertsOnNonOpenCondition() public {
        bytes32 c2 = ct.prepareCondition(address(usdc), keccak256("q2"), 2);
        ct.reportPayouts(c2, _payouts(1, 0)); // resolved directly by admin (has ORACLE_ROLE)
        vm.prank(proposer);
        vm.expectRevert(bytes("not open"));
        oo.propose(c2, _payouts(1, 0));
    }

    function test_propose_revertsDuplicate() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(proposer);
        vm.expectRevert(bytes("exists"));
        oo.propose(conditionId, _payouts(0, 1));
    }

    function test_propose_revertsBadPayouts() public {
        uint256[] memory three = new uint256[](3);
        three[0] = 1;
        vm.prank(proposer);
        vm.expectRevert(bytes("bad length"));
        oo.propose(conditionId, three);

        vm.prank(proposer);
        vm.expectRevert(bytes("all zero"));
        oo.propose(conditionId, _payouts(0, 0));
    }

    function test_dispute_revertsIfNotProposed() public {
        vm.prank(disputer);
        vm.expectRevert(bytes("not proposed"));
        oo.dispute(conditionId);
    }

    function test_cancelProposal_refundsAfterVoid() public {
        _propose(proposer, _payouts(1, 0));
        assertEq(usdc.balanceOf(proposer), 900e6);
        ct.voidCondition(conditionId); // condition no longer Open
        oo.cancelProposal(conditionId);
        assertEq(usdc.balanceOf(proposer), 1_000e6, "proposer bond refunded");
    }

    function test_cancelProposal_disputed_refundsBoth() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(disputer);
        oo.dispute(conditionId);
        ct.voidCondition(conditionId);
        oo.cancelProposal(conditionId);
        assertEq(usdc.balanceOf(proposer), 1_000e6, "proposer refunded");
        assertEq(usdc.balanceOf(disputer), 1_000e6, "disputer refunded");
    }

    function test_cancelProposal_revertsWhileOpen() public {
        _propose(proposer, _payouts(1, 0));
        vm.expectRevert(bytes("still resolvable"));
        oo.cancelProposal(conditionId);
    }

    function test_resolveDispute_onlyArbiter() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(disputer);
        oo.dispute(conditionId);
        bytes32 role = oo.ARBITER_ROLE();
        vm.prank(proposer);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, proposer, role)
        );
        oo.resolveDispute(conditionId, _payouts(1, 0));
    }

    // ------------------------------------------------------------- snapshot hardening (H-1/H-2/M-A)

    function test_snapshot_bondNotAffectedBySetParams() public {
        _propose(proposer, _payouts(1, 0)); // posts the 100 snapshot bond
        oo.setParams(200e6, LIVENESS); // raise the GLOBAL bond mid-flight
        vm.warp(block.timestamp + LIVENESS);
        oo.settle(conditionId);
        assertEq(usdc.balanceOf(proposer), 1_000e6, "refund uses the snapshot bond, not the new global");
        assertEq(usdc.balanceOf(address(oo)), 0, "no bond deficit or surplus");
    }

    function test_snapshot_windowNotShortenedBySetParams() public {
        _propose(proposer, _payouts(1, 0)); // deadline snapshot = now + 2h
        vm.warp(block.timestamp + 1 hours);
        oo.setParams(BOND, 1 hours); // shorten the GLOBAL liveness
        vm.prank(disputer);
        oo.dispute(conditionId); // still inside the ORIGINAL window -> must succeed
        (,,, uint8 status,) = oo.getProposal(conditionId);
        assertEq(status, 2, "disputed; snapshot deadline honored, not the new global");
    }

    function test_cancelProposal_arbiterTimeout_refundsAndResets() public {
        _propose(proposer, _payouts(1, 0));
        vm.prank(disputer);
        oo.dispute(conditionId);
        vm.warp(block.timestamp + oo.arbitrationWindow() + 1);
        oo.cancelProposal(conditionId); // arbiter never ruled
        assertEq(usdc.balanceOf(proposer), 1_000e6, "proposer refunded");
        assertEq(usdc.balanceOf(disputer), 1_000e6, "disputer refunded");
        _propose(proposer, _payouts(0, 1)); // proposal reset -> can re-propose, no revert
    }

    function test_setParams_onlyAdmin() public {
        oo.setParams(50e6, 1 hours);
        assertEq(oo.bondAmount(), 50e6);
        assertEq(oo.liveness(), 1 hours);
        vm.prank(proposer);
        vm.expectRevert();
        oo.setParams(0, 1);
    }
}
