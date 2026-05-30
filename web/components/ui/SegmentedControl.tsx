"use client";

/** Segmented tab control. Controlled: pass `active` + `onChange`. */
export function SegmentedControl<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex gap-1 rounded-lg border border-pitch-border bg-pitch-surface p-1 ${className}`}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`seg ${active === t.id ? "seg-active" : ""}`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className="ml-1 text-xs text-muted">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
