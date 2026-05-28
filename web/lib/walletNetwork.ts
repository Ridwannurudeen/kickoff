import type { AddEthereumChainParameter, EIP1193Provider } from "viem";

import {
  CHAIN_ID,
  CHAIN_ID_HEX,
  CHAIN_NAME,
  EXPLORER_URL,
  RPC_URL,
} from "./config";

const xLayerWalletParams = {
  chainId: CHAIN_ID_HEX,
  chainName: CHAIN_NAME,
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
} satisfies AddEthereumChainParameter;

const NETWORK_FIX =
  CHAIN_ID === 196
    ? `Rabby has a stale ${CHAIN_NAME} network saved. Edit or remove it in Rabby, then add chain ID ${CHAIN_ID} (${CHAIN_ID_HEX}), RPC ${RPC_URL}, symbol OKB. Do not use the X Layer testnet RPC for this app.`
    : `Rabby has a stale ${CHAIN_NAME} network saved. Edit or remove it in Rabby, then add chain ID ${CHAIN_ID} (${CHAIN_ID_HEX}), RPC ${RPC_URL}, symbol OKB. Do not use the X Layer mainnet RPC https://rpc.xlayer.tech for this testnet app.`;

export async function ensureConfiguredNetwork(provider?: EIP1193Provider) {
  const wallet = provider ?? getInjectedProvider();
  if (!wallet) throw new Error("No injected wallet found.");

  try {
    await switchToConfiguredNetwork(wallet);
  } catch (switchError) {
    if (isUserRejected(switchError)) throw switchError;

    try {
      await wallet.request({
        method: "wallet_addEthereumChain",
        params: [xLayerWalletParams],
      });
      await switchToConfiguredNetwork(wallet);
    } catch (addError) {
      if (isRpcChainMismatch(switchError) || isRpcChainMismatch(addError)) {
        throw new Error(NETWORK_FIX);
      }
      throw addError;
    }
  }

  const chainId = await wallet.request({ method: "eth_chainId" });
  if (typeof chainId !== "string" || chainId.toLowerCase() !== CHAIN_ID_HEX) {
    throw new Error(
      `Wallet switched to ${String(chainId)}, expected ${CHAIN_ID_HEX}.`,
    );
  }
}

export function walletErrorMessage(error: unknown): string {
  if (isRpcChainMismatch(error)) return NETWORK_FIX;
  return errorMessage(error) || "unknown error";
}

export function asEip1193Provider(
  provider: unknown,
): EIP1193Provider | undefined {
  if (
    typeof provider !== "object" ||
    provider === null ||
    !("request" in provider)
  ) {
    return undefined;
  }
  return provider as EIP1193Provider;
}

function getInjectedProvider(): EIP1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  const injected = window as unknown as {
    ethereum?: EIP1193Provider;
    okxwallet?: EIP1193Provider;
  };
  return injected.ethereum ?? injected.okxwallet;
}

function switchToConfiguredNetwork(provider: EIP1193Provider) {
  return provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: CHAIN_ID_HEX }],
  });
}

function isUserRejected(error: unknown): boolean {
  return errorCode(error) === 4001;
}

function isRpcChainMismatch(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes("invalid chain id") ||
    message.includes("rpc invalid") ||
    message.includes("currently unavailable")
  );
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === "number" ? code : undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}
