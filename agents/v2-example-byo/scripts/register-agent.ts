// One-shot: register THIS BYO agent in the on-chain AgentRegistry.
//
// You only run this once per agentId. After that, your agent listing is
// public — anyone can `callAgent(agentId, payload)` your bytes32 and pay
// `PRICE_WEI` of OKB per call. For the BYO league example we default
// PRICE_WEI=0 so callers don't have to fund anything; the agent owner can
// still update later via AgentRegistry.updateAgent.
//
// Usage:
//   cp env-example .env  &&  fill in
//   npm run register
import "dotenv/config";
import { agentRegistryAbi } from "../src/lib/v2-abis.ts";
import {
  addressFromPk,
  getPublicClient,
  getWalletClient,
  requireAddress,
  requireEnv,
} from "../src/lib/v2-chain.ts";
import type { Hex } from "viem";

async function main(): Promise<void> {
  const registry = requireAddress("AGENT_REGISTRY");
  const agentId = requireEnv("AGENT_ID") as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(agentId)) {
    throw new Error(
      `AGENT_ID must be 32-byte hex (got ${agentId.slice(0, 10)}…). Try: keccak256(utf8("my-handle.predictor.v1"))`,
    );
  }
  const pk = requireEnv("AGENT_PK");
  const wallet = getWalletClient(pk);
  if (!wallet) throw new Error("AGENT_PK is required to broadcast");
  const owner = addressFromPk(pk);
  if (!owner) throw new Error("AGENT_PK invalid");

  const priceWei = BigInt(process.env.PRICE_WEI ?? "0");
  const endpointHint = process.env.ENDPOINT_HINT ?? "byo-example";
  const publicClient = getPublicClient();

  // Pre-flight: if this agentId is already registered, surface that rather than
  // burn gas on a guaranteed revert.
  const existing = (await publicClient.readContract({
    address: registry,
    abi: agentRegistryAbi,
    functionName: "getAgent",
    args: [agentId],
  })) as readonly [`0x${string}`, `0x${string}`, bigint, string, boolean];
  if (existing[4]) {
    console.log(`agentId ${agentId} already registered:`);
    console.log(`  owner       : ${existing[0]}`);
    console.log(`  agentWallet : ${existing[1]}`);
    console.log(`  priceWei    : ${existing[2]}`);
    console.log(`  endpointHint: ${existing[3]}`);
    console.log("Nothing to do.");
    return;
  }

  console.log(
    `Registering agent on ${publicClient.chain?.name} (chainId ${publicClient.chain?.id})`,
  );
  console.log(`  registry     : ${registry}`);
  console.log(`  agentId      : ${agentId}`);
  console.log(`  owner+wallet : ${owner} (same address, simplest setup)`);
  console.log(`  priceWei     : ${priceWei}`);
  console.log(`  endpointHint : ${endpointHint}`);

  const hash = await wallet.writeContract({
    account: wallet.account!,
    chain: wallet.chain!,
    address: registry,
    abi: agentRegistryAbi,
    functionName: "registerAgent",
    args: [agentId, owner, priceWei, endpointHint],
  });
  console.log(`tx sent: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("registered ok");
}

main().catch((err) => {
  console.error("register-agent failed:", err?.shortMessage || err);
  process.exitCode = 1;
});
