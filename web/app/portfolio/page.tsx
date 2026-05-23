"use client";

import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { useMarkets } from "@/lib/markets";
import { useLpPositions, usePositions } from "@/lib/positions";
import { conditionalTokensAbi, fpmmAbi } from "@/lib/abis";
import { ADDRESSES, FACTORY_CONFIGURED, txUrl } from "@/lib/config";
import { fmtPct, fmtShares, fmtUsd } from "@/lib/format";
import { useToasts } from "@/lib/toast";
import type { LpPosition, Position } from "@/lib/types";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: markets } = useMarkets();
  const { data: positions, isLoading } = usePositions(address, markets);
  const { data: lpPositions } = useLpPositions(address, markets);
  const { writeContractAsync } = useWriteContract();
  const { push } = useToasts();

  const demo = !FACTORY_CONFIGURED;

  async function redeem(p: Position) {
    if (demo) {
      push({
        kind: "info",
        title: "Demo mode",
        message: "Redeem is available once contracts are deployed.",
        ttl: 5000,
      });
      return;
    }
    const id = push({ kind: "pending", title: "Redeeming…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "redeemPositions",
        args: [p.conditionId],
      });
      push({
        kind: "success",
        title: "Redeem submitted",
        message: p.marketLabel,
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      push({
        kind: "error",
        title: "Redeem failed",
        message:
          e instanceof Error ? e.message.split("\n")[0] : "Unknown error",
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
    }
  }

  async function claimFees(lp: LpPosition) {
    if (demo || !address) {
      push({
        kind: "info",
        title: "Demo mode",
        message: "Fee claims are available once contracts are deployed.",
        ttl: 5000,
      });
      return;
    }
    const id = push({ kind: "pending", title: "Claiming fees…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: lp.market,
        abi: fpmmAbi,
        functionName: "withdrawFees",
        args: [address],
      });
      push({
        kind: "success",
        title: "Fees claimed",
        message: `${fmtUsd(lp.claimableFees)} from ${lp.marketLabel}`,
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      push({
        kind: "error",
        title: "Claim failed",
        message:
          e instanceof Error ? e.message.split("\n")[0] : "Unknown error",
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
    }
  }

  if (!isConnected && !demo) {
    return (
      <div className="card flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-3xl">👛</span>
        <p className="font-semibold">Connect your wallet</p>
        <p className="max-w-sm text-sm text-muted">
          Your World Cup positions, marks, and PnL will show up here.
        </p>
      </div>
    );
  }

  const rows = positions ?? [];
  const lpRows = lpPositions ?? [];
  const totalValue = rows.reduce((s, p) => s + p.shares * p.mark, 0);
  const totalFees = lpRows.reduce((s, lp) => s + lp.claimableFees, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted">
            Your open positions, liquidity, and payouts.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="card px-5 py-3">
            <p className="text-xs text-muted">Est. value (at mark)</p>
            <p className="text-xl font-extrabold text-grass">
              {fmtUsd(totalValue)}
            </p>
          </div>
          <div className="card px-5 py-3">
            <p className="text-xs text-muted">Claimable LP fees</p>
            <p className="text-xl font-extrabold text-grass">
              {fmtUsd(totalFees)}
            </p>
          </div>
        </div>
      </div>

      {/* outcome-share positions */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-muted">Outcome positions</h2>
        {isLoading ? (
          <div className="card h-48 animate-pulse bg-pitch-panel/50" />
        ) : rows.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-3xl">⚽</span>
            <p className="font-semibold">No positions yet</p>
            <Link
              href="/markets"
              className="text-sm text-grass hover:underline"
            >
              Browse markets →
            </Link>
          </div>
        ) : (
          <div className="card overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pitch-border text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Market</th>
                  <th className="py-2 pr-3 font-medium">Outcome</th>
                  <th className="py-2 pr-3 font-medium">Shares</th>
                  <th className="py-2 pr-3 font-medium">Avg cost</th>
                  <th className="py-2 pr-3 font-medium">Mark</th>
                  <th className="py-2 pr-3 font-medium">Value</th>
                  <th className="py-2 pr-3 font-medium">P&amp;L</th>
                  <th className="py-2 pr-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const value = p.shares * p.mark;
                  const pnl =
                    p.avgCost !== undefined
                      ? (p.mark - p.avgCost) * p.shares
                      : undefined;
                  return (
                    <tr
                      key={`${p.market}-${p.outcomeIndex}-${i}`}
                      className="border-b border-pitch-border/50 last:border-0"
                    >
                      <td className="py-3 pr-3 font-medium text-white">
                        <Link
                          href={`/markets/${p.market}`}
                          className="hover:text-grass"
                        >
                          {p.marketLabel}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {p.outcomeName}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{fmtShares(p.shares)}</td>
                      <td className="py-3 pr-3 text-muted">
                        {p.avgCost !== undefined
                          ? `$${p.avgCost.toFixed(3)}`
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 text-muted">{fmtPct(p.mark)}</td>
                      <td className="py-3 pr-3 font-semibold">
                        {fmtUsd(value)}
                      </td>
                      <td className="py-3 pr-3 font-semibold">
                        {pnl === undefined ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span
                            className={pnl >= 0 ? "text-grass" : "text-red-400"}
                          >
                            {pnl >= 0 ? "+" : "−"}
                            {fmtUsd(Math.abs(pnl))}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {p.resolved ? (
                          <button
                            onClick={() => redeem(p)}
                            disabled={!p.isWinner}
                            className="btn-primary !py-1 !px-3 text-xs"
                            title={
                              p.isWinner
                                ? "Redeem winnings"
                                : "Lost — nothing to redeem"
                            }
                          >
                            {p.isWinner ? "Redeem" : "Lost"}
                          </button>
                        ) : (
                          <Link
                            href={`/markets/${p.market}`}
                            className="btn-ghost !py-1 !px-3 text-xs"
                          >
                            Sell
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* LP positions */}
      {lpRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-muted">LP positions</h2>
          <div className="card overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pitch-border text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Market</th>
                  <th className="py-2 pr-3 font-medium">kLP shares</th>
                  <th className="py-2 pr-3 font-medium">Fee tier</th>
                  <th className="py-2 pr-3 font-medium">Claimable fees</th>
                  <th className="py-2 pr-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {lpRows.map((lp, i) => (
                  <tr
                    key={`${lp.market}-${i}`}
                    className="border-b border-pitch-border/50 last:border-0"
                  >
                    <td className="py-3 pr-3 font-medium text-white">
                      <Link
                        href={`/markets/${lp.market}`}
                        className="hover:text-grass"
                      >
                        {lp.marketLabel}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">{fmtShares(lp.shares)}</td>
                    <td className="py-3 pr-3 text-muted">
                      {(lp.feeBps / 100).toFixed(2)}%
                    </td>
                    <td className="py-3 pr-3 font-semibold text-grass">
                      {fmtUsd(lp.claimableFees)}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => claimFees(lp)}
                          disabled={lp.claimableFees <= 0}
                          className="btn-primary !py-1 !px-3 text-xs"
                          title={
                            lp.claimableFees > 0
                              ? "Claim accrued LP fees"
                              : "No fees to claim"
                          }
                        >
                          Claim
                        </button>
                        <Link
                          href={`/markets/${lp.market}`}
                          className="btn-ghost !py-1 !px-3 text-xs"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
