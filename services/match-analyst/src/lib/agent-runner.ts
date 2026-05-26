// Generic agent runner: watches `Called(callId, agentId, caller, paid, payload)`
// on AgentRegistry, dispatches each event to the service's handler, and replies
// via `submitResult(callId, bytes result, bytes signature)` — signed by the
// agent wallet over `keccak256(abi.encode(address(registry), chainid, callId,
// keccak256(result)))` per AgentRegistry.sol:155-157.
//
// Every first-party service uses this same lifecycle; only the `handle` callback
// differs (see each service's main file).
import {
  encodeAbiParameters,
  getAddress,
  keccak256,
  toHex,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Log,
} from "viem";
import { agentRegistryAbi } from "./v2-abis.js";
import {
  addressFromPk,
  getPublicClient,
  getWalletClient,
  isOffline,
  requireAddress,
  requireEnv,
} from "./v2-chain.js";

export type CalledEvent = {
  callId: Hex;
  agentId: Hex;
  caller: `0x${string}`;
  paid: bigint;
  payload: Hex;
};

export type AgentHandler = (
  event: CalledEvent,
  ctx: AgentContext,
) => Promise<string>;

export type AgentContext = {
  publicClient: PublicClient;
  agentId: Hex;
  agentRegistry: `0x${string}`;
  offline: boolean;
};

export type RunnerConfig = {
  /** Friendly name used in log lines. */
  serviceName: string;
  /** Callback that turns a `Called` event into a string result. */
  handle: AgentHandler;
};

/** Encode a string reply as ABI-encoded `bytes` for `submitResult`. */
export function encodeStringReply(s: string): Hex {
  return encodeAbiParameters([{ type: "string" }], [s]);
}

export async function runAgent(cfg: RunnerConfig): Promise<void> {
  const offline = isOffline();
  const agentId = requireEnv("AGENT_ID") as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(agentId)) {
    throw new Error(
      `AGENT_ID must be a 32-byte hex string (got ${agentId.slice(0, 12)}…)`,
    );
  }
  const agentRegistry = requireAddress("AGENT_REGISTRY");
  const publicClient = getPublicClient();

  const pk = process.env.AGENT_PK;
  const wallet = getWalletClient(pk);
  const walletAddress = addressFromPk(pk);

  if (!offline && !wallet) {
    throw new Error("AGENT_PK is required unless OFFLINE_MODE=1 (demo mode).");
  }

  console.log(`[${cfg.serviceName}] starting`);
  console.log(
    `[${cfg.serviceName}] chainId=${publicClient.chain?.id} registry=${agentRegistry}`,
  );
  console.log(`[${cfg.serviceName}] agentId=${agentId}`);
  console.log(
    `[${cfg.serviceName}] agentWallet=${walletAddress ?? "<offline>"}`,
  );
  console.log(
    `[${cfg.serviceName}] mode=${offline ? "OFFLINE (no submit)" : "LIVE"}`,
  );

  const ctx: AgentContext = { publicClient, agentId, agentRegistry, offline };

  // Watch only the `Called` events whose indexed `agentId` matches our agent.
  // viem's `watchContractEvent` polls by default; the public RPC for X Layer
  // testnet does not advertise eth_subscribe so polling is the portable choice.
  const unwatch = publicClient.watchContractEvent({
    address: agentRegistry,
    abi: agentRegistryAbi,
    eventName: "Called",
    args: { agentId },
    onLogs: (logs: Log[]) => {
      for (const log of logs) {
        const ev = (log as unknown as { args: CalledEvent }).args;
        void handleOne(cfg, ctx, ev, wallet).catch((err) => {
          console.error(
            `[${cfg.serviceName}] handler error for callId=${ev?.callId}:`,
            err,
          );
        });
      }
    },
    onError: (err) => {
      console.error(`[${cfg.serviceName}] event watcher error:`, err);
    },
  });

  // Graceful shutdown.
  const stop = () => {
    console.log(`[${cfg.serviceName}] stopping`);
    unwatch();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

async function handleOne(
  cfg: RunnerConfig,
  ctx: AgentContext,
  ev: CalledEvent,
  wallet: WalletClient | null,
): Promise<void> {
  console.log(
    `[${cfg.serviceName}] received callId=${ev.callId} from caller=${ev.caller}`,
  );
  const text = await cfg.handle(ev, ctx);
  const reply = encodeStringReply(text);

  if (ctx.offline || !wallet) {
    console.log(
      `[${cfg.serviceName}] [offline] would submitResult(callId=${ev.callId}):`,
    );
    console.log(text);
    return;
  }

  // Build the digest the contract recomputes (AgentRegistry.sol:155-157) and
  // sign it with the agent wallet. `signMessage` applies the eth_sign prefix
  // (`toEthSignedMessageHash`) so the recovered address matches `agentWallet`.
  const chainId = BigInt(ctx.publicClient.chain?.id ?? 0);
  const innerDigest = keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [ctx.agentRegistry, chainId, ev.callId, keccak256(reply)],
    ),
  );
  const signature = await wallet.signMessage({
    account: wallet.account!,
    message: { raw: innerDigest },
  });

  const hash = await wallet.writeContract({
    account: wallet.account!,
    chain: wallet.chain!,
    address: ctx.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "submitResult",
    args: [ev.callId, reply, signature],
  });
  await ctx.publicClient.waitForTransactionReceipt({ hash });
  console.log(`[${cfg.serviceName}] submitResult ok tx=${hash}`);
}

/** Best-effort utility for tests + dry-run output. */
export function previewAddress(addr: string): string {
  try {
    return getAddress(addr);
  } catch {
    return toHex(addr);
  }
}
