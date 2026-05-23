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

export function ToastHost() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`card pointer-events-auto border ${BORDER[t.kind]} bg-pitch-panel p-3 shadow-glow`}
        >
          <div className="flex items-start gap-2">
            <span className="text-base leading-5">{ICONS[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 break-words text-xs text-muted">
                  {t.message}
                </p>
              )}
              {t.href && (
                <a
                  href={t.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-grass hover:underline"
                >
                  View on OKLink ↗
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-white"
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
