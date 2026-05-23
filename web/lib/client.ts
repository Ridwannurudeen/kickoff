import { createPublicClient, http, type PublicClient } from "viem";
import { activeChain, RPC_URL } from "./config";

/**
 * A standalone viem public client for reads outside React (multicall-style
 * batch reads in data loaders). Mirrors the wagmi transport.
 */
let _client: PublicClient | undefined;

export function publicClient(): PublicClient {
  if (!_client) {
    _client = createPublicClient({
      chain: activeChain,
      transport: http(RPC_URL),
    });
  }
  return _client;
}
