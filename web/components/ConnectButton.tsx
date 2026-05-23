"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CHAIN_NAME } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { useOnCorrectChain } from "@/lib/useNetwork";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isCorrect, switchToXLayer, isSwitching } = useOnCorrectChain();
  const [open, setOpen] = useState(false);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {!isCorrect && (
          <button
            onClick={switchToXLayer}
            disabled={isSwitching}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            {isSwitching ? "Switching…" : `Switch to ${CHAIN_NAME}`}
          </button>
        )}
        <NetworkIndicator correct={isCorrect} />
        <button
          onClick={() => disconnect()}
          className="btn-ghost !py-1.5 !px-3 font-mono text-xs"
          title="Disconnect"
        >
          {shortAddr(address)}
        </button>
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
        {isPending ? "Connecting…" : "Connect Wallet"}
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
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-white/5"
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
  return (
    <span className="pill">
      <span
        className={`h-2 w-2 rounded-full ${correct ? "bg-grass animate-pulse-dot" : "bg-no"}`}
      />
      {correct ? CHAIN_NAME : "Wrong network"}
    </span>
  );
}
