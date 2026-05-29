import Link from "next/link";
import type { Fixture } from "@/lib/fixtures";
import { teamByName } from "@/lib/teams";
import { Flag } from "@/components/Flag";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-06-11" → "Jun 11". */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** One side of a fixture: real teams get a flag + link; bracket placeholders
 *  ("2A", "W73") render as a neutral code chip. */
function Side({ name, align }: { name: string; align: "left" | "right" }) {
  const team = teamByName(name);
  const row = align === "right" ? "flex-row-reverse text-right" : "flex-row";
  if (!team) {
    return (
      <div className={`flex items-center gap-2 ${row}`}>
        <span className="flex h-4 w-6 items-center justify-center rounded-sm bg-pitch-panel font-mono text-[10px] text-muted">
          {name}
        </span>
        <span className="text-sm text-muted">{name}</span>
      </div>
    );
  }
  return (
    <Link
      href={`/team/${team.id}`}
      className={`flex items-center gap-2 hover:text-grass ${row}`}
    >
      <Flag code={team.flag} title={team.name} className="h-4 w-6" />
      <span className="text-sm font-semibold text-white">{team.name}</span>
    </Link>
  );
}

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span className="pill">
          {fixture.group ? `Group ${fixture.group}` : fixture.round}
        </span>
        <span>
          {shortDate(fixture.date)} · {fixture.ground}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side name={fixture.team1} align="left" />
        <span className="font-display text-sm text-muted">v</span>
        <Side name={fixture.team2} align="right" />
      </div>
    </div>
  );
}
