"use client";

import { useToasts, type ToastKind } from "@/lib/toast";

const ICONS: Record<ToastKind, string> = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
  pending: "⏳",
};

const BORDER: Record<ToastKind, string> = {
  success: "border-grass/50",
  error: "border-no/50",
  info: "border-pitch-border",
  pending: "border-grass/30",
};

const TITLE_TONE: Record<ToastKind, string> = {
  success: "text-grass",
  error: "text-no",
  info: "text-white",
  pending: "text-honor",
};

export function ToastHost() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`card pointer-events-auto max-w-sm border ${BORDER[t.kind]} animate-fade-up bg-pitch-panel p-3 shadow-glow`}
        >
          <div className="flex items-start gap-2">
            {t.kind === "pending" ? (
              <span
                className="mt-1 inline-block h-2 w-2 flex-shrink-0 animate-pulse-dot rounded-full bg-honor"
                aria-hidden
              />
            ) : (
              <span className="text-base leading-5" aria-hidden>
                {ICONS[t.kind]}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${TITLE_TONE[t.kind]}`}>
                {t.title}
              </p>
              {t.message && (
                <p className="mt-0.5 break-words text-xs text-muted">
                  {t.message}
                </p>
              )}
              {t.href && (
                <a
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-grass hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  View on OKLink ↗
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-md px-1 text-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-honor/60"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
