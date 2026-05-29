"use client";

/**
 * OnChainProof — verifiable receipts grid. Six real X Layer testnet
 * transactions from this build, each linked to its OKLink receipt. Proves
 * the v2 platform isn't a mockup: AgentLeague opened a season, BYO predicted
 * + scored, and each of the three first-party agents wrote a real LLM reply
 * on chain via AgentRegistry.submitResult.
 *
 * Stagger fade-up: card i gets (i * 60 + 120) ms.
 */

"use client";

import { useT } from "@/components/I18nProvider";
import type { TranslationKey } from "@/lib/i18n";

type Proof = {
  label: string;
  description: TranslationKey;
  abbreviated: string;
  href: string;
};

const OKLINK = "https://www.oklink.com/xlayer-test/tx/";

const PROOFS: Proof[] = [
  {
    label: "AgentLeague.openSeason",
    description: "proof_open_season",
    abbreviated: "0x5c0db17e…b51ab2",
    href:
      OKLINK +
      "0x5c0db17e1ece60d6751b0caf36ca3f3400e1ed9221d7369ce0dd6570aab51ab2",
  },
  {
    label: "BYO.submitPrediction",
    description: "proof_submit_prediction",
    abbreviated: "0x1832db03…f3606ec",
    href:
      OKLINK +
      "0x1832db0349509010c9d48e11385d1904728c39ab8c98ca9361398692ef3606ec",
  },
  {
    label: "BYO.scorePrediction",
    description: "proof_score_prediction",
    abbreviated: "0xa9b688d1…e946f24",
    href:
      OKLINK +
      "0xa9b688d1724cc80cae9a30ad3b2a30e65a0c0ba5001217d955674ce35e946f24",
  },
  {
    label: "match-analyst.submitResult",
    description: "proof_match_analyst",
    abbreviated: "0xd97e0d3f…19b6038",
    href:
      OKLINK +
      "0xd97e0d3fb725ad533f7e77a7373c95f04cb935949e6437f2f47b71f8119b6038",
  },
  {
    label: "personal-stats.submitResult",
    description: "proof_personal_stats",
    abbreviated: "0x5a6bee5c…9505c51d",
    href:
      OKLINK +
      "0x5a6bee5c32daf4f68695ba8b002004e1b79863c707869ae1123ae1d89505c51d",
  },
  {
    label: "highlights.submitResult",
    description: "proof_highlights",
    abbreviated: "0x3e8dd75c…3a9d9c94",
    href:
      OKLINK +
      "0x3e8dd75cf73d6ac182774996c90add0a2dd6606a1fbd01900de289353a9d9c94",
  },
];

export function OnChainProof(): JSX.Element {
  const { t } = useT();
  return (
    <section aria-labelledby="onchain-proof-heading">
      <h2
        id="onchain-proof-heading"
        className="mb-2 font-display text-2xl tracking-wide sm:text-3xl"
      >
        {t("proof_heading")}
      </h2>
      <p className="mb-6 text-sm text-muted">{t("proof_intro")}</p>
      <div className="divider-classical" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {PROOFS.map((proof, i) => (
          <a
            key={proof.label}
            href={proof.href}
            target="_blank"
            rel="noopener noreferrer"
            className="tabula card group flex animate-fade-up flex-col gap-2 p-4 transition-colors hover:border-grass/40"
            style={{ animationDelay: `${i * 60 + 120}ms` }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-grass">
              {proof.label}
            </span>
            <p className="text-sm text-white/90">{t(proof.description)}</p>
            <span className="mt-1 font-mono text-xs text-muted group-hover:text-grass">
              {proof.abbreviated}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}