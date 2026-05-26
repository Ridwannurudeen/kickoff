// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";

import {MockUSDC} from "../src/MockUSDC.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {OptimisticOracle} from "../src/OptimisticOracle.sol";

import {FanRep} from "../src/FanRep.sol";
import {QuestEngine} from "../src/QuestEngine.sol";
import {Trophy} from "../src/Trophy.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentLeague} from "../src/AgentLeague.sol";

/// @notice Kickoff v2 deploy: 5 new product contracts + 3 reused primitives (CT, OO, MockUSDC).
/// v2 has no betting surface and no money on outcomes — the MockUSDC is only the OO bond token
/// (with bond amount set to 0; bonds aren't needed for XP-only resolution but the OO constructor
/// requires a non-zero address).
///
/// Run:
///   PRIVATE_KEY=0x.. forge script script/DeployV2.s.sol:DeployV2 \
///       --rpc-url https://testrpc.xlayer.tech/terigon --broadcast
contract DeployV2 is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        uint256 aiChampionTrophyId = vm.envOr("AI_CHAMPION_TROPHY_ID", uint256(1));
        uint64 ooLiveness = uint64(vm.envOr("OO_LIVENESS", uint256(120)));

        vm.startBroadcast(pk);

        // --- reused primitives (generic; not betting-specific in v2 use) ---
        MockUSDC usdc = new MockUSDC(); // bond token for OO; v2 doesn't use it as collateral
        ConditionalTokens ct = new ConditionalTokens("https://kickoff.gudman.xyz/token/{id}", deployer);
        OptimisticOracle oo = new OptimisticOracle(
            address(ct),
            address(usdc),
            0, // bondAmount: zero — v2 has no monetary disputes
            ooLiveness,
            deployer,
            deployer // arbiter = deployer for v1 testnet; rotate to multisig before mainnet
        );

        // Hand the only oracle role to the OO and revoke the deployer's, so the OO is the sole resolver.
        ct.grantRole(ct.ORACLE_ROLE(), address(oo));
        if (!vm.envOr("KEEP_ADMIN_ORACLE", false)) {
            ct.revokeRole(ct.ORACLE_ROLE(), deployer);
        }

        // --- v2 product contracts ---
        FanRep fanRep = new FanRep(deployer);
        QuestEngine questEngine = new QuestEngine(address(fanRep), address(ct), deployer);
        Trophy trophy = new Trophy(
            "https://kickoff.gudman.xyz/trophy/{id}", address(fanRep), address(questEngine), deployer
        );
        AgentRegistry agentRegistry = new AgentRegistry();
        AgentLeague agentLeague = new AgentLeague(
            address(agentRegistry),
            address(questEngine),
            address(ct),
            address(trophy),
            aiChampionTrophyId,
            deployer
        );

        // --- wire roles between v2 contracts ---
        fanRep.grantRole(fanRep.XP_RECORDER_ROLE(), address(questEngine));
        trophy.grantRole(trophy.TROPHY_REGISTRAR_ROLE(), address(agentLeague));

        vm.stopBroadcast();

        // --- summary ---
        console.log("=== Kickoff v2 deploy (X Layer testnet 1952) ===");
        console.log("Deployer        :", deployer);
        console.log("MockUSDC        :", address(usdc));
        console.log("ConditionalToks :", address(ct));
        console.log("OptimisticOracle:", address(oo));
        console.log("FanRep          :", address(fanRep));
        console.log("QuestEngine     :", address(questEngine));
        console.log("Trophy          :", address(trophy));
        console.log("AgentRegistry   :", address(agentRegistry));
        console.log("AgentLeague     :", address(agentLeague));
        console.log("aiChampionTrophy:", aiChampionTrophyId);
        console.log("OO_LIVENESS     :", ooLiveness);
    }
}
