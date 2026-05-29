"use client";

/**
 * FAQ — 6-question accordion. Native <details>/<summary>, no client JS.
 *
 * Q+A copy is locked to the design doc. Each item is a tabula card; the arrow
 * rotates on `group-open`. Staggered fade-up: 80 + i*60 ms.
 */

"use client";

import { useT } from "@/components/I18nProvider";
import type { TranslationKey } from "@/lib/i18n";

type QA = {
  question: TranslationKey;
  answer: TranslationKey;
};

const ITEMS: QA[] = [
  {
    question: "faq_q1",
    answer: "faq_a1",
  },
  {
    question: "faq_q2",
    answer: "faq_a2",
  },
  {
    question: "faq_q3",
    answer: "faq_a3",
  },
  {
    question: "faq_q4",
    answer: "faq_a4",
  },
  {
    question: "faq_q5",
    answer: "faq_a5",
  },
  {
    question: "faq_q6",
    answer: "faq_a6",
  },
];

export function FAQ(): JSX.Element {
  const { t } = useT();
  return (
    <section aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="mb-6 font-display text-2xl tracking-wide sm:text-3xl"
      >
        {t("faq_heading")}
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
                {t(item.question)}
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
              {t(item.answer)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}