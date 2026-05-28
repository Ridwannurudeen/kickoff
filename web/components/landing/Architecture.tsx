/**
 * Architecture — annotated visual of the Kickoff v2 contract layout.
 *
 * Five new v2 contracts plus a reused bonded optimistic oracle, all on X Layer
 * testnet 1952. Renders a CSS-grid diagram (OKX Wallet → web → 5 contracts →
 * OO + keeper) above a 5-row contract glossary. SVG glyphs inherit
 * `currentColor` so they pick up the surrounding text-grass / text-honor
 * tokens.
 */

import { ColumnOrnament, LaurelWreath } from "@/components/ornaments";

type ContractRow = {
  name: string;
  blurb: string;
  tone: "grass" | "honor";
  glyph: JSX.Element;
};

const ROWS: ContractRow[] = [
  {
    name: "FanRep",
    blurb: "Soulbound ERC-721 + multi-dim reputation (score(address)).",
    tone: "honor",
    glyph: <SbtGlyph />,
  },
  {
    name: "QuestEngine",
    blurb: "SELF_ATTEST / PREDICTION (commit-reveal) / EXTERNAL_PROOF.",
    tone: "grass",
    glyph: <QuestGlyph />,
  },
  {
    name: "Trophy",
    blurb: "ERC-1155 commemoratives. Deterministic gating. No randomness.",
    tone: "honor",
    glyph: <TrophyTileGlyph />,
  },
  {
    name: "AgentRegistry",
    blurb: "Permissionless agents. OKB per call. composeAgents fan-out.",
    tone: "grass",
    glyph: <AgentGlyph />,
  },
  {
    name: "AgentLeague",
    blurb: "Bring-Your-Own-Agent seasons. Commit-reveal. AI Champion trophy.",
    tone: "honor",
    glyph: <LeagueGlyph />,
  },
];

export function Architecture(): JSX.Element {
  return (
    <section aria-labelledby="architecture-heading">
      <div className="tabula card relative overflow-hidden p-6 md:p-10">
        <LaurelWreath
          size={260}
          className="pointer-events-none absolute -right-10 -top-10 select-none text-honor/10"
        />
        <h2
          id="architecture-heading"
          className="mb-2 animate-fade-up font-display text-2xl tracking-wide sm:text-3xl"
        >
          Architecture at a glance
        </h2>
        <p className="mb-6 animate-fade-up text-sm text-muted [animation-delay:60ms]">
          Five new v2 contracts plus a reused bonded optimistic oracle, all on X
          Layer testnet 1952.
        </p>

        {/* Diagram */}
        <div
          className="relative animate-fade-up rounded-lg border border-pitch-border bg-pitch-panel/40 p-4 md:p-6 [animation-delay:120ms]"
          aria-label="Contract architecture diagram"
        >
          {/* Top row: wallet → web */}
          <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center md:gap-6">
            <DiagramTile label="OKX Wallet" sublabel="OKB gas" tone="grass" />
            <Arrow />
            <DiagramTile label="web" sublabel="Next.js" tone="grass" />
          </div>

          {/* Hairline rule from web → contract bus */}
          <div className="mx-auto my-3 h-6 w-px bg-gradient-to-b from-honor/50 to-transparent" />

          {/* Bus rule */}
          <div className="relative h-px w-full bg-gradient-to-r from-transparent via-honor/40 to-transparent" />

          {/* Five contract pillars */}
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
            {ROWS.map((row) => (
              <DiagramPillar key={row.name} name={row.name} tone={row.tone} />
            ))}
          </div>

          {/* Connector to oracle row */}
          <div className="mx-auto my-3 h-6 w-px bg-gradient-to-b from-honor/40 to-transparent" />

          {/* Bottom row: OO + keeper */}
          <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center md:gap-6">
            <DiagramTile
              label="OptimisticOracle"
              sublabel="reused, bonded"
              tone="honor"
            />
            <Arrow />
            <DiagramTile
              label="Keeper"
              sublabel="openfootball / API-FOOTBALL"
              tone="honor"
            />
          </div>

          <ColumnOrnament
            className="pointer-events-none absolute -bottom-4 right-2 text-honor/20"
            size={48}
          />
        </div>

        {/* Glossary */}
        <ul className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-2">
          {ROWS.map((row, i) => (
            <li
              key={row.name}
              className="card flex animate-fade-up items-start gap-3 p-3"
              style={{ animationDelay: `${160 + i * 40}ms` }}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-md border ${
                  row.tone === "honor"
                    ? "border-honor/40 text-honor"
                    : "border-grass/40 text-grass"
                }`}
                aria-hidden
              >
                {row.glyph}
              </span>
              <div className="min-w-0">
                <p
                  className={`font-extrabold tracking-wide ${
                    row.tone === "honor" ? "text-honor" : "text-white"
                  }`}
                >
                  {row.name}
                </p>
                <p className="text-sm text-muted">{row.blurb}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-muted">
          <a
            href="https://www.oklink.com/xlayer-test"
            target="_blank"
            rel="noopener noreferrer"
            className="text-grass hover:underline"
          >
            View contracts on OKLink →
          </a>
        </p>
      </div>
    </section>
  );
}

function DiagramTile({
  label,
  sublabel,
  tone,
}: {
  label: string;
  sublabel: string;
  tone: "grass" | "honor";
}): JSX.Element {
  const ring =
    tone === "honor"
      ? "border-honor/40 text-honor"
      : "border-grass/40 text-grass";
  return (
    <div
      className={`flex min-w-[10rem] flex-col items-center rounded-md border bg-pitch-card px-3 py-2 text-center ${ring}`}
    >
      <span className="text-sm font-extrabold tracking-wide">{label}</span>
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
        {sublabel}
      </span>
    </div>
  );
}

function DiagramPillar({
  name,
  tone,
}: {
  name: string;
  tone: "grass" | "honor";
}): JSX.Element {
  const accent =
    tone === "honor"
      ? "border-honor/40 text-honor"
      : "border-grass/40 text-grass";
  return (
    <div
      className={`relative flex flex-col items-center rounded-md border bg-pitch-card px-2 py-3 text-center ${accent}`}
    >
      <span className="pointer-events-none absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-gradient-to-b from-honor/40 to-transparent" />
      <span className="text-xs font-extrabold tracking-wide">{name}</span>
    </div>
  );
}

function Arrow(): JSX.Element {
  return (
    <svg
      width={22}
      height={12}
      viewBox="0 0 22 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-honor/60"
      aria-hidden
    >
      <path d="M1 6 H 19" />
      <path d="M14 1 L 20 6 L 14 11" />
    </svg>
  );
}

function SbtGlyph(): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9 H 16" />
      <path d="M8 13 H 14" />
      <path d="M8 17 H 12" />
    </svg>
  );
}

function QuestGlyph(): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6 L 9 11 L 4 16" />
      <path d="M12 17 H 20" />
    </svg>
  );
}

function TrophyTileGlyph(): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 4 H 17 V 9 a 5 5 0 0 1 -10 0 Z" />
      <path d="M7 6 H 4 a 0 0 0 0 0 0 0 c 0 3 2 5 4 5" />
      <path d="M17 6 H 20 c 0 3 -2 5 -4 5" />
      <path d="M10 16 H 14 V 20 H 10 Z" />
    </svg>
  );
}

function AgentGlyph(): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="9" r="4" />
      <path d="M4 20 c 2 -4 6 -5 8 -5 s 6 1 8 5" />
    </svg>
  );
}

function LeagueGlyph(): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="14" width="5" height="6" />
      <rect x="9.5" y="10" width="5" height="10" />
      <rect x="16" y="16" width="5" height="4" />
    </svg>
  );
}
