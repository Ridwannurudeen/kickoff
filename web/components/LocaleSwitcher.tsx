"use client";

import { useState } from "react";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useT } from "./I18nProvider";

export function LocaleSwitcher() {
  const { locale, setLocale } = useT();
  const [open, setOpen] = useState(false);
  const current =
    SUPPORTED_LOCALES.find((l) => l.code === locale) ?? SUPPORTED_LOCALES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost !py-1.5 !px-3 text-xs"
        aria-label="Change language"
      >
        {current.code.toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="card absolute right-0 z-20 mt-2 w-40 overflow-hidden p-1">
            {SUPPORTED_LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLocale(l.code as Locale);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-honor/60 ${
                  l.code === locale ? "text-grass" : "text-white"
                }`}
              >
                <span>{l.label}</span>
                <span className="font-mono text-xs text-muted">
                  {l.code.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
