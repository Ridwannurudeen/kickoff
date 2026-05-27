// highlights: post-match condensed plain-text summary.
//
// Listens for `Called` events on its agent in `AgentRegistry`. The payload
// carries the basic facts of a finished match (teams + final score + optional
// scorers blob). The service asks the LLM for a tight, factual summary; if
// there's no LLM key it falls back to a deterministic skeleton built from the
// payload alone — no fabricated highlights ever.
//
// Payload format (ABI-encoded):
//   (string homeTeam, string awayTeam, uint8 homeGoals, uint8 awayGoals, string notes)
//   web/companion encodes this with `encodeAbiParameters([...], [...])`.
import "dotenv/config";
import { decodeAbiParameters, type Hex } from "viem";
import { runAgent, type CalledEvent } from "./lib/agent-runner.ts";
import { runLLM } from "./lib/llm.ts";

type Decoded = {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  notes: string;
};

function decodePayload(payload: Hex): Decoded | null {
  try {
    const [home, away, hg, ag, notes] = decodeAbiParameters(
      [
        { type: "string" },
        { type: "string" },
        { type: "uint8" },
        { type: "uint8" },
        { type: "string" },
      ],
      payload,
    ) as [string, string, number, number, string];
    if (!home || !away) return null;
    return {
      home,
      away,
      homeGoals: Number(hg),
      awayGoals: Number(ag),
      notes: notes ?? "",
    };
  } catch {
    return null;
  }
}

function verdict(d: Decoded): string {
  if (d.homeGoals > d.awayGoals) return `${d.home} won.`;
  if (d.homeGoals < d.awayGoals) return `${d.away} won.`;
  return "Draw.";
}

function deterministicSummary(d: Decoded): string {
  const lines = [
    `Final: ${d.home} ${d.homeGoals} - ${d.awayGoals} ${d.away}.`,
    verdict(d),
  ];
  if (d.notes.trim()) lines.push(`Notes: ${d.notes.trim()}`);
  lines.push(
    "(Deterministic fallback: this service has no LLM key configured. " +
      "Output is built from the payload only — no fabricated highlights.)",
  );
  return lines.join("\n");
}

function offlineStub(d: Decoded): string {
  return [
    `Highlights (OFFLINE_MODE stub):`,
    `Final: ${d.home} ${d.homeGoals} - ${d.awayGoals} ${d.away}.`,
    verdict(d),
    "No LLM call made; no chain submission made.",
  ].join("\n");
}

async function handle(ev: CalledEvent): Promise<string> {
  const d = decodePayload(ev.payload);
  if (!d) {
    return (
      "Could not decode payload — expected ABI-encoded " +
      "(string homeTeam, string awayTeam, uint8 homeGoals, uint8 awayGoals, string notes)."
    );
  }
  if (process.env.OFFLINE_MODE === "1" || process.env.OFFLINE_MODE === "true") {
    return offlineStub(d);
  }
  if (!process.env.LLM_API_KEY) {
    return deterministicSummary(d);
  }
  try {
    return await runLLM({
      system:
        "You are the Kickoff highlights writer. In <= 6 short lines, write a " +
        "factual post-match summary using only the supplied final score and notes. " +
        "Do NOT invent goal scorers, minutes, or events not present in the notes. " +
        "If notes are empty, say so explicitly. No betting talk.",
      user:
        `Match: ${d.home} ${d.homeGoals} - ${d.awayGoals} ${d.away}\n` +
        `Notes (may be empty): ${d.notes}`,
      maxTokens: 384,
    });
  } catch (err) {
    console.warn(
      "[highlights] LLM call failed — returning deterministic summary:",
      err,
    );
    return deterministicSummary(d);
  }
}

void runAgent({ serviceName: "highlights", handle });
