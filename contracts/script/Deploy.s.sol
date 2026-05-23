// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ConditionalTokens} from "../src/ConditionalTokens.sol";
import {FixedProductMarketMaker} from "../src/FixedProductMarketMaker.sol";
import {MarketMakerFactory} from "../src/MarketMakerFactory.sol";
import {OptimisticOracle} from "../src/OptimisticOracle.sol";
import {ParlayBook} from "../src/ParlayBook.sol";

/// @notice Deploys the Kickoff stack (categorical AMM + funded LP + optimistic oracle + parlays) to X Layer.
/// Env: PRIVATE_KEY (required); ORACLE_ADDRESS / ARBITER_ADDRESS (default deployer); FEE_BPS (200);
///      BOND_AMOUNT (10e6); OO_LIVENESS (7200); MAX_EXPOSURE_BPS (1000); USDC_ADDRESS (unset => MockUSDC);
///      KEEP_ADMIN_ORACLE (false => revoke deployer's direct ORACLE_ROLE so the oracle is the sole resolver).
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address oracle = vm.envOr("ORACLE_ADDRESS", deployer);

        vm.startBroadcast(pk);

        address usdc = vm.envOr("USDC_ADDRESS", address(0));
        if (usdc == address(0)) usdc = address(new MockUSDC());

        ConditionalTokens ct = new ConditionalTokens("https://kickoff.gudman.xyz/token/{id}", deployer);
        MarketMakerFactory factory = new MarketMakerFactory(
            address(ct), address(new FixedProductMarketMaker()), vm.envOr("FEE_BPS", uint256(200)), deployer
        );
        OptimisticOracle oo = new OptimisticOracle(
            address(ct),
            usdc,
            vm.envOr("BOND_AMOUNT", uint256(10e6)),
            uint64(vm.envOr("OO_LIVENESS", uint256(7200))),
            deployer,
            vm.envOr("ARBITER_ADDRESS", deployer)
        );
        ct.grantRole(ct.ORACLE_ROLE(), address(oo)); // the optimistic oracle is the resolver
        if (oracle != deployer) ct.grantRole(ct.ORACLE_ROLE(), oracle);
        // Production-safe default: oracle is the ONLY resolution path (deployer can't override).
        if (!vm.envOr("KEEP_ADMIN_ORACLE", false)) ct.revokeRole(ct.ORACLE_ROLE(), deployer);

        ParlayBook parlay = new ParlayBook(
            usdc,
            address(ct),
            address(factory),
            vm.envOr("MAX_EXPOSURE_BPS", uint256(1000)),
            vm.envOr("MIN_LIQUIDITY", uint256(100e6)),
            deployer
        );

        vm.stopBroadcast();

        console2.log("== Kickoff deployment ==");
        console2.log("Collateral (USDC) :", usdc);
        console2.log("ConditionalTokens :", address(ct));
        console2.log("MarketMakerFactory:", address(factory));
        console2.log("OptimisticOracle  :", address(oo));
        console2.log("ParlayBook        :", address(parlay));
        console2.log("Admin/deployer    :", deployer);
    }
}
