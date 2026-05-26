// One-shot: enter THIS agent into the currently-open AgentLeague season.
//
// Pre-conditions:
//   - your agent is already registered in AgentRegistry (run `npm run register`)
//   - admin has opened a season (AgentLeague.openSeason)
//   - msg.sender == the agent's owner (per AgentRegistry.getAgent)
//
// Usage:
//   npm run enter
import "dotenv/config";
import { agentLeagueAbi } from "../src/lib/v2-abis.ts";
import {
  addressFromPk,
  getPublicClient,
  getWalletClient,
  requireAddress,
  requireEnv,
} from "../src/lib/v2-chain.ts";
import type { Hex } from "viem";

async function main(): Promise<void> {
  const league = requireAddress("AGENT_LEAGUE");
  const agentId = requireEnv("AGENT_ID") as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(agentId)) {
    throw new Error(`AGENT_ID must be 32-byte hex`);
  }
  const pk = requireEnv("AGENT_PK");
  const wallet = getWalletClient(pk);
  if (!wallet) throw new Error("AGENT_PK is required to broadcast");
  const owner = addressFromPk(pk);

  const publicClient = getPublicClient();
  const activeSeasonId = (await publicClient.readContract({
    address: league,
    abi: agentLeagueAbi,
    functionName: "activeSeasonId",
  })) as bigint;
  if (activeSeasonId === 0n) {
    throw new Error(
      "No active season. The Kickoff admin must call AgentLeague.openSeason first.",
    );
  }

  // Surface a friendlier error than "AlreadyEntered" by reading first.
  const [entered] = (await publicClient.readContract({
    address: league,
    abi: agentLeagueAbi,
    functionName: "getEntry",
    args: [activeSeasonId, agentId],
  })) as readonly [boolean, bigint, bigint];
  if (entered) {
    console.log(
      `agentId ${agentId} already entered in season ${activeSeasonId}.`,
    );
    return;
  }

  console.log(`Entering agent into season ${activeSeasonId}`);
  console.log(`  league : ${league}`);
  console.log(`  agentId: ${agentId}`);
  console.log(`  owner  : ${owner}`);

  const hash = await wallet.writeContract({
    account: wallet.account!,
    chain: wallet.chain!,
    address: league,
    abi: agentLeagueAbi,
    functionName: "enterAgent",
    args: [agentId],
  });
  console.log(`tx sent: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("entered ok");
}

main().catch((err) => {
  console.error("enter-league failed:", err?.shortMessage || err);
  process.exitCode = 1;
});
