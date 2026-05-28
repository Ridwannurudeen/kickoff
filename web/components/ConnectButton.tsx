"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CHAIN_NAME } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { useOnCorrectChain } from "@/lib/useNetwork";
import { useT } from "./I18nProvider";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isCorrect, switchToXLayer, isSwitching, switchError } =
    useOnCorrectChain();
  const [open, setOpen] = useState(false);
  const { t } = useT();

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {!isCorrect && (
            <button
              onClick={() => void switchToXLayer()}
              disabled={isSwitching}
              className="btn-primary !py-1.5 !px-3 text-xs"
            >
              {isSwitching
                ? t("wallet_connecting")
                : t("wallet_switch", { chain: CHAIN_NAME })}
            </button>
          )}
          <NetworkIndicator correct={isCorrect} />
          <button
            onClick={() => disconnect()}
            className="btn-ghost !py-1.5 !px-3 font-mono text-xs tabular-nums"
            title={t("wallet_disconnect")}
          >
            {shortAddr(address)}
          </button>
        </div>
        <Link
          href={`/profile/${address}`}
          className="text-xs text-muted transition-colors hover:text-grass"
        >
          My profile →
        </Link>
        {switchError && (
          <p className="max-w-sm rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-right text-xs text-no">
            {switchError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? t("wallet_connecting") : t("wallet_connect")}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="card absolute right-0 z-20 mt-2 w-56 overflow-hidden p-1">
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect({ connector: c });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-honor/60"
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NetworkIndicator({ correct }: { correct: boolean }) {
  const { t } = useT();
  return (
    <span className="pill">
      <span
        className={`h-2 w-2 rounded-full ${correct ? "animate-pulse-dot bg-grass" : "bg-no"}`}
      />
      {correct ? CHAIN_NAME : t("wallet_wrong_network")}
    </span>
  );
}
