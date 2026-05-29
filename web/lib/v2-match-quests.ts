/**
 * Match-day quests generated from the real WC2026 fixtures. These mirror the
 * quests the keeper registers on-chain (scripts/keeper-v2.mjs): for every
 * group-stage match it registers a PREDICTION quest and a SELF_ATTEST "attend"
 * quest. The quest id is keccak256 of a stable key, so the id computed here is
 * byte-identical to the keeper's — claims line up once the keeper has
 * registered the match (it reads the SAME data/worldcup-2026.json schedule).
 *
 * Until a match's keeper registration + window opens, these render as
 * "Upcoming" and claiming stays disabled — accurate, never fabricated.
 *
 * Keeper parity (verified scripts/keeper-v2.mjs:197-280):
 *   prediction id  = keccak256("kickoff.v2.quest.prediction|"+date+"|"+t1+"|"+t2)
 *   attend id      = keccak256("kickoff.v2.quest.attend|"+date+"|"+t1+"|"+t2)
 *   predict window = [kickoff-24h, kickoff], xp 1000, dim PREDICTION_ACCURACY
 *   attend  window = [kickoff, kickoff+3h],  xp 200,  dim ENGAGEMENT_BREADTH
 */

import { keccak256, toBytes } from "viem";
import type { Quest } from "./v2-types";
import { ALL_FIXTURES, type Fixture } from "./fixtures";

const id = (s: string): `0x${string}` => keccak256(toBytes(s));

function matchQuests(f: Fixture): Quest[] {
  const label = `${f.team1} v ${f.team2}`;
  return [
    {
      id: id(`kickoff.v2.quest.prediction|${f.date}|${f.team1}|${f.team2}`),
      type: "PREDICTION",
      titleKey: "quest_predict_match_title",
      bodyKey: "quest_predict_match_body",
      startsAt: f.kickoffUnix - 86_400,
      endsAt: f.kickoffUnix,
      xpReward: 1000,
      dim: "PREDICTION_ACCURACY",
      context: label,
    },
    {
      id: id(`kickoff.v2.quest.attend|${f.date}|${f.team1}|${f.team2}`),
      type: "SELF_ATTEST",
      titleKey: "quest_attend_match_title",
      bodyKey: "quest_attend_match_body",
      startsAt: f.kickoffUnix,
      endsAt: f.kickoffUnix + 10_800,
      xpReward: 200,
      dim: "ENGAGEMENT_BREADTH",
      context: label,
    },
  ];
}

/** All match-day quests for the group stage (2 per match). */
export const MATCH_QUESTS: Quest[] = ALL_FIXTURES.filter(
  (f) => f.group,
).flatMap(matchQuests);

/** Match quests naming a given team (group stage). */
export function matchQuestsForTeam(teamName: string): Quest[] {
  return MATCH_QUESTS.filter((q) => q.context?.includes(teamName));
}

/** The soonest `n` match quests that haven't closed yet (for the quests page). */
export function upcomingMatchQuests(nowSec: number, n = 8): Quest[] {
  return MATCH_QUESTS.filter((q) => q.endsAt >= nowSec)
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, n);
}
