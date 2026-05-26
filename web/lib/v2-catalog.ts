/**
 * Static v2 catalogues. These mirror the design doc's §7/§8/§9 lists and
 * give the frontend something to render before the contracts seed real
 * quests/trophies/agents. When V2_FULLY_CONFIGURED is true, the live hooks
 * overlay on-chain data on top of this catalogue.
 *
 * Quest / agent ids are keccak256 of stable seed strings so they match
 * what the seed script will register on chain.
 */

import { keccak256, toBytes } from "viem";
import type { AgentDescriptor, Quest, Trophy } from "./v2-types";

const id = (s: string): `0x${string}` => keccak256(toBytes(s));

// ─── Quests ───────────────────────────────────────────────────────────────
// Window timestamps are demo-friendly: "Mint your Fan ID" is open
// indefinitely, the rest target the 2026-06-11 → 2026-07-19 tournament.

const TOURNAMENT_START = Math.floor(
  new Date("2026-06-11T00:00:00Z").getTime() / 1000,
);
const TOURNAMENT_END = Math.floor(
  new Date("2026-07-19T23:59:59Z").getTime() / 1000,
);
const MATCHDAY_1_KICKOFF = Math.floor(
  new Date("2026-06-11T18:00:00Z").getTime() / 1000,
);

export const QUESTS: Quest[] = [
  {
    id: id("kickoff.v2.quest.mint-fan-id"),
    type: "SELF_ATTEST",
    titleKey: "quest_mint_fanid_title",
    bodyKey: "quest_mint_fanid_body",
    startsAt: 0,
    endsAt: TOURNAMENT_END,
    xpReward: 50,
    dim: "ENGAGEMENT_BREADTH",
  },
  {
    id: id("kickoff.v2.quest.matchday-2026-06-11"),
    type: "SELF_ATTEST",
    titleKey: "quest_matchday_title",
    bodyKey: "quest_matchday_body",
    startsAt: TOURNAMENT_START,
    endsAt: TOURNAMENT_START + 24 * 3600,
    xpReward: 25,
    dim: "ENGAGEMENT_BREADTH",
    context: "Mexico vs South Africa · Mexico City",
  },
  {
    id: id("kickoff.v2.quest.predict-2026-06-11-mex-rsa"),
    type: "PREDICTION",
    titleKey: "quest_predict_score_title",
    bodyKey: "quest_predict_score_body",
    startsAt: TOURNAMENT_START,
    endsAt: MATCHDAY_1_KICKOFF,
    xpReward: 100,
    dim: "PREDICTION_ACCURACY",
    context: "Mexico vs South Africa · 11 Jun 2026",
  },
  {
    id: id("kickoff.v2.quest.team-profile"),
    type: "SELF_ATTEST",
    titleKey: "quest_team_profile_title",
    bodyKey: "quest_team_profile_body",
    startsAt: 0,
    endsAt: TOURNAMENT_END,
    xpReward: 30,
    dim: "ENGAGEMENT_BREADTH",
  },
  {
    id: id("kickoff.v2.quest.daily-fact-2026-06-11"),
    type: "SELF_ATTEST",
    titleKey: "quest_daily_fact_title",
    bodyKey: "quest_daily_fact_body",
    startsAt: TOURNAMENT_START,
    endsAt: TOURNAMENT_START + 24 * 3600,
    xpReward: 15,
    dim: "ENGAGEMENT_BREADTH",
    context: "Mexico vs South Africa",
  },
  {
    id: id("kickoff.v2.quest.share-post-group-stage"),
    type: "EXTERNAL_PROOF",
    titleKey: "quest_share_post_title",
    bodyKey: "quest_share_post_body",
    startsAt: TOURNAMENT_START,
    endsAt: TOURNAMENT_END,
    xpReward: 40,
    dim: "ENGAGEMENT_BREADTH",
  },
  {
    id: id("kickoff.v2.quest.group-stage-streak"),
    type: "SELF_ATTEST",
    titleKey: "quest_group_streak_title",
    bodyKey: "quest_group_streak_body",
    startsAt: TOURNAMENT_START,
    endsAt: TOURNAMENT_START + 14 * 24 * 3600,
    xpReward: 200,
    dim: "ENGAGEMENT_BREADTH",
  },
  {
    id: id("kickoff.v2.quest.deploy-agent"),
    type: "EXTERNAL_PROOF",
    titleKey: "quest_deploy_agent_title",
    bodyKey: "quest_deploy_agent_body",
    startsAt: 0,
    endsAt: TOURNAMENT_END,
    xpReward: 150,
    dim: "AGENT_LEAGUE",
  },
];

export function questById(qid: `0x${string}`): Quest | undefined {
  return QUESTS.find((q) => q.id.toLowerCase() === qid.toLowerCase());
}

// ─── Trophies ────────────────────────────────────────────────────────────

export const TROPHIES: Trophy[] = [
  {
    id: 1,
    nameKey: "trophy_first_whistle_name",
    descKey: "trophy_first_whistle_desc",
    glyph: "○",
    requiredXP: 75,
    conditionKey: "trophy_first_whistle_cond",
  },
  {
    id: 2,
    nameKey: "trophy_group_survivor_name",
    descKey: "trophy_group_survivor_desc",
    glyph: "△",
    requiredXP: 200,
    conditionKey: "trophy_group_survivor_cond",
  },
  {
    id: 3,
    nameKey: "trophy_pollster_name",
    descKey: "trophy_pollster_desc",
    glyph: "□",
    requiredXP: 1000,
    conditionKey: "trophy_pollster_cond",
  },
  {
    id: 4,
    nameKey: "trophy_sharpshooter_name",
    descKey: "trophy_sharpshooter_desc",
    glyph: "◇",
    requiredXP: 6000,
    conditionKey: "trophy_sharpshooter_cond",
  },
  {
    id: 5,
    nameKey: "trophy_ai_champion_name",
    descKey: "trophy_ai_champion_desc",
    glyph: "★",
    requiredXP: 0,
    conditionKey: "trophy_ai_champion_cond",
  },
  {
    id: 6,
    nameKey: "trophy_knockout_name",
    descKey: "trophy_knockout_desc",
    glyph: "▲",
    requiredXP: 100,
    conditionKey: "trophy_knockout_cond",
  },
  {
    id: 7,
    nameKey: "trophy_champion_of_champions_name",
    descKey: "trophy_champion_of_champions_desc",
    glyph: "◎",
    requiredXP: 0,
    conditionKey: "trophy_champion_of_champions_cond",
  },
];

// ─── Agents ──────────────────────────────────────────────────────────────
// Default price: 0.0001 OKB = 1e14 wei (design doc default).

const DEFAULT_AGENT_PRICE_WEI = 100_000_000_000_000n; // 0.0001 OKB

export const AGENTS: AgentDescriptor[] = [
  {
    id: id("kickoff.v2.agent.match-analyst"),
    slug: "match-analyst",
    nameKey: "agent_match_analyst_name",
    descKey: "agent_match_analyst_desc",
    priceLabel: "0.0001 OKB",
    priceWei: DEFAULT_AGENT_PRICE_WEI,
  },
  {
    id: id("kickoff.v2.agent.personal-stats"),
    slug: "personal-stats",
    nameKey: "agent_personal_stats_name",
    descKey: "agent_personal_stats_desc",
    priceLabel: "0.0001 OKB",
    priceWei: DEFAULT_AGENT_PRICE_WEI,
  },
  {
    id: id("kickoff.v2.agent.highlights"),
    slug: "highlights",
    nameKey: "agent_highlights_name",
    descKey: "agent_highlights_desc",
    priceLabel: "0.0001 OKB",
    priceWei: DEFAULT_AGENT_PRICE_WEI,
  },
];

export function agentBySlug(slug: AgentDescriptor["slug"]) {
  return AGENTS.find((a) => a.slug === slug);
}
