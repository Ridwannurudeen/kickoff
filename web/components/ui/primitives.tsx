import Link from "next/link";
import type { ReactNode } from "react";

/** Section eyebrow + optional right-aligned action link. */
export function SectionHeader({
  label,
  action,
}: {
  label: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="label">{label}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-xs font-medium text-grass hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/** Surface card. `interactive` adds hover lift; `href` makes it a link. */
export function Card({
  children,
  className = "",
  interactive,
  href,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  href?: string;
}) {
  const cls = `${interactive || href ? "card-link" : "card"} ${className}`;
  return href ? (
    <Link href={href} className={`block ${cls}`}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** Label + big tabular number. */
export function StatTile({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className="card p-3">
      <p className="label">{label}</p>
      <p
        className={`statnum mt-1 text-2xl ${accent ? "text-grass" : "text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

type Tone = "live" | "upcoming" | "closed" | "completed" | "neutral" | "grass";

const DOT: Record<Tone, string> = {
  live: "bg-live",
  upcoming: "bg-muted",
  closed: "bg-no/70",
  completed: "bg-grass",
  neutral: "bg-muted",
  grass: "bg-grass",
};

/** Small status dot; `pulse` for live. */
export function StatusDot({
  tone = "neutral",
  pulse,
}: {
  tone?: Tone;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-block h-2 w-2 flex-none rounded-full ${DOT[tone]} ${pulse ? "animate-pulse-dot" : ""}`}
    />
  );
}

/** Compact badge/chip. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "grass" | "live" | "honor";
}) {
  const cls =
    tone === "grass"
      ? "border-grass/40 text-grass"
      : tone === "live"
        ? "border-live/50 text-live"
        : tone === "honor"
          ? "border-honor/40 text-honor"
          : "border-pitch-border text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

/** Generic dense list row: left slot · title/subtitle · right slot. */
export function ListRow({
  left,
  title,
  subtitle,
  right,
  href,
}: {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted">{subtitle}</div>
        )}
      </div>
      {right}
    </>
  );
  return href ? (
    <Link href={href} className="row-link">
      {body}
    </Link>
  ) : (
    <div className="row">{body}</div>
  );
}
