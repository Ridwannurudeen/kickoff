import type { QueryClient } from "@tanstack/react-query";
import type { Hash } from "viem";
import { publicClient } from "./client";

export async function waitForTransactionAndRefresh(
  hash: Hash,
  queryClient: QueryClient,
) {
  const receipt = await publicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted.");
  }
  await queryClient.invalidateQueries();
  return receipt;
}
