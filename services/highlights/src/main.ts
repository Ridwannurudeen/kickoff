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
import { decodeAbiParameters, hexToString, type Hex } from "viem";
import { runAgent, type CalledEvent } from "./lib/agent-runner.ts";
import { runLLM } from "./lib/llm.ts";

type Decoded =
  | {
      kind: "final";
      home: string;
      away: string;
      homeGoals: number;
      awayGoals: number;
      notes: string;
    }
  | { kind: "prompt"; prompt: string };

// Cap untrusted on-chain strings before stuffing them into an LLM prompt.
// Callers control the ABI-encoded payload, so a malicious caller could send a
// huge string to inflate token usage or smuggle role-confusion markers.
const MAX_PAYLOAD_CHARS = 2000;
function clip(s: string): string {
  return s.length > MAX_PAYLOAD_CHARS ? s.slice(0, MAX_PAYLOAD_CHARS) + "…" : s;
}

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
      kind: "final",
      home,
      away,
      homeGoals: Number(hg),
      awayGoals: Number(ag),
      notes: notes ?? "",
    };
  } catch {
    // Fall through to the Companion free-text payload path.
  }
  try {
    const prompt = hexToString(payload).trim();
    return prompt ? { kind: "prompt", prompt } : null;
  } catch {
    return null;
  }
}

function verdict(d: Decoded): string {
  if (d.kind === "prompt") return "No final score supplied.";
  if (d.homeGoals > d.awayGoals) return `${d.home} won.`;
  if (d.homeGoals < d.awayGoals) return `${d.away} won.`;
  return "Draw.";
}

function deterministicSummary(d: Decoded): string {
  if (d.kind === "prompt") {
    return [
      `Highlights request: ${d.prompt}`,
      "No final-score payload was supplied, so no match events were inferred.",
      "(Deterministic fallback: this service has no LLM key configured.)",
    ].join("\n");
  }
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
  if (d.kind === "prompt") {
    return [
      "Highlights (OFFLINE_MODE stub):",
      `Request: ${d.prompt}`,
      "No LLM call made; no chain submission made.",
    ].join("\n");
  }
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
    if (d.kind === "prompt") {
      return await runLLM({
        system:
          "You are the Kickoff highlights writer. In <= 6 short lines, respond to the fan's request " +
          "using only the supplied text. If no final score or match facts are present, say that clearly. " +
          "Do NOT invent goal scorers, minutes, or events. No betting talk.",
        user: `Fan request: ${clip(d.prompt)}`,
        maxTokens: 384,
      });
    }
    return await runLLM({
      system:
        "You are the Kickoff highlights writer. In <= 6 short lines, write a " +
        "factual post-match summary using only the supplied final score and notes. " +
        "Do NOT invent goal scorers, minutes, or events not present in the notes. " +
        "If notes are empty, say so explicitly. No betting talk.",
      user:
        `Match: ${clip(d.home)} ${d.homeGoals} - ${d.awayGoals} ${clip(d.away)}\n` +
        `Notes (may be empty): ${clip(d.notes)}`,
      maxTokens: 384,
    });
  } catch (err) {
    const msg =
      (err as { shortMessage?: string })?.shortMessage ??
      String(err).slice(0, 300);
    console.warn(
      `[highlights] LLM call failed — returning deterministic summary: ${msg}`,
    );
    return deterministicSummary(d);
  }
}

void runAgent({ serviceName: "highlights", handle });
