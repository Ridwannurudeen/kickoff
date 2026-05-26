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
import { decodeAbiParameters, type Hex } from "viem";
import { runAgent, type CalledEvent } from "./lib/agent-runner.js";
import { runLLM } from "./lib/llm.js";

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

function decodePayload(payload: Hex): { home: string; away: string } {
  try {
    const [home, away] = decodeAbiParameters(
      [{ type: "string" }, { type: "string" }],
      payload,
    ) as [string, string];
    return { home, away };
  } catch {
    return { home: "", away: "" };
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
  const { home, away } = decodePayload(ev.payload);
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
    console.warn(
      "[match-analyst] schedule unavailable — falling back to context-free prompt:",
      err,
    );
  }

  const text = await runLLM({
    system:
      "You are the Kickoff match-analyst. Produce a concise (<= 8 lines) pre-match preview " +
      "covering form, key stats, and head-to-head. No betting talk. No randomness. Factual only. " +
      "If context is empty, say so explicitly instead of inventing facts.",
    user: `Match: ${home} vs ${away}\nContext (openfootball CC0, may be empty): ${context}`,
    maxTokens: 512,
  });
  return text;
}

void runAgent({ serviceName: "match-analyst", handle });
