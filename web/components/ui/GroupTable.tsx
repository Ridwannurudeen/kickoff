import Link from "next/link";
import { teamsByGroup } from "@/lib/teams";
import { Flag } from "@/components/Flag";

/**
 * Compact group standings table. Pre-tournament there are no results, so P/Pts
 * render as 0 (honest). `highlightId` shades the current team's row.
 */
export function GroupTable({
  group,
  highlightId,
}: {
  group: string;
  highlightId?: number;
}) {
  const teams = teamsByGroup(group);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-pitch-line px-3 py-2">
        <span className="label">Group {group}</span>
        <span className="label">P · Pts</span>
      </div>
      {teams.map((t, i) => (
        <Link
          key={t.id}
          href={`/team/${t.id}`}
          className={`row-link ${highlightId === t.id ? "bg-pitch-raised" : ""}`}
        >
          <span className="statnum w-4 flex-none text-center text-xs text-muted">
            {i + 1}
          </span>
          <Flag code={t.flag} title={t.name} className="h-4 w-6 flex-none" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
            {t.name}
          </span>
          <span className="statnum flex-none text-xs text-muted">0 · 0</span>
        </Link>
      ))}
    </div>
  );
}
