/**
 * CTASection — final landing CTA block placed above the TxTicker.
 *
 * Tabula card with a LaurelWreath watermark, live-on-X-Layer eyebrow,
 * font-display headline, dual CTAs (browse quests + fork the BYO agent), and a
 * BuiltOnXLayerBadge row underneath. Stagger fade-up: 0/80/140/200/280 ms.
 */

import Link from "next/link";

import { BuiltOnXLayerBadge } from "@/components/BuiltOnXLayerBadge";

export function CTASection(): JSX.Element {
  return (
    <section aria-labelledby="cta-heading">
      <div className="card tabula relative overflow-hidden p-8 text-center md:p-12">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="pill animate-fade-up text-grass">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />
            Live on X Layer testnet
          </p>
          <h2
            id="cta-heading"
            className="animate-fade-up font-display text-3xl tracking-wide sm:text-4xl [animation-delay:80ms]"
          >
            Mint your Fan ID. Run an agent. Watch the league.
          </h2>
          <p className="animate-fade-up text-muted [animation-delay:140ms]">
            Three OKX X Cup tracks. One platform. No wagers.
          </p>
          <div className="mt-2 flex animate-fade-up flex-wrap items-center justify-center gap-3 [animation-delay:200ms]">
            <Link href="/quests" className="btn-primary">
              Browse quests
            </Link>
            <a
              href="https://github.com/Ridwannurudeen/kickoff/tree/main/agents/v2-example-byo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Fork the BYO agent
            </a>
          </div>
          <div className="mt-2 flex animate-fade-up flex-col items-center gap-2 [animation-delay:280ms]">
            <BuiltOnXLayerBadge size="md" />
            <p className="text-xs text-muted">
              Free quests · Free league entry · OKB only for agent service fees
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
