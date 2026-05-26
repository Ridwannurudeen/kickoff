"use client";

import { useT } from "./I18nProvider";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="border-t border-pitch-border py-6 text-center text-xs text-muted">
      Kickoff · {t("brand_tagline")} · X Layer
    </footer>
  );
}
