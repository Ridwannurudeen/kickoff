"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { isAddress, keccak256, toBytes, parseUnits } from "viem";
import { useT } from "@/components/I18nProvider";
import { Podium } from "@/components/ornaments";
import {
  SectionHeader,
  Card,
  Badge,
  StatusDot,
  ListRow,
} from "@/components/ui";
import { agentLeagueAbi, agentRegistryAbi } from "@/lib/v2-abis";
import {
  AGENT_LEAGUE_CONFIGURED,
  AGENT_REGISTRY_CONFIGURED,
  V2_ADDRESSES,
} from "@/lib/v2-addresses";
import { txUrl, addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { AGENTS } from "@/lib/v2-catalog";
import { useToasts } from "@/lib/toast";
import { publicClient } from "@/lib/client";
import { waitForTransactionAndRefresh } from "@/lib/tx";

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
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [priceOkb, setPriceOkb] = useState("0.0001");

  // Two-step register → enter UX. After a successful `registerAgent` we stash
  // the just-registered agentId + tx hash here so the form swaps into a
  // success state with an explicit "Step 2 · Enter Season" CTA. Keeping the
  // two wallet popups behind separate clicks stops users from rejecting the
  // second one thinking it's a duplicate of the first.
  const [pendingAgentId, setPendingAgentId] = useState<`0x${string}` | null>(
    null,
  );
  const [registerTxHash, setRegisterTxHash] = useState<`0x${string}` | null>(
    null,
  );
  const [recentEnterTs, setRecentEnterTs] = useState<number | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [localAgentNames, setLocalAgentNames] = useState<
    Record<string, string>
  >({});

  const demoRegistry = !AGENT_REGISTRY_CONFIGURED;
  const demoLeague = !AGENT_LEAGUE_CONFIGURED;

  // Live standings:
  //   1. `activeSeasonId()` -> grab the active season id
  //   2. `leaderboard(seasonId)` -> parallel arrays of (agentIds, scores, owners)
  // The on-chain registry doesn't store an agent display name (only an
  // endpointHint), so the "name" column renders a short agentId. Renders an
  // honest empty state when AgentLeague isn't deployed or has no entries yet.
  const active = useReadContract({
    address: V2_ADDRESSES.agentLeague,
    abi: agentLeagueAbi,
    functionName: "activeSeasonId",
    query: { enabled: !demoLeague },
  });
  const liveSeasonId = (active.data ?? 0n) as bigint;
  const seasonOpen = liveSeasonId > 0n;
  const leaderboard = useReadContract({
    address: V2_ADDRESSES.agentLeague,
    abi: agentLeagueAbi,
    functionName: "leaderboard",
    args: !demoLeague && liveSeasonId > 0n ? [liveSeasonId] : undefined,
    query: { enabled: !demoLeague && liveSeasonId > 0n },
  });

  const agentNames = useMemo(() => {
    const names = new Map(
      AGENTS.map((agent) => [agent.id.toLowerCase(), t(agent.nameKey)]),
    );
    for (const [agentId, agentName] of Object.entries(localAgentNames)) {
      names.set(agentId, agentName);
    }
    return names;
  }, [localAgentNames, t]);

  const standings: Standing[] = useMemo(() => {
    if (demoLeague) return [];
    const data = leaderboard.data;
    if (!data) return [];
    const [agentIds, scores, owners] = data as readonly [
      readonly `0x${string}`[],
      readonly bigint[],
      readonly `0x${string}`[],
    ];
    const rows: Standing[] = agentIds.map((agentId, i) => ({
      agentId,
      name:
        agentNames.get(agentId.toLowerCase()) ?? `${agentId.slice(0, 10)}...`,
      owner:
        owners[i] ??
        ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      score: Number(scores[i] ?? 0n),
    }));
    rows.sort((a, b) => b.score - a.score);
    return rows;
  }, [agentNames, demoLeague, leaderboard.data]);

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
    const agentName = name.trim();
    const agentWallet = (wallet.trim() || address) as `0x${string}` | undefined;
    if (!agentName) {
      push({
        kind: "info",
        title: t("league_register_cta"),
        message: t("league_err_name_required"),
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
    if (!agentWallet || !isAddress(agentWallet)) {
      push({
        kind: "info",
        title: t("league_register_cta"),
        message: t("league_err_wallet_invalid"),
        ttl: 5000,
      });
      return;
    }
    const id = push({
      kind: "pending",
      title: t("league_register_cta"),
      ttl: 0,
    });
    try {
      const agentId = keccak256(
        toBytes(`kickoff.v2.user-agent.${address}.${agentName}`),
      );
      const priceWei = parseUnits(priceOkb as `${number}`, 18);
      const existing = (await publicClient().readContract({
        address: V2_ADDRESSES.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "getAgent",
        args: [agentId],
      })) as readonly [`0x${string}`, `0x${string}`, bigint, string, boolean];
      const exists = existing[4];
      if (exists && existing[0].toLowerCase() !== address.toLowerCase()) {
        throw new Error(t("league_err_id_owned"));
      }
      let hash: `0x${string}` | null = null;
      if (!exists) {
        hash = await writeContractAsync({
          address: V2_ADDRESSES.agentRegistry,
          abi: agentRegistryAbi,
          functionName: "registerAgent",
          args: [agentId, agentWallet, priceWei, endpoint || "https://"],
        });
        await waitForTransactionAndRefresh(hash, queryClient);
      }
      push({
        kind: exists ? "info" : "success",
        title: exists
          ? t("league_already_registered")
          : t("league_register_cta"),
        href: hash ? txUrl(hash) : undefined,
        ttl: 9000,
      });
      // Stash for the Step-2 card. Form fields stay populated so the user
      // can see what they just registered before clicking Enter Season.
      setLocalAgentNames((prev) => ({
        ...prev,
        [agentId.toLowerCase()]: agentName,
      }));
      setPendingAgentId(agentId);
      setRegisterTxHash(hash);
      if (!wallet.trim()) setWallet(agentWallet);
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

  function resetRegisterForm(): void {
    setPendingAgentId(null);
    setRegisterTxHash(null);
    setName("");
    setWallet("");
    setEndpoint("");
    setPriceOkb("0.0001");
  }

  async function enterPendingAgent() {
    if (!pendingAgentId) return;
    if (demoLeague) {
      push({ kind: "info", title: t("common_demo_banner"), ttl: 4000 });
      return;
    }
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
    const id = push({
      kind: "pending",
      title: t("league_enter_season"),
      ttl: 0,
    });
    setIsEntering(true);
    try {
      const sid = (await publicClient().readContract({
        address: V2_ADDRESSES.agentLeague,
        abi: agentLeagueAbi,
        functionName: "activeSeasonId",
      })) as bigint;
      if (sid === 0n) throw new Error(t("league_err_no_season"));
      const entry = (await publicClient().readContract({
        address: V2_ADDRESSES.agentLeague,
        abi: agentLeagueAbi,
        functionName: "getEntry",
        args: [sid, pendingAgentId],
      })) as readonly [boolean, bigint, bigint];
      if (entry[0]) {
        push({
          kind: "info",
          title: t("league_already_entered"),
          ttl: 7000,
        });
        refetchStandings();
        setRecentEnterTs(Date.now());
        return;
      }
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.agentLeague,
        abi: agentLeagueAbi,
        functionName: "enterAgent",
        args: [pendingAgentId],
      });
      await waitForTransactionAndRefresh(hash, queryClient);
      push({
        kind: "success",
        title: t("league_entered_season"),
        href: txUrl(hash),
        ttl: 9000,
      });
      refetchStandings();
      setRecentEnterTs(Date.now());
      // Hold the success state long enough for the user to read the toast,
      // then clear the Step-2 card and reset the form for the next agent.
      setTimeout(() => {
        resetRegisterForm();
      }, 8000);
    } catch (e) {
      push({
        kind: "error",
        title: t("league_enter_failed"),
        message: e instanceof Error ? e.message.split("\n")[0] : undefined,
        ttl: 9000,
      });
    } finally {
      setIsEntering(false);
      dismiss(id);
    }
  }

  // After a fresh enterAgent, the leaderboard read may race the chain
  // indexer. Poll up to 5×6s (30s) until the new agentId shows up in the
  // standings array, then stop. Cancels on unmount, on a new register cycle,
  // and as soon as the agent appears.
  useEffect(() => {
    if (!pendingAgentId || !recentEnterTs) return;
    let attempts = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (cancelled) return;
      const data = leaderboard.data as
        | readonly [
            readonly `0x${string}`[],
            readonly bigint[],
            readonly `0x${string}`[],
          ]
        | undefined;
      const ids = data?.[0];
      if (
        ids &&
        ids.some((x) => x.toLowerCase() === pendingAgentId.toLowerCase())
      ) {
        return;
      }
      if (attempts >= 5) return;
      attempts += 1;
      void leaderboard.refetch();
      timer = setTimeout(tick, 6000);
    };
    timer = setTimeout(tick, 6000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // leaderboard.refetch is stable across renders; depending on the data
    // ref would restart the timer on every poll. Keep deps minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAgentId, recentEnterTs]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
            {t("league_title")}
          </h1>
          <p className="text-sm text-muted">{t("league_subtitle")}</p>
        </div>
        {!demoLeague &&
          (seasonOpen ? (
            <Badge tone="grass">
              <StatusDot tone="grass" pulse />
              {t("league_season_top3", { id: seasonId })}
            </Badge>
          ) : (
            <Badge tone="neutral">
              <StatusDot tone="upcoming" />
              {t("league_no_season_btn")}
            </Badge>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Standings */}
        <section className="animate-fade-up space-y-6 [animation-delay:180ms] lg:col-span-2">
          <SectionHeader label={t("league_standings_rank")} />
          {standings.length === 0 ? (
            <Card className="py-16 text-center text-sm text-muted">
              {t("league_empty")}
            </Card>
          ) : (
            <>
              {/* Podium honor moment — top 3 */}
              <Card className="tabula mx-auto max-w-xl p-6 md:p-8">
                <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  {t("league_season_top3", { id: seasonId })}
                </div>
                <Podium topThree={topThree} className="mx-auto w-full" />
              </Card>

              {rest.length > 0 && (
                <Card className="overflow-hidden p-0">
                  <div className="row text-left">
                    <span className="w-8 flex-none label">
                      {t("league_standings_rank")}
                    </span>
                    <span className="min-w-0 flex-1 label">
                      {t("league_standings_agent")}
                    </span>
                    <span className="label">{t("league_standings_score")}</span>
                  </div>
                  {rest.map((s, i) => (
                    <ListRow
                      key={s.agentId}
                      left={
                        <span className="statnum w-8 flex-none text-center text-muted">
                          {i + 4}
                        </span>
                      }
                      title={<span className="font-mono">{s.name}</span>}
                      subtitle={
                        <a
                          href={addressUrl(s.owner)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:text-grass"
                        >
                          {shortAddr(s.owner)}
                        </a>
                      }
                      right={
                        <span
                          className={`statnum text-base ${
                            s.score > 0 ? "text-grass" : "text-muted"
                          }`}
                        >
                          {fmtInt(s.score)}
                        </span>
                      }
                    />
                  ))}
                </Card>
              )}
            </>
          )}

          {/* How it works */}
          <div>
            <SectionHeader label={t("league_how_title")} />
            <Card className="p-5">
              <ol className="space-y-2 text-xs text-muted">
                {[
                  t("league_how_step1"),
                  t("league_how_step2"),
                  t("league_how_step3"),
                  t("league_how_step4"),
                  t("league_how_step5"),
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="statnum flex h-5 w-5 flex-none items-center justify-center rounded-full bg-pitch-raised text-[11px] text-grass">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </section>

        {/* Register-your-agent panel */}
        <section className="animate-fade-up h-fit [animation-delay:300ms]">
          <SectionHeader label={t("league_register_cta")} />
          <Card className="tabula p-5">
            {pendingAgentId ? (
              <div className="space-y-3">
                <h3 className="font-bold text-white">
                  {t("league_registered_heading")}
                </h3>
                <div className="space-y-1 text-xs text-muted">
                  <div>
                    <span className="text-muted/70">
                      {t("league_agent_id_label")}
                    </span>{" "}
                    <span className="font-mono text-white">
                      {pendingAgentId.slice(0, 10)}…
                    </span>
                  </div>
                  {registerTxHash && (
                    <div>
                      <a
                        href={txUrl(registerTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-grass hover:underline"
                      >
                        {t("league_view_register_tx")}
                      </a>
                    </div>
                  )}
                </div>
                {!demoLeague && (!seasonOpen || liveSeasonId === 0n) ? (
                  <button
                    disabled
                    title={t("league_no_season_title")}
                    className="btn-primary w-full cursor-not-allowed opacity-60"
                  >
                    {t("league_no_season_btn")}
                  </button>
                ) : (
                  <button
                    onClick={enterPendingAgent}
                    disabled={isEntering || isPending}
                    className="btn-primary w-full"
                  >
                    {isEntering
                      ? t("wallet_connecting")
                      : t("league_enter_season_step2", { id: seasonId })}
                  </button>
                )}
                <button
                  onClick={resetRegisterForm}
                  className="btn-ghost w-full text-xs"
                >
                  {t("league_register_another")}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">
                    {t("league_field_name")}
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("league_ph_name")}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">
                    {t("league_field_wallet")}
                  </span>
                  <input
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder={t("league_ph_wallet")}
                    className="input font-mono text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">
                    {t("league_field_endpoint")}
                  </span>
                  <input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder={t("league_ph_endpoint")}
                    className="input text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">
                    {t("league_field_price")}
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
                  {isPending
                    ? t("wallet_connecting")
                    : t("league_register_cta")}
                </button>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
