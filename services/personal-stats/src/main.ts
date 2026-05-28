// personal-stats: reads `FanRep.score()` for the caller and returns a short text
// brief — total XP, prediction accuracy, engagement breadth, longevity, and a
// recommended next quest.
//
// Listens for `Called` events on its agent in `AgentRegistry`, decodes the
// payload as an `address user`, calls `FanRep.score(user)`, formats the output,
// and submits a signed result.
//
// Payload format (ABI-encoded): (address user)
//   web/companion sends `encodeAbiParameters([{type:'address'}], [caller])`.
//   The caller is the wallet whose Fan ID we want to read — usually the caller
//   of `AgentRegistry.callAgent`, but parameterised so the same agent can be
//   used to look up *any* address's public score.
import "dotenv/config";
import { decodeAbiParameters, getAddress, isAddress, type Hex } from "viem";
import {
  runAgent,
  type AgentContext,
  type CalledEvent,
} from "./lib/agent-runner.ts";
import { runLLM } from "./lib/llm.ts";
import { fanRepAbi } from "./lib/v2-abis.ts";
import { requireAddress } from "./lib/v2-chain.ts";

type Score = {
  total: bigint;
  predictionAccuracyBps: bigint;
  engagementBreadth: bigint;
  longevityDays: bigint;
};

function decodePayload(payload: Hex): `0x${string}` | null {
  try {
    const [user] = decodeAbiParameters([{ type: "address" }], payload) as [
      `0x${string}`,
    ];
    return isAddress(user) ? getAddress(user) : null;
  } catch {
    return null;
  }
}

function recommendNextQuest(score: Score): string {
  // Deterministic, no randomness. Order is by what most accelerates a balanced
  // multi-dimensional Fan Rep — accuracy first (it's the highest-signal dim),
  // then breadth, then longevity, then the on-ramp if nothing is set yet.
  if (score.total === 0n) {
    return "Mint your Fan ID, then attest to today's match-day quest — the on-ramp.";
  }
  if (score.predictionAccuracyBps < 2000n) {
    return "Commit a prediction on tonight's PREDICTION-type quest to start the accuracy dimension.";
  }
  if (score.engagementBreadth < 200n) {
    return "Try a different quest type — daily fact or share-a-post — to broaden engagement.";
  }
  if (score.longevityDays < 7n) {
    return "Keep showing up: match-day attest on consecutive days unlocks the longevity dimension.";
  }
  return "You're balanced. The Group Stage Survivor and Pollster trophies are within reach.";
}

function offlineStub(user: string): string {
  return [
    `Personal stats for ${user}:`,
    `(OFFLINE_MODE stub — deterministic output, no chain read.)`,
    `Total XP: 0  |  Prediction accuracy: 0 bps  |  Breadth: 0  |  Longevity: 0d`,
    `Recommended: Mint your Fan ID, then attest to today's match-day quest.`,
  ].join("\n");
}

function formatBrief(user: string, score: Score, narrative?: string): string {
  const lines = [
    `Personal stats for ${user}:`,
    `Total XP: ${score.total}`,
    `Prediction accuracy: ${score.predictionAccuracyBps} bps`,
    `Engagement breadth: ${score.engagementBreadth}`,
    `Longevity: ${score.longevityDays} day(s) since Fan ID mint`,
    `Recommended next quest: ${recommendNextQuest(score)}`,
  ];
  if (narrative) lines.push("", narrative);
  return lines.join("\n");
}

async function handle(ev: CalledEvent, ctx: AgentContext): Promise<string> {
  const user = decodePayload(ev.payload);
  if (!user) {
    return "Could not decode payload — expected ABI-encoded (address user).";
  }
  if (ctx.offline) {
    return offlineStub(user);
  }

  const fanRep = requireAddress("FAN_REP");
  const raw = (await ctx.publicClient.readContract({
    address: fanRep,
    abi: fanRepAbi,
    functionName: "score",
    args: [user],
  })) as readonly [bigint, bigint, bigint, bigint];
  const score: Score = {
    total: raw[0],
    predictionAccuracyBps: raw[1],
    engagementBreadth: raw[2],
    longevityDays: raw[3],
  };

  // If there's no LLM key, we still return a fully-formed, deterministic brief.
  // With a key, we ask for a short coaching line tacked onto the deterministic
  // numbers — no fabrication of the stats themselves.
  let narrative: string | undefined;
  if (process.env.LLM_API_KEY) {
    try {
      narrative = await runLLM({
        system:
          "You are the Kickoff personal-stats coach. In <= 3 short lines, write a " +
          "friendly note that interprets the given Fan Rep stats and the " +
          "recommended next quest. Do NOT restate the numbers. No betting talk.",
        user:
          `User: ${user}\n` +
          `Stats: total=${score.total}, accuracyBps=${score.predictionAccuracyBps}, ` +
          `breadth=${score.engagementBreadth}, longevityDays=${score.longevityDays}\n` +
          `Next: ${recommendNextQuest(score)}`,
        maxTokens: 256,
      });
    } catch (err) {
      const msg = (err as { shortMessage?: string })?.shortMessage ?? String(err).slice(0, 300);
      console.warn(`[personal-stats] LLM call failed — returning numbers-only brief: ${msg}`);
    }
  }

  return formatBrief(user, score, narrative);
}

void runAgent({ serviceName: "personal-stats", handle });
