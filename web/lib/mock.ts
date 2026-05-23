import type {
  LeaderRow,
  LpPosition,
  Market,
  Outcome,
  Position,
  PricePoint,
  Trade,
} from "./types";

/**
 * Mock World Cup 2026 markets used when NEXT_PUBLIC_FACTORY is unset/zero so the
 * app is fully demoable before contracts deploy. Addresses are deterministic
 * placeholders (clearly fake) and never used for on-chain calls in mock mode.
 * Covers every category so the categorical UI can be exercised end-to-end.
 */

function mockAddr(seed: number): `0x${string}` {
  const hex = seed.toString(16).padStart(40, "0");
  return `0x${hex}` as `0x${string}`;
}

function mockCondition(seed: number): `0x${string}` {
  const hex = (seed * 7919).toString(16).padStart(64, "0").slice(0, 64);
  return `0x${hex}` as `0x${string}`;
}

interface Seed {
  category: Market["category"];
  question: string;
  subject: string;
  /** outcome labels + un-normalized weights (normalized into probabilities). */
  outcomes: { label: string; weight: number }[];
  volume24h: number;
  inPlay?: boolean;
}

const SEEDS: Seed[] = [
  {
    category: "1x2",
    question: "Brazil vs France",
    subject: "Brazil vs France",
    outcomes: [
      { label: "Brazil", weight: 0.41 },
      { label: "Draw", weight: 0.27 },
      { label: "France", weight: 0.32 },
    ],
    volume24h: 184000,
    inPlay: true,
  },
  {
    category: "1x2",
    question: "Argentina vs Spain",
    subject: "Argentina vs Spain",
    outcomes: [
      { label: "Argentina", weight: 0.38 },
      { label: "Draw", weight: 0.28 },
      { label: "Spain", weight: 0.34 },
    ],
    volume24h: 151200,
  },
  {
    category: "over-under",
    question: "Brazil vs France — Over/Under 2.5 goals",
    subject: "Brazil vs France",
    outcomes: [
      { label: "Over 2.5", weight: 0.56 },
      { label: "Under 2.5", weight: 0.44 },
    ],
    volume24h: 73400,
    inPlay: true,
  },
  {
    category: "btts",
    question: "Argentina vs Spain — Both teams to score?",
    subject: "Argentina vs Spain",
    outcomes: [
      { label: "Yes", weight: 0.61 },
      { label: "No", weight: 0.39 },
    ],
    volume24h: 48900,
  },
  {
    category: "group",
    question: "Who wins Group D?",
    subject: "Group D",
    outcomes: [
      { label: "USA", weight: 0.34 },
      { label: "Iran", weight: 0.18 },
      { label: "Ghana", weight: 0.22 },
      { label: "Wales", weight: 0.26 },
    ],
    volume24h: 64100,
  },
  {
    category: "group",
    question: "Who wins Group E?",
    subject: "Group E",
    outcomes: [
      { label: "Germany", weight: 0.45 },
      { label: "Japan", weight: 0.25 },
      { label: "Mexico", weight: 0.18 },
      { label: "Morocco", weight: 0.12 },
    ],
    volume24h: 52800,
  },
  {
    category: "outright",
    question: "Will Brazil win the 2026 World Cup?",
    subject: "Brazil",
    outcomes: [
      { label: "Yes", weight: 0.18 },
      { label: "No", weight: 0.82 },
    ],
    volume24h: 142000,
  },
  {
    category: "outright",
    question: "Will France win the 2026 World Cup?",
    subject: "France",
    outcomes: [
      { label: "Yes", weight: 0.15 },
      { label: "No", weight: 0.85 },
    ],
    volume24h: 128900,
  },
  {
    category: "outright",
    question: "Will Spain win the 2026 World Cup?",
    subject: "Spain",
    outcomes: [
      { label: "Yes", weight: 0.21 },
      { label: "No", weight: 0.79 },
    ],
    volume24h: 119700,
  },
  {
    category: "golden-boot",
    question: "Will Mbappé win the 2026 World Cup Golden Boot?",
    subject: "Mbappé",
    outcomes: [
      { label: "Yes", weight: 0.16 },
      { label: "No", weight: 0.84 },
    ],
    volume24h: 52100,
  },
  {
    category: "golden-boot",
    question: "Will Haaland win the 2026 World Cup Golden Boot?",
    subject: "Haaland",
    outcomes: [
      { label: "Yes", weight: 0.12 },
      { label: "No", weight: 0.88 },
    ],
    volume24h: 47600,
  },
];

function normalize(outcomes: { label: string; weight: number }[]): Outcome[] {
  const sum = outcomes.reduce((a, o) => a + o.weight, 0) || 1;
  return outcomes.map((o, i) => ({
    index: i,
    label: o.label,
    probability: o.weight / sum,
  }));
}

export const MOCK_MARKETS: Market[] = SEEDS.map((s, i) => ({
  address: mockAddr(i + 1),
  conditionId: mockCondition(i + 1),
  category: s.category,
  question: s.question,
  subject: s.subject,
  outcomeCount: s.outcomes.length,
  outcomes: normalize(s.outcomes),
  volume24h: s.volume24h,
  isMock: true,
  closed: false,
  feeBps: 200,
  inPlay: !!s.inPlay,
}));

export function getMockMarket(address: string): Market | undefined {
  return MOCK_MARKETS.find(
    (m) => m.address.toLowerCase() === address.toLowerCase(),
  );
}

/** Deterministic price-history for a mock market outcome (random-walk seeded). */
export function mockPriceHistory(
  probability: number,
  points = 48,
): PricePoint[] {
  const out: PricePoint[] = [];
  const now = Date.now();
  let p = Math.max(0.03, probability - 0.05);
  // simple seeded LCG so the same market always renders the same chart
  let seed = Math.floor(probability * 1000) + 1;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = points - 1; i >= 0; i--) {
    p += (rand() - 0.48) * 0.02;
    p = Math.min(0.97, Math.max(0.02, p));
    out.push({ t: now - i * 30 * 60 * 1000, p: +(p * 100).toFixed(2) });
  }
  // pin the final point to the current probability for consistency
  if (out.length) out[out.length - 1].p = +(probability * 100).toFixed(2);
  return out;
}

const MOCK_TRADERS: `0x${string}`[] = [
  "0x1a2b3c4d5e6f70819293a4b5c6d7e8f901234567",
  "0xabcdef0123456789abcdef0123456789abcdef01",
  "0x9988776655443322110099887766554433221100",
  "0x0f1e2d3c4b5a69788796a5b4c3d2e1f001234abc",
  "0xfeedfacecafebeef0011223344556677889900aa",
];

export function mockTrades(count = 12): Trade[] {
  const out: Trade[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const m = MOCK_MARKETS[i % MOCK_MARKETS.length];
    const side = i % 3 === 0 ? "sell" : "buy";
    const outcomeIndex = i % m.outcomeCount;
    const outcome = m.outcomes[outcomeIndex];
    const amount = 50 + ((i * 137) % 900);
    out.push({
      market: m.address,
      marketLabel: m.subject,
      side,
      trader: MOCK_TRADERS[i % MOCK_TRADERS.length],
      outcomeIndex,
      outcomeLabel: outcome.label,
      amount,
      shares: amount / Math.max(0.02, outcome.probability),
      txHash: `0x${(i + 1).toString(16).padStart(64, "0")}` as `0x${string}`,
      blockNumber: BigInt(1_000_000 - i),
      timestamp: now - i * 47_000,
    });
  }
  return out;
}

export function mockPositions(): Position[] {
  const a = MOCK_MARKETS[0];
  const b = MOCK_MARKETS[6];
  return [
    {
      market: a.address,
      marketLabel: a.subject,
      outcomeIndex: 0,
      outcomeName: a.outcomes[0].label,
      shares: 320,
      mark: a.outcomes[0].probability,
      conditionId: a.conditionId,
      resolved: false,
      isWinner: false,
      avgCost: 0.36,
    },
    {
      market: b.address,
      marketLabel: b.subject,
      outcomeIndex: 0,
      outcomeName: b.outcomes[0].label,
      shares: 140,
      mark: b.outcomes[0].probability,
      conditionId: b.conditionId,
      resolved: false,
      isWinner: false,
      avgCost: 0.21,
    },
  ];
}

export function mockLpPositions(): LpPosition[] {
  const a = MOCK_MARKETS[0];
  const b = MOCK_MARKETS[4];
  return [
    {
      market: a.address,
      marketLabel: a.subject,
      shares: 1500,
      claimableFees: 42.18,
      feeBps: a.feeBps,
    },
    {
      market: b.address,
      marketLabel: b.subject,
      shares: 600,
      claimableFees: 9.74,
      feeBps: b.feeBps,
    },
  ];
}

export function mockLeaderboard(): LeaderRow[] {
  return MOCK_TRADERS.map((trader, i) => ({
    trader,
    volume: 250000 - i * 38000,
    buys: 40 - i * 5,
    sells: 12 - i,
    realized: 18000 - i * 5200,
  }));
}
