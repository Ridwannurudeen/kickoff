"use client";

/**
 * CTASection — final landing CTA block placed above the TxTicker.
 *
 * Tabula card with a LaurelWreath watermark, live-on-X-Layer eyebrow,
 * font-display headline, dual CTAs (browse quests + fork the BYO agent), and a
 * BuiltOnXLayerBadge row underneath. Stagger fade-up: 0/80/140/200/280 ms.
 */

"use client";

import Link from "next/link";

import { BuiltOnXLayerBadge } from "@/components/BuiltOnXLayerBadge";
import { useT } from "@/components/I18nProvider";

export function CTASection(): JSX.Element {
  const { t } = useT();
  return (
    <section aria-labelledby="cta-heading">
      <div className="card flex flex-col items-center gap-3 p-5 text-center md:flex-row md:justify-between md:text-left">
        <div className="min-w-0">
          <p className="label text-grass">{t("cta_eyebrow")}</p>
          <h2
            id="cta-heading"
            className="mt-1 font-display text-xl tracking-wide sm:text-2xl"
          >
            {t("cta_headline")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("cta_subhead")}</p>
        </div>
        <div className="flex flex-none flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/quests" className="btn-primary">
              {t("cta_browse_quests")}
            </Link>
            <a
              href="https://github.com/Ridwannurudeen/kickoff/tree/main/agents/v2-example-byo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              {t("cta_fork_agent")}
            </a>
          </div>
          <BuiltOnXLayerBadge size="sm" />
          <p className="text-xs text-muted">{t("cta_footnote")}</p>
        </div>
      </div>
    </section>
  );
}
