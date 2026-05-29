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
      <div className="card tabula relative overflow-hidden p-8 text-center md:p-12">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="pill animate-fade-up text-grass">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />
            {t("cta_eyebrow")}
          </p>
          <h2
            id="cta-heading"
            className="animate-fade-up font-display text-3xl tracking-wide sm:text-4xl [animation-delay:80ms]"
          >
            {t("cta_headline")}
          </h2>
          <p className="animate-fade-up text-muted [animation-delay:140ms]">
            {t("cta_subhead")}
          </p>
          <div className="mt-2 flex animate-fade-up flex-wrap items-center justify-center gap-3 [animation-delay:200ms]">
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
          <div className="mt-2 flex animate-fade-up flex-col items-center gap-2 [animation-delay:280ms]">
            <BuiltOnXLayerBadge size="md" />
            <p className="text-xs text-muted">{t("cta_footnote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}