"use client";

import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { useMarkets } from "@/lib/markets";
import { parlayBookAbi } from "@/lib/abis";
import { ADDRESSES, PARLAY_CONFIGURED, txUrl } from "@/lib/config";
import { fmtUsd, formatUsdc } from "@/lib/format";
import { useMyParlays, type MyParlay, type ParlayResult } from "@/lib/parlay";
import { useToasts } from "@/lib/toast";
import { ParlayBuilder } from "@/components/ParlayBuilder";

export default function ParlayPage() {
  const { address, isConnected } = useAccount();
  const { data: markets, isLoading } = useMarkets();
  const { data: parlays } = useMyParlays(address);
  const { writeContractAsync } = useWriteContract();
  const { push } = useToasts();

  if (!PARLAY_CONFIGURED) {
    return (
      <div className="card flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-3xl">🎟️</span>
        <p className="font-semibold">Parlays aren&apos;t live yet</p>
        <p className="max-w-sm text-sm text-muted">
          The ParlayBook isn&apos;t deployed on this network. Set
          NEXT_PUBLIC_PARLAY_BOOK to enable combined fixed-odds bets.
        </p>
        <Link href="/markets" className="text-sm text-grass hover:underline">
          Browse markets →
        </Link>
      </div>
    );
  }

  async function settle(p: MyParlay) {
    const id = push({ kind: "pending", title: "Settling parlay…", ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.parlayBook,
        abi: parlayBookAbi,
        functionName: "settleParlay",
        args: [p.id],
      });
      push({
        kind: "success",
        title: `Settle submitted (#${p.id})`,
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      push({
        kind: "error",
        title: "Settle failed",
        message:
          e instanceof Error ? e.message.split("\n")[0] : "Unknown error",
        ttl: 6000,
      });
    } finally {
      useToasts.getState().dismiss(id);
    }
  }

  const rows = parlays ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Parlay</h1>
        <p className="text-sm text-muted">
          Stack 2–8 markets into one fixed-odds bet. Every leg must win to pay
          out.
        </p>
      </div>

      {isLoading ? (
        <div className="card h-64 animate-pulse bg-pitch-panel/50" />
      ) : (
        <ParlayBuilder markets={markets ?? []} />
      )}

      {/* my parlays */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-muted">My parlays</h2>
        {!isConnected ? (
          <div className="card py-12 text-center text-sm text-muted">
            Connect your wallet to see your parlays.
          </div>
        ) : rows.length === 0 ? (
          <div className="card py-12 text-center text-sm text-muted">
            No parlays yet. Build one above.
          </div>
        ) : (
          <div className="card overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pitch-border text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Legs</th>
                  <th className="py-2 pr-3 font-medium">Stake</th>
                  <th className="py-2 pr-3 font-medium">Payout</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id.toString()}
                    className="border-b border-pitch-border/50 last:border-0"
                  >
                    <td className="py-3 pr-3 font-medium text-white">
                      {p.id.toString()}
                    </td>
                    <td className="py-3 pr-3">{p.markets.length}</td>
                    <td className="py-3 pr-3">{fmtUsd(formatUsdc(p.stake))}</td>
                    <td className="py-3 pr-3 font-semibold text-grass">
                      {fmtUsd(formatUsdc(p.payout))}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusPill result={p.result} />
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {p.result === "open" ? (
                        <button
                          onClick={() => settle(p)}
                          disabled={!p.settleable}
                          className="btn-primary !px-3 !py-1 text-xs"
                          title={
                            p.settleable
                              ? "All legs resolved — settle this parlay"
                              : "Waiting on leg resolution"
                          }
                        >
                          {p.settleable ? "Settle" : "Open"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ result }: { result: ParlayResult }) {
  const map: Record<ParlayResult, { label: string; cls: string }> = {
    open: { label: "Open", cls: "border-pitch-border text-muted" },
    won: { label: "Won", cls: "border-grass/40 text-grass" },
    lost: { label: "Lost", cls: "border-no/40 text-no" },
    void: { label: "Void", cls: "border-pitch-border text-white" },
  };
  const { label, cls } = map[result];
  return (
    <span
      className={`pill !px-2.5 !py-0.5 text-[10px] uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
