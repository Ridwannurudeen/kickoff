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
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}
/** "13:00 UTC-6" -> "13:00" */
function localTime(t: string): string {
  return t.split(" ")[0] ?? t;
}

/** One side of a fixture. Real teams link to their page; bracket placeholders
 *  ("2A", "W73") render as a neutral code chip. */
function Side({ name, align }: { name: string; align: "home" | "away" }) {
  const team = teamByName(name);
  const dir = align === "away" ? "flex-row-reverse text-right" : "flex-row";
  if (!team) {
    return (
      <div className={`flex items-center gap-2 ${dir}`}>
        <span className="flex h-4 w-6 items-center justify-center rounded-sm bg-pitch-raised font-mono text-[10px] text-muted">
          {name}
        </span>
        <span className="truncate text-sm text-muted">{name}</span>
      </div>
    );
  }
  return (
    <Link
      href={`/team/${team.id}`}
      className={`flex items-center gap-2 hover:text-grass ${dir}`}
    >
      <Flag code={team.flag} title={team.name} className="h-4 w-6" />
      <span className="truncate text-sm font-semibold text-white">
        {team.name}
      </span>
    </Link>
  );
}

/**
 * FotMob-style fixture row: kickoff time/date on the left, home v away across
 * the middle (flags + names), group badge on the right. No live scores in the
 * dataset yet, so the centre shows kickoff time.
 */
export function MatchRow({ fixture }: { fixture: Fixture }) {
  return (
    <div className="row">
      <div className="w-12 flex-none text-center text-[11px] leading-tight text-muted">
        <div>{shortDate(fixture.date)}</div>
        <div className="statnum text-xs text-white/80">
          {localTime(fixture.time)}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side name={fixture.team1} align="home" />
        <span className="px-1 text-xs font-semibold text-muted">v</span>
        <Side name={fixture.team2} align="away" />
      </div>
      <span className="hidden w-16 flex-none text-right text-[11px] text-muted sm:block">
        {fixture.group ? `Grp ${fixture.group}` : fixture.round}
      </span>
    </div>
  );
}
