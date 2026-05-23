"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { maxUint256 } from "viem";
import { erc20Abi, fpmmAbi } from "@/lib/abis";
import { ADDRESSES, FACTORY_CONFIGURED, txUrl } from "@/lib/config";
import { fmtUsd, formatUsdc, parseUsdc } from "@/lib/format";
import { useToasts } from "@/lib/toast";
import { useOnCorrectChain } from "@/lib/useNetwork";
import type { Market } from "@/lib/types";

type Mode = "add" | "remove";

export function LiquidityPanel({ market }: { market: Market }) {
  const { address, isConnected } = useAccount();
  const { isCorrect, switchToXLayer } = useOnCorrectChain();
  const { push } = useToasts();

  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const demo = !FACTORY_CONFIGURED || market.isMock;

  // --- LP balance / claimable fees / allowance / reserves (real mode only) ---
  const { data: lpBalance, refetch: refetchLp } = useReadContract({
    address: market.address,
    abi: fpmmAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !demo && !!address },
  });
  const { data: claimableFees, refetch: refetchFees } = useReadContract({
    address: market.address,
    abi: fpmmAbi,
    functionName: "feesWithdrawableBy",
    args: address ? [address] : undefined,
    query: { enabled: !demo && !!address },
  });
  const { data: reserves } = useReadContract({
    address: market.address,
    abi: fpmmAbi,
    functionName: "getReserves",
    query: { enabled: !demo },
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
  const lp = typeof lpBalance === "bigint" ? lpBalance : 0n;
  const fees = typeof claimableFees === "bigint" ? claimableFees : 0n;

  // TVL = sum of outcome reserves (each 6-dec collateral-equivalent).
  const tvl = useMemo(() => {
    if (!Array.isArray(reserves)) return 0;
    return formatUsdc((reserves as bigint[]).reduce((a, b) => a + b, 0n));
  }, [reserves]);

  const needsApproval =
    !demo &&
    mode === "add" &&
    typeof allowance === "bigint" &&
    amountBig > allowance;

  function notifyDemo() {
    push({
      kind: "info",
      title: "Demo mode",
      message:
        "Contracts aren't deployed yet (NEXT_PUBLIC_FACTORY unset). This is a preview of the liquidity panel.",
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

  async function onAdd() {
    if (demo) return notifyDemo();
    if (amountBig <= 0n) return;
    setBusy(true);
    const id = push({ kind: "pending", title: "Adding liquidity…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: market.address,
        abi: fpmmAbi,
        functionName: "addLiquidity",
        args: [amountBig],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: "Liquidity added",
        message: `${fmtUsd(Number(amount))} into ${market.subject}`,
        href: txUrl(hash),
        ttl: 9000,
      });
      setAmount("");
      await Promise.all([refetchLp(), refetchAllowance()]);
    } catch (e) {
      push({
        kind: "error",
        title: "Add liquidity failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  async function onRemove() {
    if (demo) return notifyDemo();
    if (amountBig <= 0n) return;
    if (amountBig > lp) {
      push({
        kind: "error",
        title: "Amount exceeds LP balance",
        ttl: 5000,
      });
      return;
    }
    setBusy(true);
    const id = push({ kind: "pending", title: "Removing liquidity…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: market.address,
        abi: fpmmAbi,
        functionName: "removeFunding",
        args: [amountBig],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: "Liquidity removed",
        message: `Burned ${formatUsdc(amountBig).toLocaleString()} kLP`,
        href: txUrl(hash),
        ttl: 9000,
      });
      setAmount("");
      await Promise.all([refetchLp(), refetchFees()]);
    } catch (e) {
      push({
        kind: "error",
        title: "Remove liquidity failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  async function onClaim() {
    if (demo) return notifyDemo();
    if (!address || fees <= 0n) return;
    setBusy(true);
    const id = push({ kind: "pending", title: "Claiming fees…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: market.address,
        abi: fpmmAbi,
        functionName: "withdrawFees",
        args: [address],
      });
      setPendingHash(hash);
      push({
        kind: "success",
        title: "Fees claimed",
        message: `${fmtUsd(formatUsdc(fees))} from ${market.subject}`,
        href: txUrl(hash),
        ttl: 9000,
      });
      await refetchFees();
    } catch (e) {
      push({
        kind: "error",
        title: "Claim failed",
        message: errMsg(e),
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
      setBusy(false);
    }
  }

  const disabled = busy || confirming || market.closed;
  const amountLabel = mode === "add" ? "Amount (USDC)" : "LP shares to burn";

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Provide liquidity</h2>
        <span className="text-xs text-muted">
          fee {(market.feeBps / 100).toFixed(2)}%
        </span>
      </div>

      {/* pool + position stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <Stat label="Pool TVL" value={demo ? "—" : fmtUsd(tvl)} />
        <Stat
          label="Your kLP"
          value={demo || !isConnected ? "—" : formatUsdc(lp).toLocaleString()}
        />
        <Stat
          label="Claimable fees"
          value={demo || !isConnected ? "—" : fmtUsd(formatUsdc(fees))}
          accent
        />
        <div className="flex items-center justify-end">
          {!demo && isConnected && (
            <button
              onClick={onClaim}
              disabled={disabled || fees <= 0n}
              className="btn-ghost !py-1 !px-3 text-xs"
              title={fees > 0n ? "Claim accrued LP fees" : "No fees to claim"}
            >
              {busy || confirming ? "…" : "Claim fees"}
            </button>
          )}
        </div>
      </div>

      {/* add / remove toggle */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-pitch-bg p-1">
        {(["add", "remove"] as Mode[]).map((m) => (
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
          {mode === "add" ? "USDC" : "kLP"}
        </span>
      </div>
      {!demo && mode === "remove" && isConnected && (
        <button
          onClick={() => setAmount(String(formatUsdc(lp)))}
          className="mt-1 block w-full text-right text-xs text-muted hover:text-white"
        >
          Balance: {formatUsdc(lp).toLocaleString()} kLP · Max
        </button>
      )}

      {/* action */}
      <div className="mt-4">
        {!isConnected ? (
          <p className="rounded-lg bg-pitch-bg py-3 text-center text-sm text-muted">
            Connect your wallet to provide liquidity
          </p>
        ) : !isCorrect && !demo ? (
          <button onClick={switchToXLayer} className="btn-primary w-full">
            Switch network
          </button>
        ) : mode === "add" ? (
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
              onClick={onAdd}
              disabled={disabled || amountBig <= 0n}
              className="btn-primary w-full"
            >
              {busy || confirming ? "Confirming…" : "Add liquidity"}
            </button>
          )
        ) : (
          <button
            onClick={onRemove}
            disabled={disabled || amountBig <= 0n}
            className="btn-primary w-full"
          >
            {busy || confirming ? "Confirming…" : "Remove liquidity"}
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted">
        {demo
          ? "Demo mode — connect a deployed factory via env to provide liquidity."
          : "Non-custodial. LPs earn the market fee on every trade."}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-pitch-bg p-2.5">
      <p className="text-muted">{label}</p>
      <p className={`font-semibold ${accent ? "text-grass" : "text-white"}`}>
        {value}
      </p>
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
