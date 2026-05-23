"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { maxUint256 } from "viem";
import { erc20Abi, fpmmAbi, parlayBookAbi } from "@/lib/abis";
import { ADDRESSES, PARLAY_CONFIGURED, txUrl } from "@/lib/config";
import { publicClient } from "@/lib/client";
import { fmtPct, fmtUsd, formatUsdc, parseUsdc } from "@/lib/format";
import { combinedOdds, legDecimalOdds, useParlayConfig } from "@/lib/parlay";
import { useToasts } from "@/lib/toast";
import { useOnCorrectChain } from "@/lib/useNetwork";
import type { Market } from "@/lib/types";

/** A leg in the slip: a market, the chosen outcome, and its raw 1e18 price. */
interface Leg {
  market: Market;
  outcomeIndex: number;
  /** raw prices()[outcome] (1e18-scaled), so odds mirror the contract exactly. */
  priceWei: bigint;
}

const MIN_LEGS = 2;
const MAX_LEGS = 8;

export function ParlayBuilder({ markets }: { markets: Market[] }) {
  const { isConnected } = useAccount();
  const { address } = useAccount();
  const { isCorrect, switchToXLayer } = useOnCorrectChain();
  const { data: cfg } = useParlayConfig();
  const { push } = useToasts();

  const [legs, setLegs] = useState<Leg[]>([]);
  const [pickMarket, setPickMarket] = useState("");
  const [pickOutcome, setPickOutcome] = useState(0);
  const [stake, setStake] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  // markets a leg can be added from: open, ≥2 outcomes, not already in the slip.
  const usedAddrs = useMemo(
    () => new Set(legs.map((l) => l.market.address.toLowerCase())),
    [legs],
  );
  const available = useMemo(
    () =>
      markets.filter(
        (m) =>
          !m.closed &&
          m.outcomeCount >= 2 &&
          !usedAddrs.has(m.address.toLowerCase()),
      ),
    [markets, usedAddrs],
  );
  const selectedMarket = available.find((m) => m.address === pickMarket);

  const stakeBig = useMemo(() => parseUsdc(stake), [stake]);

  // combined decimal odds from each leg's raw price (mirrors the contract).
  const combined = useMemo(() => {
    if (legs.length < MIN_LEGS) return 0;
    if (legs.some((l) => l.priceWei <= 0n)) return 0;
    return combinedOdds(legs.map((l) => l.priceWei));
  }, [legs]);
  const stakeNum = Number(stake) || 0;
  const potentialPayout = combined > 0 ? stakeNum * combined : 0;
  const payoutBig =
    combined > 0
      ? (stakeBig * BigInt(Math.round(combined * 1e6))) / 1_000_000n
      : 0n;

  const maxPayout = cfg?.maxPayout ?? 0n;
  const freeLiquidity = cfg?.freeLiquidity ?? 0n;
  const exceedsCap = maxPayout > 0n && payoutBig > maxPayout;
  const noEdge = combined > 0 && payoutBig > 0n && payoutBig <= stakeBig;

  // --- balance / allowance (book is the spender) ---
  const { data: usdcBal } = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: PARLAY_CONFIGURED && !!address },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.parlayBook] : undefined,
    query: { enabled: PARLAY_CONFIGURED && !!address },
  });

  const { writeContractAsync } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: !!pendingHash },
  });

  const needsApproval =
    typeof allowance === "bigint" && stakeBig > allowance && stakeBig > 0n;

  async function addLeg() {
    if (!selectedMarket || legs.length >= MAX_LEGS) return;
    setAdding(true);
    try {
      const prices = (await publicClient().readContract({
        address: selectedMarket.address,
        abi: fpmmAbi,
        functionName: "prices",
      })) as bigint[];
      const priceWei = prices[pickOutcome] ?? 0n;
      setLegs((prev) => [
        ...prev,
        { market: selectedMarket, outcomeIndex: pickOutcome, priceWei },
      ]);
      setPickMarket("");
      setPickOutcome(0);
    } catch (e) {
      push({
        kind: "error",
        title: "Couldn't read odds",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      setAdding(false);
    }
  }

  function removeLeg(i: number) {
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onApprove() {
    setBusy(true);
    const id = push({ kind: "pending", title: "Approving USDC…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [ADDRESSES.parlayBook, maxUint256],
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

  async function onPlace() {
    if (legs.length < MIN_LEGS || stakeBig <= 0n) return;
    setBusy(true);
    const id = push({ kind: "pending", title: "Placing parlay…", ttl: 0 });
    try {
      const marketAddrs = legs.map((l) => l.market.address);
      const outcomes = legs.map((l) => l.outcomeIndex);
      const hash = await writeContractAsync({
        address: ADDRESSES.parlayBook,
        abi: parlayBookAbi,
        functionName: "placeParlay",
        args: [marketAddrs, outcomes, stakeBig],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: `Parlay placed (${legs.length} legs)`,
        message: `${fmtUsd(stakeNum)} to win ${fmtUsd(potentialPayout)}`,
        href: txUrl(hash),
        ttl: 9000,
      });
      setLegs([]);
      setStake("");
    } catch (e) {
      push({
        kind: "error",
        title: "Parlay failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  const disabled = busy || confirming;
  const canPlace =
    legs.length >= MIN_LEGS &&
    legs.length <= MAX_LEGS &&
    stakeBig > 0n &&
    !exceedsCap &&
    !noEdge;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* leg picker */}
      <div className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Add a leg</h2>
        <p className="mb-4 text-xs text-muted">
          Combine {MIN_LEGS}–{MAX_LEGS} markets. Each leg must be a different
          market.
        </p>

        {available.length === 0 ? (
          <p className="rounded-lg bg-pitch-bg py-6 text-center text-sm text-muted">
            {markets.length === 0
              ? "No markets available."
              : "Every open market is already in your slip."}
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Market</label>
              <select
                value={pickMarket}
                onChange={(e) => {
                  setPickMarket(e.target.value);
                  setPickOutcome(0);
                }}
                className="input"
              >
                <option value="">Select a market…</option>
                {available.map((m) => (
                  <option key={m.address} value={m.address}>
                    {m.question}
                  </option>
                ))}
              </select>
            </div>

            {selectedMarket && (
              <div>
                <label className="mb-1 block text-xs text-muted">Outcome</label>
                <div className="grid gap-2">
                  {selectedMarket.outcomes.map((o) => (
                    <button
                      key={o.index}
                      onClick={() => setPickOutcome(o.index)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        pickOutcome === o.index
                          ? "border-grass bg-grass/15"
                          : "border-pitch-border hover:border-grass/40"
                      }`}
                    >
                      <span className="text-sm font-semibold text-white">
                        {o.label}
                      </span>
                      <span className="text-xs font-bold text-muted">
                        {o.probability > 0
                          ? `${(1 / o.probability).toFixed(2)}×`
                          : "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={addLeg}
              disabled={!selectedMarket || legs.length >= MAX_LEGS || adding}
              className="btn-ghost w-full"
            >
              {legs.length >= MAX_LEGS
                ? `Max ${MAX_LEGS} legs reached`
                : adding
                  ? "Reading odds…"
                  : "Add to slip"}
            </button>
          </div>
        )}
      </div>

      {/* bet slip */}
      <div className="card flex flex-col p-4">
        <h2 className="mb-3 text-sm font-bold">
          Parlay slip{" "}
          <span className="text-muted">
            ({legs.length}/{MAX_LEGS})
          </span>
        </h2>

        {legs.length === 0 ? (
          <p className="rounded-lg bg-pitch-bg py-8 text-center text-sm text-muted">
            Add at least {MIN_LEGS} legs to build a parlay.
          </p>
        ) : (
          <div className="space-y-2">
            {legs.map((l, i) => {
              const o = l.market.outcomes[l.outcomeIndex];
              const dec = legDecimalOdds(l.priceWei);
              return (
                <div
                  key={`${l.market.address}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-pitch-bg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {l.market.question}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {o?.label ?? `Outcome ${l.outcomeIndex + 1}`} ·{" "}
                      {o ? fmtPct(o.probability, 0) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-grass">
                      {dec > 0 ? `${dec.toFixed(2)}×` : "—"}
                    </span>
                    <button
                      onClick={() => removeLeg(i)}
                      className="text-muted hover:text-no"
                      aria-label="Remove leg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* stake + quote */}
        <label className="mb-1 mt-4 block text-xs text-muted">
          Stake (USDC)
        </label>
        <div className="relative">
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={stake}
            onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ""))}
            className="input pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
            USDC
          </span>
        </div>
        {typeof usdcBal === "bigint" && (
          <p className="mt-1 text-right text-xs text-muted">
            Balance: {fmtUsd(formatUsdc(usdcBal))}
          </p>
        )}

        <div className="mt-4 space-y-2 rounded-lg bg-pitch-bg p-3 text-xs">
          <Row label="Legs" value={`${legs.length}`} />
          <Row
            label="Combined odds"
            value={combined > 0 ? `${combined.toFixed(2)}×` : "—"}
          />
          <Row
            label="Potential payout"
            value={potentialPayout > 0 ? fmtUsd(potentialPayout) : "—"}
            accent
          />
          {cfg && (
            <Row
              label="House free liquidity"
              value={fmtUsd(formatUsdc(freeLiquidity))}
            />
          )}
          {cfg && (
            <Row
              label="Max payout / parlay"
              value={fmtUsd(formatUsdc(maxPayout))}
            />
          )}
        </div>

        {noEdge && (
          <p className="mt-3 rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-xs text-no">
            Payout must exceed the stake. Pick legs with longer odds.
          </p>
        )}
        {exceedsCap && (
          <p className="mt-3 rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-xs text-no">
            Payout {fmtUsd(potentialPayout)} exceeds the house cap of{" "}
            {fmtUsd(formatUsdc(maxPayout))}. Lower your stake or trim a leg.
          </p>
        )}

        {/* action */}
        <div className="mt-4">
          {!isConnected ? (
            <p className="rounded-lg bg-pitch-bg py-3 text-center text-sm text-muted">
              Connect your wallet to place a parlay
            </p>
          ) : !isCorrect ? (
            <button onClick={switchToXLayer} className="btn-primary w-full">
              Switch network
            </button>
          ) : needsApproval ? (
            <button
              onClick={onApprove}
              disabled={disabled || stakeBig <= 0n}
              className="btn-primary w-full"
            >
              {busy ? "Approving…" : "Approve USDC"}
            </button>
          ) : (
            <button
              onClick={onPlace}
              disabled={disabled || !canPlace}
              className="btn-primary w-full"
            >
              {busy || confirming
                ? "Confirming…"
                : legs.length < MIN_LEGS
                  ? `Add ${MIN_LEGS - legs.length} more leg${
                      MIN_LEGS - legs.length === 1 ? "" : "s"
                    }`
                  : "Place parlay"}
            </button>
          )}
        </div>
      </div>
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

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.split("\n")[0];
    return m.length > 120 ? `${m.slice(0, 117)}…` : m;
  }
  return "Unknown error";
}
