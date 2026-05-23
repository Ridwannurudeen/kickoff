import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "./config";

/** Whether the connected wallet is on the app's configured X Layer chain. */
export function useOnCorrectChain(): {
  isConnected: boolean;
  isCorrect: boolean;
  switchToXLayer: () => void;
  isSwitching: boolean;
} {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  return {
    isConnected,
    isCorrect: chainId === CHAIN_ID,
    switchToXLayer: () => switchChain({ chainId: CHAIN_ID }),
    isSwitching: isPending,
  };
}
