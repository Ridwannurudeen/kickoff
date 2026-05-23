import { publicClient } from "./client";
import { fpmmAbi } from "./abis";

/**
 * Trade math helpers around the FixedProductMarketMaker.
 *
 * BUY: quote = calcBuyAmount(outcome, investment); minOut = quote*(1-slippage).
 * SELL N shares: we need the collateral `returnAmount` to request. The contract
 *   only exposes calcSellAmount(outcome, returnAmount) -> sharesNeeded, so we
 *   binary-search returnAmount such that sharesNeeded ≈ N, then call
 *   sell(outcome, returnAmount, maxShares = N*(1+slippage)).
 */

export interface BuyQuote {
  /** outcome tokens received for the investment (base 18-dec units) */
  sharesOut: bigint;
  /** minimum acceptable shares after slippage */
  minOut: bigint;
}

export async function quoteBuy(
  market: `0x${string}`,
  outcomeIndex: number,
  investment: bigint,
  slippageBps: number,
): Promise<BuyQuote> {
  const sharesOut = (await publicClient().readContract({
    address: market,
    abi: fpmmAbi,
    functionName: "calcBuyAmount",
    args: [outcomeIndex, investment],
  })) as bigint;
  const minOut = (sharesOut * BigInt(10_000 - slippageBps)) / 10_000n;
  return { sharesOut, minOut };
}

export interface SellQuote {
  /** collateral the user receives (6-dec USDC base units) */
  returnAmount: bigint;
  /** shares the contract will pull for that returnAmount */
  sharesIn: bigint;
  /** max shares to authorize, after slippage */
  maxSharesIn: bigint;
}

/**
 * Find the collateral returnAmount that costs ~`targetShares` outcome tokens.
 * calcSellAmount is monotonic in returnAmount, so a binary search converges fast.
 */
export async function quoteSell(
  market: `0x${string}`,
  outcomeIndex: number,
  targetShares: bigint,
  reserveCollateral: bigint,
  slippageBps: number,
): Promise<SellQuote> {
  const read = (returnAmount: bigint) =>
    publicClient().readContract({
      address: market,
      abi: fpmmAbi,
      functionName: "calcSellAmount",
      args: [outcomeIndex, returnAmount],
    }) as Promise<bigint>;

  // starting guess from the outcome reserve; the loop below grows it until it's
  // a true upper bound on the shares needed, so this only needs to be nonzero.
  let lo = 0n;
  let hi = reserveCollateral > 0n ? reserveCollateral : targetShares; // fallback
  // ensure hi is actually an upper bound on shares needed
  let hiShares = await read(hi);
  let guard = 0;
  while (hiShares < targetShares && guard < 40) {
    hi = hi * 2n + 1n;
    hiShares = await read(hi);
    guard++;
  }

  // binary search: smallest returnAmount whose sharesIn >= targetShares
  for (let i = 0; i < 60 && hi - lo > 1n; i++) {
    const mid = (lo + hi) / 2n;
    const s = await read(mid);
    if (s >= targetShares) hi = mid;
    else lo = mid;
  }

  const returnAmount = hi;
  const sharesIn = await read(returnAmount);
  const maxSharesIn = (targetShares * BigInt(10_000 + slippageBps)) / 10_000n;
  return { returnAmount, sharesIn, maxSharesIn };
}

/**
 * Price impact for a buy: difference between the marginal price (current spot)
 * and the average price actually paid (investment / sharesOut). Returns 0..1.
 */
export function priceImpact(
  investment: number,
  sharesOut: number,
  spotProbability: number,
): number {
  if (sharesOut <= 0 || spotProbability <= 0) return 0;
  const avgPrice = investment / sharesOut;
  const impact = (avgPrice - spotProbability) / spotProbability;
  return Math.max(0, impact);
}
