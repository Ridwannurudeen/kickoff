"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { keccak256, toBytes, parseUnits } from "viem";
import { useT } from "@/components/I18nProvider";
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

  const standings = DEMO_LEAGUE_STANDINGS;

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
        } catch {
          // ignore — surfaced separately
        }
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
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("league_title")}</h1>
        <p className="text-sm text-muted">{t("league_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Standings */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted">
              {t("league_season_active", { id: 1 })}
            </h2>
          </div>
          {standings.length === 0 ? (
            <div className="card py-16 text-center text-sm text-muted">
              {t("league_empty")}
            </div>
          ) : (
            <div className="card overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pitch-border text-left text-xs text-muted">
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
                  {standings.map((s, i) => (
                    <tr
                      key={s.agentId}
                      className="border-b border-pitch-border/50 last:border-0"
                    >
                      <td className="py-3 pr-3 font-bold text-muted">
                        {i === 0 ? "★" : i + 1}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">{s.name}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted">
                        <a
                          href={addressUrl(s.owner)}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-grass"
                        >
                          {shortAddr(s.owner)}
                        </a>
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-grass">
                        {fmtInt(s.score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* How it works */}
          <div className="card mt-6 p-5">
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

        {/* Register-your-agent panel */}
        <section className="card h-fit p-5">
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
