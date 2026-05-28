// match-analyst: pre-match preview agent.
//
// Listens for `Called` events on its agent in `AgentRegistry`, decodes the
// payload as a (homeTeam, awayTeam) tuple, fetches the openfootball CC0 schedule
// for context (recent meetings + group standings), then asks the LLM for a
// short preview. Replies via `submitResult(callId, abi.encode(string))`.
//
// Payload format (ABI-encoded): (string homeTeam, string awayTeam)
//   web/companion sends `encodeAbiParameters([{type:'string'},{type:'string'}], [home, away])`
import "dotenv/config";
import { decodeAbiParameters, hexToString, type Hex } from "viem";
import { runAgent, type CalledEvent } from "./lib/agent-runner.ts";
import { runLLM } from "./lib/llm.ts";

type Match = {
  date?: string;
  team1?: string | { name?: string };
  team2?: string | { name?: string };
  score?: { ft?: [number, number] };
  group?: string;
  stage?: string;
};

type Schedule = { matches: Match[] };

let scheduleCache: Schedule | null = null;
let scheduleFetchedAt = 0;
const SCHEDULE_TTL_MS = 60 * 60 * 1000; // 1h
// Cap untrusted on-chain strings before stuffing them into an LLM prompt.
// Callers control the ABI-encoded payload, so a malicious caller could send a
// huge string to inflate token usage or smuggle role-confusion markers.
const MAX_PAYLOAD_CHARS = 2000;
function clip(s: string): string {
  return s.length > MAX_PAYLOAD_CHARS ? s.slice(0, MAX_PAYLOAD_CHARS) + "…" : s;
}

async function loadSchedule(): Promise<Schedule> {
  if (scheduleCache && Date.now() - scheduleFetchedAt < SCHEDULE_TTL_MS) {
    return scheduleCache;
  }
  const url =
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`openfootball fetch failed: HTTP ${res.status}`);
  const json = (await res.json()) as Schedule;
  if (!Array.isArray(json.matches))
    throw new Error("openfootball response missing matches[]");
  scheduleCache = json;
  scheduleFetchedAt = Date.now();
  return json;
}

function teamName(t: Match["team1" | "team2"]): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  return t.name ?? "";
}

type MatchPayload =
  | { kind: "match"; home: string; away: string }
  | { kind: "prompt"; prompt: string };

function decodePayload(payload: Hex): MatchPayload | null {
  try {
    const [home, away] = decodeAbiParameters(
      [{ type: "string" }, { type: "string" }],
      payload,
    ) as [string, string];
    if (home && away) return { kind: "match", home, away };
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

function pickContext(schedule: Schedule, home: string, away: string) {
  const norm = (s: string) => s.trim().toLowerCase();
  const wanted = new Set([norm(home), norm(away)]);
  const meetings: Match[] = [];
  const homeRecent: Match[] = [];
  const awayRecent: Match[] = [];
  for (const m of schedule.matches) {
    const t1 = norm(teamName(m.team1));
    const t2 = norm(teamName(m.team2));
    if (!t1 || !t2) continue;
    if (wanted.has(t1) && wanted.has(t2)) meetings.push(m);
    else if (t1 === norm(home) || t2 === norm(home)) homeRecent.push(m);
    else if (t1 === norm(away) || t2 === norm(away)) awayRecent.push(m);
  }
  return {
    meetings: meetings.slice(-5),
    homeRecent: homeRecent.slice(-5),
    awayRecent: awayRecent.slice(-5),
  };
}

function offlineStub(home: string, away: string): string {
  return [
    `Pre-match preview: ${home} vs ${away}.`,
    `(OFFLINE_MODE stub — deterministic output for demo without an LLM key.)`,
    `Form: both sides treated as evenly matched in this stub. Key stat: every match is 90 minutes.`,
    `Head-to-head: no historical data injected in offline mode.`,
    `Prediction guidance: tight, low-scoring. Kickoff predictions are free-skill (no wagering).`,
  ].join("\n");
}

async function handle(ev: CalledEvent): Promise<string> {
  const decoded = decodePayload(ev.payload);
  if (!decoded) {
    return "Could not decode payload - expected a Companion text prompt or ABI-encoded (string homeTeam, string awayTeam).";
  }
  if (decoded.kind === "prompt") {
    if (
      process.env.OFFLINE_MODE === "1" ||
      process.env.OFFLINE_MODE === "true"
    ) {
      return [
        `Match-analysis request: ${clip(decoded.prompt)}`,
        "(OFFLINE_MODE stub - deterministic output for demo without an LLM key.)",
        "No structured teams were supplied, so no schedule lookup was performed.",
      ].join("\n");
    }

    try {
      return await runLLM({
        system:
          "You are the Kickoff match-analyst. Produce a concise (<= 8 lines) football analysis response. " +
          "Use only the user's prompt. If the prompt lacks concrete teams or match facts, say what is missing. " +
          "No betting talk. No fabricated facts.",
        user: `Fan request: ${clip(decoded.prompt)}`,
        maxTokens: 512,
      });
    } catch (err) {
      const msg =
        (err as { shortMessage?: string })?.shortMessage ??
        String(err).slice(0, 300);
      console.error(`[match-analyst] LLM call failed: ${msg}`);
      return "[match-analyst error] Could not answer the request right now.";
    }
  }
  const { home, away } = decoded;
  if (!home || !away) {
    return "Could not decode payload — expected ABI-encoded (string homeTeam, string awayTeam).";
  }
  if (process.env.OFFLINE_MODE === "1" || process.env.OFFLINE_MODE === "true") {
    return offlineStub(home, away);
  }

  let context = "";
  try {
    const sched = await loadSchedule();
    const ctx = pickContext(sched, home, away);
    context = JSON.stringify(ctx);
  } catch (err) {
    const msg =
      (err as { shortMessage?: string })?.shortMessage ??
      String(err).slice(0, 300);
    console.warn(
      `[match-analyst] schedule unavailable — falling back to context-free prompt: ${msg}`,
    );
  }

  try {
    return await runLLM({
      system:
        "You are the Kickoff match-analyst. Produce a concise (<= 8 lines) pre-match preview " +
        "covering form, key stats, and head-to-head. No betting talk. No randomness. Factual only. " +
        "If context is empty, say so explicitly instead of inventing facts.",
      user: `Match: ${clip(home)} vs ${clip(away)}\nContext (openfootball CC0, may be empty): ${clip(context)}`,
      maxTokens: 512,
    });
  } catch (err) {
    // Return a labelled stub instead of throwing into watchContractEvent —
    // throwing here would skip submitResult and lock the caller's payment.
    const msg =
      (err as { shortMessage?: string })?.shortMessage ??
      String(err).slice(0, 300);
    console.error(`[match-analyst] LLM call failed: ${msg}`);
    return `[match-analyst error] LLM call failed. Pre-match preview for ${home} vs ${away} unavailable.`;
  }
}

void runAgent({ serviceName: "match-analyst", handle });
