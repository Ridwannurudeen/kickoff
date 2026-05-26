/** Shared types for the v2 product surface. */

import type { TranslationKey } from "./i18n";

export type QuestType = "SELF_ATTEST" | "PREDICTION" | "EXTERNAL_PROOF";

export interface Quest {
  /** keccak256 of a stable string; lives on-chain as the quest key. */
  id: `0x${string}`;
  type: QuestType;
  /** i18n key for the quest title. */
  titleKey: TranslationKey;
  /** i18n key for the one-line description. */
  bodyKey: TranslationKey;
  startsAt: number; // unix seconds
  endsAt: number; // unix seconds
  xpReward: number;
  /** Which FanRep dimension this credits. */
  dim:
    | "PREDICTION_ACCURACY"
    | "ENGAGEMENT_BREADTH"
    | "LONGEVITY"
    | "AGENT_LEAGUE"
    | "DONOR";
  /** Optional anchor — match label, team, etc. */
  context?: string;
}

export interface Trophy {
  /** uint256 on-chain id. */
  id: number;
  nameKey: TranslationKey;
  descKey: TranslationKey;
  /** A short visual glyph rendered in the card. */
  glyph: string;
  requiredXP: number;
  /** Friendly summary of the rule, shown on the card. */
  conditionKey: TranslationKey;
}

export interface AgentDescriptor {
  /** keccak256 of a stable string. */
  id: `0x${string}`;
  slug: "match-analyst" | "personal-stats" | "highlights";
  nameKey: TranslationKey;
  descKey: TranslationKey;
  /** Default OKB price per call, formatted. */
  priceLabel: string;
  priceWei: bigint;
}

export interface Team {
  id: number;
  name: string;
  group: string;
  flag: string;
}
