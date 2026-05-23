import { ImageResponse } from "next/og";
import { getMockMarket, MOCK_MARKETS } from "@/lib/mock";

export const runtime = "edge";
export const alt = "Kickoff market bet slip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Shareable bet-slip card. Renders from mock metadata (offline-safe); when a
 * real market address isn't in the mock set we still render the brand card with
 * the first market, so sharing never 500s before contracts are deployed.
 */
export default async function Image({
  params,
}: {
  params: { market: string };
}) {
  const market = getMockMarket(params.market) ?? MOCK_MARKETS[0];
  const leader = [...market.outcomes].sort(
    (a, b) => b.probability - a.probability,
  )[0];
  const pct = Math.round((leader?.probability ?? 0) * 100);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0e0a",
        backgroundImage:
          "radial-gradient(circle at 15% 0%, rgba(22,192,96,0.18), transparent 45%)",
        padding: 64,
        color: "#e9f2e9",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>⚽</div>
        <div style={{ fontSize: 40, fontWeight: 800 }}>
          Kick<span style={{ color: "#16c060" }}>off</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
        }}
      >
        <div style={{ fontSize: 28, color: "#7c8a7c" }}>
          World Cup 2026 · X Layer
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 12,
            maxWidth: 900,
          }}
        >
          {market.question}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginTop: 24,
          }}
        >
          <div style={{ fontSize: 96, fontWeight: 800, color: "#16c060" }}>
            {pct}%
          </div>
          <div style={{ fontSize: 32, color: "#7c8a7c" }}>
            {leader?.label ?? "Favourite"}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 26, color: "#7c8a7c", marginTop: 32 }}>
        Trade the beautiful game — live, on-chain.
      </div>
    </div>,
    { ...size },
  );
}
