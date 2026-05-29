import { NextResponse } from "next/server";

/**
 * Server-side proxy to the kickoff-indexer (services/indexer), which builds the
 * global fan leaderboard FanRep can't serve itself. The indexer listens on
 * loopback, so the browser never talks to it directly — this route does, and
 * caches briefly. On any failure it returns an empty board so the page falls
 * back to its honest "your standing" view (never fabricated rows).
 */
export const dynamic = "force-dynamic";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://127.0.0.1:3066";

type Snapshot = {
  generatedAt: number;
  holderCount: number;
  rows: {
    address: `0x${string}`;
    total: number;
    predictionAccuracyBps: number;
    engagementBreadth: number;
    longevityDays: number;
    favoriteTeams: number[];
  }[];
};

export async function GET() {
  try {
    const res = await fetch(`${INDEXER_URL}/leaderboard`, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`indexer HTTP ${res.status}`);
    const data = (await res.json()) as Snapshot;
    return NextResponse.json(data, {
      headers: {
        "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    // Indexer unreachable — return an empty, well-formed board.
    return NextResponse.json(
      { generatedAt: 0, holderCount: 0, rows: [] } satisfies Snapshot,
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}
