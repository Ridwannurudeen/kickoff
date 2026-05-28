"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { keccak256, toBytes, parseUnits } from "viem";
import { useT } from "@/components/I18nProvider";
import { LaurelWreath, Podium } from "@/components/ornaments";
import { agentLeagueAbi, agentRegistryAbi } from "@/lib/v2-abis";
import {
  AGENT_LEAGUE_CONFIGURED,
  AGENT_REGISTRY_CONFIGURED,
  V2_ADDRESSES,
} from "@/lib/v2-addresses";
import { txUrl, addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { DEMO_LEAGUE_STANDINGS } from "@/lib/v2-demo";
import { useToasts } from "@/lib/toast";

type Standing = {
  agentId: `0x${string}`;
  name: string;
  owner: `0x${string}`;
  score: number;
};

export default function LeaguePage() {
  const { t } = useT();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { push, dismiss } = useToasts();

  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [priceOkb, setPriceOkb] = useState("0.0001");

  const demoRegistry = !AGENT_REGISTRY_CONFIGURED;
  const demoLeague = !AGENT_LEAGUE_CONFIGURED;

  // Live standings:
  //   1. `activeSeason()` → grab the active season id
  //   2. `leaderboard(seasonId)` → parallel arrays of (agentIds, scores, owners)
  // The on-chain registry doesn't store an agent display name (only an
  // endpointHint), so the "name" column renders a short agentId. Falls back to
  // DEMO_LEAGUE_STANDINGS when AgentLeague isn't deployed yet.
  const active = useReadContract({
    address: V2_ADDRESSES.agentLeague,
    abi: agentLeagueAbi,
    functionName: "activeSeason",
    query: { enabled: !demoLeague },
  });
  const liveSeasonId = (active.data?.[0] ?? 0n) as bigint;
  const leaderboard = useReadContract({
    address: V2_ADDRESSES.agentLeague,
    abi: agentLeagueAbi,
    functionName: "leaderboard",
    args: !demoLeague && active.data ? [liveSeasonId] : undefined,
    query: { enabled: !demoLeague && !!active.data },
  });

  const standings: Standing[] = useMemo(() => {
    if (demoLeague) return DEMO_LEAGUE_STANDINGS;
    const data = leaderboard.data;
    if (!data) return [];
    const [agentIds, scores, owners] = data as readonly [
      readonly `0x${string}`[],
      readonly bigint[],
      readonly `0x${string}`[],
    ];
    const rows: Standing[] = agentIds.map((agentId, i) => ({
      agentId,
      name: `${agentId.slice(0, 10)}…`,
      owner:
        owners[i] ??
        ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      score: Number(scores[i] ?? 0n),
    }));
    rows.sort((a, b) => b.score - a.score);
    return rows;
  }, [demoLeague, leaderboard.data]);

  const seasonId = demoLeague ? 1 : Number(liveSeasonId);

  const topThree = ([1, 2, 3] as const).map((rank) => {
    const entry = standings[rank - 1];
    return {
      rank,
      label: entry?.name ?? "—",
      sublabel: entry ? shortAddr(entry.owner) : undefined,
    };
  });
  const rest = standings.slice(3);

  function refetchStandings(): void {
    void active.refetch();
    void leaderboard.refetch();
  }

  async function registerAgent() {
    if (!name.trim() || !wallet.trim()) {
      push({
        kind: "info",
        title: t("league_register_cta"),
        message: "Name and wallet are required.",
        ttl: 5000,
      });
      return;
    }
    if (demoRegistry) {
      push({ kind: "info", title: t("common_demo_banner"), ttl: 4000 });
      return;
    }
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
    const id = push({
      kind: "pending",
      title: t("league_register_cta"),
      ttl: 0,
    });
    try {
      const agentId = keccak256(
        toBytes(`kickoff.v2.user-agent.${address}.${name}`),
      );
      const priceWei = parseUnits(priceOkb as `${number}`, 18);
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "registerAgent",
        args: [
          agentId,
          wallet as `0x${string}`,
          priceWei,
          endpoint || "https://",
        ],
      });
      push({
        kind: "success",
        title: t("league_register_cta"),
        href: txUrl(hash),
        ttl: 9000,
      });
      setName("");
      setWallet("");
      setEndpoint("");
      setPriceOkb("0.0001");
      // Best-effort follow-up: enter the just-registered agent into the active
      // season. If this leg fails (e.g. no active season), the registry tx
      // still stands and the user can try `enterAgent` again later.
      if (!demoLeague) {
        try {
          await writeContractAsync({
            address: V2_ADDRESSES.agentLeague,
            abi: agentLeagueAbi,
            functionName: "enterAgent",
            args: [agentId],
          });
        } catch (enterErr) {
          push({
            kind: "error",
            title: "Could not enter season",
            message:
              enterErr instanceof Error
                ? enterErr.message.split("\n")[0]
                : "AgentLeague.enterAgent reverted — your agent is registered but not in the active season; try the Enter step manually.",
            ttl: 9000,
          });
        }
      }
      refetchStandings();
    } catch (e) {
      push({
        kind: "error",
        title: t("common_error"),
        message: e instanceof Error ? e.message.split("\n")[0] : undefined,
        ttl: 6000,
      });
    } finally {
      dismiss(id);
    }
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
            {t("league_title")}
          </h1>
          <LaurelWreath size={32} className="text-honor/70" />
        </div>
        <p className="text-sm text-muted">{t("league_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Standings */}
        <section className="animate-fade-up space-y-6 [animation-delay:180ms] lg:col-span-2">
          {standings.length === 0 ? (
            <div className="card py-16 text-center text-sm text-muted">
              {t("league_empty")}
            </div>
          ) : (
            <>
              {/* Podium honor moment — top 3 */}
              <div className="tabula card mx-auto max-w-xl p-6 md:p-8">
                <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Season {seasonId} · Top 3
                </div>
                <Podium topThree={topThree} className="mx-auto w-full" />
              </div>

              {rest.length > 0 && (
                <>
                  <div className="divider-classical" />
                  <div className="card overflow-x-auto p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-pitch-border text-left text-[10px] uppercase tracking-wide text-muted">
                          <th className="py-2 pr-3 font-medium">
                            {t("league_standings_rank")}
                          </th>
                          <th className="py-2 pr-3 font-medium">
                            {t("league_standings_agent")}
                          </th>
                          <th className="py-2 pr-3 font-medium">
                            {t("league_standings_owner")}
                          </th>
                          <th className="py-2 pr-3 text-right font-medium">
                            {t("league_standings_score")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.map((s, i) => (
                          <tr
                            key={s.agentId}
                            className="border-b border-pitch-border/50 transition-colors last:border-0 hover:bg-pitch-panel/60"
                          >
                            <td className="py-3 pr-3 font-display tracking-wide text-muted">
                              {i + 4}
                            </td>
                            <td className="py-3 pr-3 font-mono text-xs">
                              {s.name}
                            </td>
                            <td className="py-3 pr-3 font-mono text-xs text-muted">
                              <a
                                href={addressUrl(s.owner)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-grass"
                              >
                                {shortAddr(s.owner)}
                              </a>
                            </td>
                            <td
                              className={`py-3 pr-3 text-right font-semibold tabular-nums ${
                                s.score > 0 ? "text-grass" : "text-muted"
                              }`}
                            >
                              {fmtInt(s.score)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* How it works */}
          <div className="card p-5">
            <h3 className="mb-2 font-bold text-white">
              {t("league_how_title")}
            </h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>{t("league_how_step1")}</li>
              <li>{t("league_how_step2")}</li>
              <li>{t("league_how_step3")}</li>
              <li>{t("league_how_step4")}</li>
              <li>{t("league_how_step5")}</li>
            </ol>
          </div>
        </section>

        {/* Section break between standings and the register-agent CTA on the
            mobile stack. On desktop the two sit side-by-side so the divider is
            redundant; hide it there. */}
        <div className="divider-classical lg:hidden" />

        {/* Register-your-agent panel */}
        <section className="tabula h-fit animate-fade-up p-5 [animation-delay:300ms]">
          <h3 className="mb-3 font-bold text-white">
            {t("league_register_cta")}
          </h3>
          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="alpha-striker-v1"
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">
                Agent wallet
              </span>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x…"
                className="input font-mono text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">
                Endpoint hint
              </span>
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://my-agent.example.com"
                className="input text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">
                Price per call (OKB)
              </span>
              <input
                value={priceOkb}
                onChange={(e) => setPriceOkb(e.target.value)}
                inputMode="decimal"
                className="input font-mono text-xs"
              />
            </label>
            <button
              onClick={registerAgent}
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? t("wallet_connecting") : t("league_register_cta")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
