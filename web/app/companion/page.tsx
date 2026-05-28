"use client";

import { useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import {
  decodeAbiParameters,
  decodeEventLog,
  toBytes,
  toHex,
  type Hex,
  type Log,
} from "viem";
import { useT } from "@/components/I18nProvider";
import { AGENTS } from "@/lib/v2-catalog";
import { agentRegistryAbi } from "@/lib/v2-abis";
import { AGENT_REGISTRY_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import { txUrl } from "@/lib/config";
import { formatOkb } from "@/lib/format";
import { useToasts } from "@/lib/toast";
import { LaurelWreath } from "@/components/ornaments";
import { publicClient } from "@/lib/client";

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

type AgentCall = {
  callId: Hex;
  agentId: Hex;
};

const REPLY_TIMEOUT_MS = 60_000;
const REPLY_POLL_MS = 3_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function agentSlug(agentId: Hex): string {
  return (
    AGENTS.find((agent) => agent.id.toLowerCase() === agentId.toLowerCase())
      ?.slug ?? `${agentId.slice(0, 10)}...`
  );
}

function decodeTextReply(result: Hex): string {
  try {
    const [text] = decodeAbiParameters([{ type: "string" }], result) as [
      string,
    ];
    return text;
  } catch {
    return result;
  }
}

function decodeCalledLog(log: Log): AgentCall | null {
  try {
    const decoded = decodeEventLog({
      abi: agentRegistryAbi,
      data: log.data,
      topics: log.topics,
    }) as unknown as {
      eventName: string;
      args: { callId?: unknown; agentId?: unknown };
    };
    if (decoded.eventName !== "Called") return null;
    if (
      typeof decoded.args.callId !== "string" ||
      typeof decoded.args.agentId !== "string"
    ) {
      return null;
    }
    return {
      callId: decoded.args.callId as Hex,
      agentId: decoded.args.agentId as Hex,
    };
  } catch {
    return null;
  }
}

function decodeRepliedLog(
  log: Log,
): { callId: Hex; agentId: Hex; text: string } | null {
  try {
    const decoded = decodeEventLog({
      abi: agentRegistryAbi,
      data: log.data,
      topics: log.topics,
    }) as unknown as {
      eventName: string;
      args: { callId?: unknown; agentId?: unknown; result?: unknown };
    };
    if (decoded.eventName !== "Replied") return null;
    if (
      typeof decoded.args.callId !== "string" ||
      typeof decoded.args.agentId !== "string" ||
      typeof decoded.args.result !== "string"
    ) {
      return null;
    }
    return {
      callId: decoded.args.callId as Hex,
      agentId: decoded.args.agentId as Hex,
      text: decodeTextReply(decoded.args.result as Hex),
    };
  } catch {
    return null;
  }
}

function formatReplies(
  calls: AgentCall[],
  replies: Map<string, string>,
  timedOut = false,
): string {
  const lines = calls.map((call) => {
    const reply = replies.get(call.callId.toLowerCase());
    return `[${agentSlug(call.agentId)}]\n${reply ?? "Waiting for agent reply..."}`;
  });
  if (timedOut && replies.size < calls.length) {
    lines.push(
      "Some replies are still pending. The transaction is confirmed; refresh later or check the explorer if an agent service is delayed.",
    );
  }
  return lines.join("\n\n");
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
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
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
      const receipt = await publicClient().waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Transaction reverted.");
      }
      const calls = receipt.logs
        .map(decodeCalledLog)
        .filter((call): call is AgentCall => Boolean(call));
      const replyId = Date.now();
      push({
        kind: "success",
        title: t("companion_compose_label"),
        href: txUrl(hash),
        ttl: 9000,
      });
      setHistory((h) => [
        ...h,
        {
          id: replyId,
          prompt,
          reply:
            calls.length > 0
              ? formatReplies(calls, new Map())
              : "Transaction confirmed, but no agent call events were found in the receipt.",
          agentSlugs,
          txHash: hash,
          caller: address,
        },
      ]);
      setPrompt("");
      if (calls.length > 0) {
        void waitForReplies(replyId, calls, receipt.blockNumber);
      }
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

  async function waitForReplies(
    replyId: number,
    calls: AgentCall[],
    fromBlock: bigint,
  ): Promise<void> {
    const replies = new Map<string, string>();
    const wanted = new Set(calls.map((call) => call.callId.toLowerCase()));
    const deadline = Date.now() + REPLY_TIMEOUT_MS;
    while (Date.now() < deadline && replies.size < calls.length) {
      const logs = await publicClient().getLogs({
        address: V2_ADDRESSES.agentRegistry,
        fromBlock,
        toBlock: "latest",
      });
      for (const log of logs) {
        const reply = decodeRepliedLog(log);
        if (!reply) continue;
        const key = reply.callId.toLowerCase();
        if (wanted.has(key)) replies.set(key, reply.text);
      }
      setHistory((history) =>
        history.map((item) =>
          item.id === replyId
            ? { ...item, reply: formatReplies(calls, replies) }
            : item,
        ),
      );
      if (replies.size >= calls.length) return;
      await sleep(REPLY_POLL_MS);
    }
    setHistory((history) =>
      history.map((item) =>
        item.id === replyId
          ? { ...item, reply: formatReplies(calls, replies, true) }
          : item,
      ),
    );
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
