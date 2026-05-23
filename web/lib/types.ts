/**
 * Market categories. The on-chain metadataURI encodes the category as
 * `kickoff://market/<category>/<subject>`; everything else degrades to a generic
 * outcome list. Binary types (over-under / btts / outright / golden-boot) have 2
 * outcomes, 1x2 has 3, group has N team slots.
 */
export type MarketCategory =
  | "1x2"
  | "over-under"
  | "btts"
  | "group"
  | "outright"
  | "golden-boot";

export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  "1x2": "Matches",
  "over-under": "Over / Under",
  btts: "Both Teams To Score",
  group: "Groups",
  outright: "Outright Winner",
  "golden-boot": "Golden Boot",
};

/** Order tabs are shown in on the markets list. */
export const CATEGORY_ORDER: MarketCategory[] = [
  "1x2",
  "over-under",
  "btts",
  "group",
  "outright",
  "golden-boot",
];

/** One outcome within a market (label + live implied probability). */
export interface Outcome {
  index: number;
  label: string;
  /** implied probability, 0..1 (from prices() / 1e18). */
  probability: number;
}

/** A market as the UI consumes it (real on-chain or mock). */
export interface Market {
  /** FPMM contract address (route param). */
  address: `0x${string}`;
  conditionId: `0x${string}`;
  category: MarketCategory;
  /** Headline question, e.g. "Spain vs France" or "Will Brazil win?". */
  question: string;
  /** Short subject from metadata, e.g. "Brazil" or "Group D". */
  subject: string;
  /** Number of outcomes (>= 2). */
  outcomeCount: number;
  /** Per-outcome labels + live probabilities. */
  outcomes: Outcome[];
  /** 24h volume in USDC (human units). */
  volume24h: number;
  /** True if read from chain, false if mock placeholder. */
  isMock: boolean;
  closed: boolean;
  feeBps: number;
  /** True if the underlying match is currently live (placeholder flag for now). */
  inPlay: boolean;
}

/** A buy/sell trade decoded from FPMM event logs. */
export interface Trade {
  market: `0x${string}`;
  marketLabel: string;
  side: "buy" | "sell";
  trader: `0x${string}`;
  outcomeIndex: number;
  /** Resolved label for the traded outcome, if known. */
  outcomeLabel: string;
  /** collateral moved, human USDC units */
  amount: number;
  /** outcome tokens, human units */
  shares: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: number;
}

/** A point on a derived probability history chart (tracks one outcome). */
export interface PricePoint {
  /** unix ms */
  t: number;
  /** tracked outcome probability percentage 0..100 */
  p: number;
}

/** A position the connected wallet holds in one market outcome. */
export interface Position {
  market: `0x${string}`;
  marketLabel: string;
  outcomeIndex: number;
  outcomeName: string;
  /** shares held, human units */
  shares: number;
  /** current mark = probability of that outcome, 0..1 */
  mark: number;
  conditionId: `0x${string}`;
  resolved: boolean;
  /** true if this outcome won (after resolution) */
  isWinner: boolean;
  /** average entry price per share from buy/sell logs (USDC/share), or undefined if unknown */
  avgCost?: number;
}

/** A liquidity (LP token) position the connected wallet holds in one market. */
export interface LpPosition {
  market: `0x${string}`;
  marketLabel: string;
  /** kLP shares held, human units (6-dec) */
  shares: number;
  /** claimable LP fees, human USDC units */
  claimableFees: number;
  feeBps: number;
}

/** Aggregated leaderboard row derived from event logs. */
export interface LeaderRow {
  trader: `0x${string}`;
  volume: number;
  buys: number;
  sells: number;
  /** realized collateral out minus collateral in (rough PnL proxy). */
  realized: number;
}

/** Resolution state for a market, read from the OptimisticOracle. */
export type OracleStatus = "none" | "proposed" | "disputed" | "settled";

export interface OracleState {
  status: OracleStatus;
  proposer: `0x${string}`;
  disputer: `0x${string}`;
  proposedAt: number;
  /** seconds remaining in the dispute window (0 if elapsed / not proposed). */
  livenessRemaining: number;
  payouts: number[];
}
