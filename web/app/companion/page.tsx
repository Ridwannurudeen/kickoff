"use client";

import { useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { toBytes, toHex } from "viem";
import { useT } from "@/components/I18nProvider";
import { AGENTS } from "@/lib/v2-catalog";
import { agentRegistryAbi } from "@/lib/v2-abis";
import { AGENT_REGISTRY_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import { txUrl } from "@/lib/config";
import { formatOkb } from "@/lib/format";
import { useToasts } from "@/lib/toast";
import { LaurelWreath } from "@/components/ornaments";

interface CompanionReply {
  id: number;
  prompt: string;
  reply: string;
  agentSlugs: string[];
  txHash?: `0x${string}`;
  caller?: `0x${string}`;
}

function shortAddr(a?: `0x${string}`): string {
  if (!a) return "you";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function CompanionPage() {
  const { t } = useT();
  const { address } = useAccount();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(AGENTS.map((a) => a.slug)),
  );
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<CompanionReply[]>([]);
  const [sending, setSending] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const { push, dismiss } = useToasts();

  const demo = !AGENT_REGISTRY_CONFIGURED;

  const totalWei = useMemo(() => {
    return AGENTS.filter((a) => selected.has(a.slug)).reduce(
      (sum, a) => sum + a.priceWei,
      0n,
    );
  }, [selected]);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function send() {
    if (!prompt.trim() || selected.size === 0) return;
    const agentSlugs = AGENTS.filter((a) => selected.has(a.slug)).map(
      (a) => a.slug,
    );
    const agentIds = AGENTS.filter((a) => selected.has(a.slug)).map(
      (a) => a.id,
    );
    setSending(true);

    if (demo) {
      // Demo path: synthesise a deterministic-feeling reply without burning
      // any gas. Real path fires composeAgents and waits for the off-chain
      // services to post submitResult — that wiring lands once the registry
      // is deployed.
      setTimeout(() => {
        setHistory((h) => [
          ...h,
          {
            id: Date.now(),
            prompt,
            reply: t("companion_offline_reply"),
            agentSlugs,
            caller: address,
          },
        ]);
        setPrompt("");
        setSending(false);
      }, 400);
      return;
    }

    const id = push({
      kind: "pending",
      title: t("companion_compose_label"),
      ttl: 0,
    });
    try {
      const payloadHex = toHex(toBytes(prompt));
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "composeAgents",
        args: [agentIds, payloadHex],
        value: totalWei,
      });
      push({
        kind: "success",
        title: t("companion_compose_label"),
        href: txUrl(hash),
        ttl: 9000,
      });
      setHistory((h) => [
        ...h,
        {
          id: Date.now(),
          prompt,
          reply: t("companion_thinking"),
          agentSlugs,
          txHash: hash,
          caller: address,
        },
      ]);
      setPrompt("");
    } catch (e) {
      push({
        kind: "error",
        title: t("common_error"),
        message: e instanceof Error ? e.message.split("\n")[0] : undefined,
        ttl: 6000,
      });
    } finally {
      dismiss(id);
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="animate-fade-up flex items-center gap-3 font-display text-3xl font-bold tracking-wide sm:text-4xl">
          {t("companion_title")}
          <LaurelWreath size={32} className="text-honor/60" />
        </h1>
        <p className="animate-fade-up [animation-delay:80ms] mt-1 text-sm text-muted">
          {t("companion_subtitle")}
        </p>
      </div>

      {/* Agent picker */}
      <section className="animate-fade-up [animation-delay:160ms]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("companion_pick_agents")}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {AGENTS.map((a) => {
            const active = selected.has(a.slug);
            return (
              <button
                key={a.slug}
                onClick={() => toggle(a.slug)}
                className={`card flex flex-col items-start gap-1 p-4 text-left transition-colors ${
                  active
                    ? "border-grass/60 ring-1 ring-grass/40"
                    : "hover:border-grass/30"
                }`}
              >
                <p className="font-bold text-white">{t(a.nameKey)}</p>
                <p className="text-xs text-muted">{t(a.descKey)}</p>
                <p className="mt-1 text-xs text-grass">{a.priceLabel}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("companion_input_placeholder")}
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) send();
            }}
          />
          <button
            onClick={send}
            disabled={!prompt.trim() || selected.size === 0 || sending}
            className="btn-primary"
          >
            {sending ? t("companion_thinking") : t("companion_send")}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {t("companion_total_cost")}:{" "}
          <span className="font-mono text-white">
            {formatOkb(totalWei)} OKB
          </span>
        </p>
      </section>

      <div className="divider-classical" />

      {/* Conversation — each message reads as an inscribed dedication slab. */}
      <section className="space-y-3">
        {history.length === 0 ? (
          <p className="tabula card py-8 text-center text-xs text-muted">
            {demo
              ? t("companion_demo_notice")
              : t("companion_input_placeholder")}
          </p>
        ) : (
          history.map((m) => (
            <article
              key={m.id}
              className="tabula card grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_3fr_1fr] md:items-start md:gap-4"
            >
              {/* LEFT — caller identity */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <span
                  aria-hidden
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-pitch-border bg-pitch-bg text-honor/80"
                >
                  ?
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold uppercase tracking-wide text-marble/70">
                    Querent
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {shortAddr(m.caller)}
                  </span>
                </div>
              </div>

              {/* CENTER — the inscription itself */}
              <div className="space-y-2">
                <p className="text-xs text-muted">{m.prompt}</p>
                <p className="whitespace-pre-wrap text-sm text-marble">
                  {m.reply}
                </p>
                <div className="flex flex-wrap gap-1">
                  {m.agentSlugs.map((s) => (
                    <span key={s} className="pill text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* RIGHT — on-chain witness */}
              <div className="flex items-start justify-start md:justify-end">
                {m.txHash ? (
                  <a
                    href={txUrl(m.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-honor px-2.5 py-0.5 text-[10px] font-semibold text-pitch-bg hover:opacity-90"
                  >
                    Inscribed on-chain ↗
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
                    <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-grass-glow" />
                    Pending
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
