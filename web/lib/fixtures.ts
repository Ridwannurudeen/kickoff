/**
 * World Cup 2026 fixtures — the real 104-match schedule (48 teams, 12 groups
 * A–L, then Round of 32 → Final). Sourced from data/worldcup-2026.json (CC0
 * openfootball) and normalised into a typed, ordered list the UI can render.
 *
 * Knockout fixtures carry placeholder participants ("2A", "W73", …) until the
 * bracket resolves; their `group` is null. Group fixtures normalise
 * "Group A" → "A" so they join cleanly with lib/teams.ts.
 *
 * `kickoffUnix` is computed deterministically from date + "HH:MM UTC±N" at
 * module load (Date.UTC only — never Date.now), so SSR and client agree.
 */

import raw from "../data/worldcup-2026.json";

export interface Fixture {
  round: string; // "Matchday 1" | "Round of 32" | "Quarter-final" | "Final" | …
  date: string; // ISO date, e.g. "2026-06-11"
  time: string; // local kickoff, e.g. "13:00 UTC-6"
  team1: string;
  team2: string;
  group: string | null; // "A".."L" for group stage, else null
  ground: string; // host city
  kickoffUnix: number; // seconds since epoch, UTC
}

interface RawMatch {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  num?: number;
}

/** "13:00 UTC-6" + "2026-06-11" → UTC unix seconds. */
function toKickoffUnix(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})$/.exec(time.trim());
  if (!match) return Math.floor(Date.UTC(y, m - 1, d, 12, 0) / 1000);
  const [, hh, mm, off] = match;
  // UTC = local - offset  (offset -6 → utcHour = hour - (-6) = hour + 6)
  const utcHour = Number(hh) - Number(off);
  return Math.floor(Date.UTC(y, m - 1, d, utcHour, Number(mm)) / 1000);
}

export const ALL_FIXTURES: Fixture[] = (raw.matches as RawMatch[])
  .map((m) => ({
    round: m.round,
    date: m.date,
    time: m.time,
    team1: m.team1,
    team2: m.team2,
    group: m.group ? m.group.replace(/^Group\s+/, "") : null,
    ground: m.ground,
    kickoffUnix: toKickoffUnix(m.date, m.time),
  }))
  .sort((a, b) => a.kickoffUnix - b.kickoffUnix);

/** The opening match (Mexico v South Africa, Mexico City) kicks off the cup. */
export const KICKOFF_UNIX = ALL_FIXTURES[0].kickoffUnix;

/** Whole days from `nowUnix` until the opener; 0 once the cup is under way. */
export function daysUntilKickoff(nowUnix: number): number {
  return Math.max(0, Math.ceil((KICKOFF_UNIX - nowUnix) / 86_400));
}

/** Next `n` fixtures that haven't kicked off yet (ordered soonest-first). */
export function nextFixtures(nowUnix: number, n = 4): Fixture[] {
  return ALL_FIXTURES.filter((f) => f.kickoffUnix >= nowUnix).slice(0, n);
}

/** Group-stage fixtures for one group letter ("A".."L"). */
export function fixturesByGroup(group: string): Fixture[] {
  return ALL_FIXTURES.filter((f) => f.group === group);
}

/** Every fixture a named team appears in (group stage; knockouts use codes). */
export function fixturesForTeam(name: string): Fixture[] {
  return ALL_FIXTURES.filter((f) => f.team1 === name || f.team2 === name);
}
