"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { maxUint256 } from "viem";
import { erc20Abi, fpmmAbi } from "@/lib/abis";
import { ADDRESSES, FACTORY_CONFIGURED, txUrl } from "@/lib/config";
import { fmtPct, fmtUsd, fmtShares, formatUsdc, parseUsdc } from "@/lib/format";
import { priceImpact, quoteBuy, quoteSell } from "@/lib/trade";
import { useToasts } from "@/lib/toast";
import { useOnCorrectChain } from "@/lib/useNetwork";
import type { Market } from "@/lib/types";

type Mode = "buy" | "sell";

export function TradePanel({
  market,
  selected,
  onSelect,
}: {
  market: Market;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { address, isConnected } = useAccount();
  const { isCorrect, switchToXLayer } = useOnCorrectChain();
  const { push } = useToasts();

  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(100); // 1%
  const [showAdv, setShowAdv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<{ shares: number; impact: number } | null>(
    null,
  );

  const demo = !FACTORY_CONFIGURED || market.isMock;
  const outcome = market.outcomes[selected];
  const sideProb = outcome?.probability ?? 0;
  const sideLabel = outcome?.label ?? `Outcome ${selected + 1}`;

  // --- balances / allowance (real mode only) ---
  const { data: usdcBal } = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !demo && !!address },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, market.address] : undefined,
    query: { enabled: !demo && !!address },
  });

  const { writeContractAsync } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: !!pendingHash },
  });

  const amountBig = useMemo(() => parseUsdc(amount), [amount]);
  const needsApproval =
    !demo &&
    mode === "buy" &&
    typeof allowance === "bigint" &&
    amountBig > allowance;

  // --- live quote ---
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const n = Number(amount);
      if (!amount || Number.isNaN(n) || n <= 0) {
        setQuote(null);
        return;
      }
      if (demo) {
        const shares = n / Math.max(0.02, sideProb);
        const impact = Math.min(0.4, n / 5000);
        setQuote({ shares: shares * (1 - impact), impact });
        return;
      }
      try {
        if (mode === "buy") {
          const q = await quoteBuy(
            market.address,
            selected,
            amountBig,
            slippageBps,
          );
          const sharesOut = Number(q.sharesOut) / 1e6;
          if (!cancelled)
            setQuote({
              shares: sharesOut,
              impact: priceImpact(n, sharesOut, sideProb),
            });
        } else {
          // sell quote needs a binary search at submit time; no live quote here.
          setQuote(null);
        }
      } catch {
        if (!cancelled) setQuote(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [
    amount,
    selected,
    mode,
    slippageBps,
    demo,
    amountBig,
    market.address,
    sideProb,
  ]);

  const maxPayout = quote ? quote.shares : 0; // each winning share redeems for $1

  function notifyDemo() {
    push({
      kind: "info",
      title: "Demo mode",
      message:
        "Contracts aren't deployed yet (NEXT_PUBLIC_FACTORY unset). This is a preview of the bet slip.",
      ttl: 5000,
    });
  }

  async function onApprove() {
    if (demo) return notifyDemo();
    setBusy(true);
    const id = push({ kind: "pending", title: "Approving USDC…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [market.address, maxUint256],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: "Approval submitted",
        href: txUrl(hash),
        ttl: 8000,
      });
      await refetchAllowance();
    } catch (e) {
      push({
        kind: "error",
        title: "Approval failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  async function onBuy() {
    if (demo) return notifyDemo();
    if (amountBig <= 0n) return;
    setBusy(true);
    const id = push({ kind: "pending", title: "Placing bet…", ttl: 0 });
    try {
      const q = await quoteBuy(
        market.address,
        selected,
        amountBig,
        slippageBps,
      );
      const hash = await writeContractAsync({
        address: market.address,
        abi: fpmmAbi,
        functionName: "buy",
        args: [selected, amountBig, q.minOut],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: `Bought ${sideLabel}`,
        message: `${fmtUsd(Number(amount))} on ${market.subject}`,
        href: txUrl(hash),
        ttl: 9000,
      });
      setAmount("");
    } catch (e) {
      push({
        kind: "error",
        title: "Trade failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  async function onSell() {
    if (demo) return notifyDemo();
    const sharesToSell = Number(amount);
    if (!sharesToSell || sharesToSell <= 0) return;
    setBusy(true);
    const id = push({ kind: "pending", title: "Selling…", ttl: 0 });
    try {
      const targetShares = BigInt(Math.floor(sharesToSell * 1e6));
      const reserves = (await readReserve(market.address, selected)) ?? 0n;
      const sq = await quoteSell(
        market.address,
        selected,
        targetShares,
        reserves,
        slippageBps,
      );
      const hash = await writeContractAsync({
        address: market.address,
        abi: fpmmAbi,
        functionName: "sell",
        args: [selected, sq.returnAmount, sq.maxSharesIn],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: `Sold ${sideLabel}`,
        message: `≈ ${fmtUsd(formatUsdc(sq.returnAmount))} for ${fmtShares(sharesToSell)} shares`,
        href: txUrl(hash),
        ttl: 9000,
      });
      setAmount("");
    } catch (e) {
      push({
        kind: "error",
        title: "Sell failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  const disabled = busy || confirming || market.closed;
  const amountLabel = mode === "buy" ? "Amount (USDC)" : "Shares to sell";

  return (
    <div className="card p-4">
      {/* buy / sell toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-pitch-bg p-1">
        {(["buy", "sell"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setAmount("");
            }}
            className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m ? "bg-pitch-card text-white" : "text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* outcome picker (N outcomes) */}
      <p className="mb-2 text-xs text-muted">Outcome</p>
      <div className="mb-4 grid gap-2">
        {market.outcomes.map((o) => (
          <button
            key={o.index}
            onClick={() => onSelect(o.index)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
              selected === o.index
                ? "border-grass bg-grass/15"
                : "border-pitch-border hover:border-grass/40"
            }`}
          >
            <span className="text-sm font-semibold text-white">{o.label}</span>
            <span
              className={`text-sm font-bold ${
                selected === o.index ? "text-grass" : "text-muted"
              }`}
            >
              {fmtPct(o.probability, 0)}
            </span>
          </button>
        ))}
      </div>

      {/* amount */}
      <label className="mb-1 block text-xs text-muted">{amountLabel}</label>
      <div className="relative">
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="input pr-16"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
          {mode === "buy" ? "USDC" : "shares"}
        </span>
      </div>
      {!demo && mode === "buy" && typeof usdcBal === "bigint" && (
        <p className="mt-1 text-right text-xs text-muted">
          Balance: {fmtUsd(formatUsdc(usdcBal))}
        </p>
      )}

      {/* quote summary */}
      <div className="mt-4 space-y-2 rounded-lg bg-pitch-bg p-3 text-xs">
        <Row label="Outcome" value={sideLabel} />
        <Row label="Probability" value={fmtPct(sideProb)} />
        {mode === "buy" && (
          <>
            <Row
              label="Est. shares"
              value={quote ? fmtShares(quote.shares) : "—"}
            />
            <Row
              label="Avg price"
              value={
                quote && quote.shares > 0
                  ? `$${(Number(amount) / quote.shares).toFixed(3)}`
                  : "—"
              }
            />
            <Row
              label="Max payout"
              value={maxPayout > 0 ? fmtUsd(maxPayout) : "—"}
              accent
            />
            <Row
              label="Price impact"
              value={quote ? fmtPct(quote.impact, 2) : "—"}
            />
          </>
        )}
        <button
          onClick={() => setShowAdv((v) => !v)}
          className="text-grass hover:underline"
        >
          {showAdv ? "Hide" : "Advanced"}
        </button>
        {showAdv && (
          <div className="pt-1">
            <label className="mb-1 block text-muted">
              Slippage tolerance: {(slippageBps / 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value))}
              className="w-full accent-grass"
            />
          </div>
        )}
      </div>

      {/* action */}
      <div className="mt-4">
        {!isConnected ? (
          <p className="rounded-lg bg-pitch-bg py-3 text-center text-sm text-muted">
            Connect your wallet to trade
          </p>
        ) : !isCorrect && !demo ? (
          <button onClick={switchToXLayer} className="btn-primary w-full">
            Switch network to trade
          </button>
        ) : mode === "buy" ? (
          needsApproval ? (
            <button
              onClick={onApprove}
              disabled={disabled}
              className="btn-primary w-full"
            >
              {busy ? "Approving…" : "Approve USDC"}
            </button>
          ) : (
            <button
              onClick={onBuy}
              disabled={disabled || amountBig <= 0n}
              className="btn-primary w-full"
            >
              {busy || confirming ? "Confirming…" : `Buy ${sideLabel}`}
            </button>
          )
        ) : (
          <button
            onClick={onSell}
            disabled={disabled || !amount}
            className="btn-primary w-full"
          >
            {busy || confirming ? "Confirming…" : `Sell ${sideLabel}`}
          </button>
        )}
      </div>

      {demo && (
        <p className="mt-3 text-center text-[11px] text-muted">
          Demo mode — connect a deployed factory via env to trade for real.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={accent ? "font-semibold text-grass" : "text-white"}>
        {value}
      </span>
    </div>
  );
}

async function readReserve(
  market: `0x${string}`,
  outcomeIndex: number,
): Promise<bigint | undefined> {
  const { publicClient } = await import("@/lib/client");
  try {
    const reserves = (await publicClient().readContract({
      address: market,
      abi: fpmmAbi,
      functionName: "getReserves",
    })) as bigint[];
    return reserves[outcomeIndex];
  } catch {
    return undefined;
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.split("\n")[0];
    return m.length > 120 ? `${m.slice(0, 117)}…` : m;
  }
  return "Unknown error";
}
