import { useState } from "react";
import { useAccount } from "wagmi";
import { CHAIN_ID } from "./config";
import {
  asEip1193Provider,
  ensureConfiguredNetwork,
  walletErrorMessage,
} from "./walletNetwork";

/** Whether the connected wallet is on the app's configured X Layer chain. */
export function useOnCorrectChain(): {
  isConnected: boolean;
  isCorrect: boolean;
  switchToXLayer: () => Promise<void>;
  isSwitching: boolean;
  switchError: string | null;
} {
  const { isConnected, chainId, connector } = useAccount();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  async function switchToXLayer() {
    setIsSwitching(true);
    setSwitchError(null);
    try {
      const provider = connector
        ? asEip1193Provider(await connector.getProvider())
        : undefined;
      await ensureConfiguredNetwork(provider);
    } catch (error) {
      setSwitchError(walletErrorMessage(error));
    } finally {
      setIsSwitching(false);
    }
  }

  return {
    isConnected,
    isCorrect: chainId === CHAIN_ID,
    switchToXLayer,
    isSwitching,
    switchError,
  };
}
