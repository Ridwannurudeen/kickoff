/**
 * FAQ — 6-question accordion. Native <details>/<summary>, no client JS.
 *
 * Q+A copy is locked to the design doc. Each item is a tabula card; the arrow
 * rotates on `group-open`. Staggered fade-up: 80 + i*60 ms.
 */

type QA = {
  question: string;
  answer: string;
};

const ITEMS: QA[] = [
  {
    question: "Is this real money or play money?",
    answer:
      "Play money. There are no entry fees against an outcome, no payouts tied to predictions, and no betting markets. Quests are free. The Companion charges a tiny per-call fee in OKB for the service itself, with a free tier always available.",
  },
  {
    question: "Do I need crypto to try Kickoff?",
    answer:
      "You need an EVM wallet (OKX Wallet works best) and a small amount of testnet OKB for gas. The faucet link in the header gets you the OKB for free; everything else is just clicking and signing.",
  },
  {
    question: "What does “halal-by-design” mean here?",
    answer:
      "Three engineering rules: no entry fees against an outcome, no payouts tied to predictions, no randomised mints. The on-chain code itself contains no betting primitives — only Fan ID, quests, trophies, agents, and a verifier-style oracle that says “this match’s result was X”.",
  },
  {
    question: "What’s a Bring-Your-Own-Agent league?",
    answer:
      "A free-skill tournament for AI agents on X Layer. Anyone can register an agent (their backend, their LLM, their logic), enter it into the active season, commit predictions before kickoff, and reveal afterwards. Top-ranked agent’s owner mints the AI Champion trophy. No money in, no money out — reputation only.",
  },
  {
    question: "What is X Layer and why use it?",
    answer:
      "X Layer is OKX’s OP Stack L2. Gas is paid in OKB. Sub-cent transactions, OKX Wallet works natively, OKLink for verifiable proof. Kickoff turns the World Cup attention spike into real on-chain transactions on X Layer.",
  },
  {
    question: "Where do I see the on-chain proof?",
    answer:
      "Every state-changing action — mint, quest complete, prediction commit/reveal, agent call, trophy claim — emits an event linked to the public OKLink explorer. The “Verifiable on chain” section above lists six representative transactions from this build.",
  },
];

export function FAQ(): JSX.Element {
  return (
    <section aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="mb-6 font-display text-2xl tracking-wide sm:text-3xl"
      >
        FAQ
      </h2>
      <div>
        {ITEMS.map((item, i) => (
          <details
            key={item.question}
            className="tabula card group mb-3 animate-fade-up overflow-hidden"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <span className="font-display text-base tracking-wide text-white">
                {item.question}
              </span>
              <span
                aria-hidden
                className="flex-none text-honor transition-transform group-open:rotate-90"
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 2 L 10 7 L 4 12" />
                </svg>
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-marble">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
