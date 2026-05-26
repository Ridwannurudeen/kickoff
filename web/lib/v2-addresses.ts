/**
 * Kickoff v2 contract addresses on X Layer.
 *
 * Placeholders until the contracts ship — the main thread fills in real
 * testnet addresses post-deploy. Each slot has a *distinct* placeholder so
 * the `isConfigured` check below never accidentally reports a fresh deploy
 * before all five are set.
 *
 * Env override: NEXT_PUBLIC_FAN_REP, NEXT_PUBLIC_QUEST_ENGINE,
 * NEXT_PUBLIC_TROPHY, NEXT_PUBLIC_AGENT_REGISTRY, NEXT_PUBLIC_AGENT_LEAGUE.
 *
 * IMPORTANT: env vars below MUST be referenced with literal dot-notation
 * (process.env.NEXT_PUBLIC_X) — Next.js's webpack plugin only inlines
 * NEXT_PUBLIC_* values into the client bundle when accessed that way. A
 * dynamic helper like `process.env[name]` looks the same at the TS level
 * but compiles to a runtime lookup against an empty object in the browser,
 * silently dropping every override.
 */

function nonEmpty(v: string | undefined): string | undefined {
  return v && v.length > 0 ? v : undefined;
}

const PLACEHOLDER_FAN_REP =
  "0x0000000000000000000000000000000000000001" as const;
const PLACEHOLDER_QUEST_ENGINE =
  "0x0000000000000000000000000000000000000002" as const;
const PLACEHOLDER_TROPHY =
  "0x0000000000000000000000000000000000000003" as const;
const PLACEHOLDER_AGENT_REGISTRY =
  "0x0000000000000000000000000000000000000004" as const;
const PLACEHOLDER_AGENT_LEAGUE =
  "0x0000000000000000000000000000000000000005" as const;

export const V2_ADDRESSES = {
  fanRep: (nonEmpty(process.env.NEXT_PUBLIC_FAN_REP) ??
    PLACEHOLDER_FAN_REP) as `0x${string}`,
  questEngine: (nonEmpty(process.env.NEXT_PUBLIC_QUEST_ENGINE) ??
    PLACEHOLDER_QUEST_ENGINE) as `0x${string}`,
  trophy: (nonEmpty(process.env.NEXT_PUBLIC_TROPHY) ??
    PLACEHOLDER_TROPHY) as `0x${string}`,
  agentRegistry: (nonEmpty(process.env.NEXT_PUBLIC_AGENT_REGISTRY) ??
    PLACEHOLDER_AGENT_REGISTRY) as `0x${string}`,
  agentLeague: (nonEmpty(process.env.NEXT_PUBLIC_AGENT_LEAGUE) ??
    PLACEHOLDER_AGENT_LEAGUE) as `0x${string}`,
} as const;

const PLACEHOLDER_RE = /^0x0+0*[0-9a-fA-F]$/; // matches the 0x000…000N pattern

/** True when an address looks like a real (non-placeholder) deployment. */
export function isConfigured(addr: string): addr is `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return false;
  return !PLACEHOLDER_RE.test(addr);
}

export const FAN_REP_CONFIGURED = isConfigured(V2_ADDRESSES.fanRep);
export const QUEST_ENGINE_CONFIGURED = isConfigured(V2_ADDRESSES.questEngine);
export const TROPHY_CONFIGURED = isConfigured(V2_ADDRESSES.trophy);
export const AGENT_REGISTRY_CONFIGURED = isConfigured(
  V2_ADDRESSES.agentRegistry,
);
export const AGENT_LEAGUE_CONFIGURED = isConfigured(V2_ADDRESSES.agentLeague);

/** True only when every v2 contract is wired up. Most UI surfaces use this
 *  to decide between live-chain reads and offline-demo placeholders. */
export const V2_FULLY_CONFIGURED =
  FAN_REP_CONFIGURED &&
  QUEST_ENGINE_CONFIGURED &&
  TROPHY_CONFIGURED &&
  AGENT_REGISTRY_CONFIGURED &&
  AGENT_LEAGUE_CONFIGURED;
