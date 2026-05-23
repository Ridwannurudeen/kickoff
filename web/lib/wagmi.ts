import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import type { EIP1193Provider } from "viem";
import { activeChain, RPC_URL } from "./config";

/**
 * wagmi v2 config. Connectors, in priority order:
 *  1. OKX Wallet — explicit injected target on `window.okxwallet`.
 *  2. MetaMask — explicit injected target (EIP-1193, no @metamask/sdk; that SDK
 *     drags in the entire WalletConnect stack, which we don't need here).
 *  3. Generic injected — EIP-6963 multi-injected discovery picks up any other
 *     installed wallet automatically.
 *
 * Single chain — the env-driven X Layer network.
 */

type Target = { id: string; name: string; provider: EIP1193Provider };

function okxTarget(): Target | undefined {
  if (typeof window === "undefined") return undefined;
  const provider = (window as unknown as { okxwallet?: EIP1193Provider })
    .okxwallet;
  return provider
    ? { id: "okxWallet", name: "OKX Wallet", provider }
    : undefined;
}

function metaMaskTarget(): Target | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = (
    window as unknown as {
      ethereum?: EIP1193Provider & { isMetaMask?: boolean };
    }
  ).ethereum;
  return eth?.isMetaMask
    ? { id: "metaMask", name: "MetaMask", provider: eth }
    : undefined;
}

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    injected({ target: okxTarget }),
    injected({ target: metaMaskTarget }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [activeChain.id]: http(RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
