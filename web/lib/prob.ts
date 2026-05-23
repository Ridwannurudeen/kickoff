/**
 * Probability helpers for the categorical FPMM.
 *
 * Preferred source is the contract's `prices()` -> uint256[] (1e18-scaled implied
 * probabilities, summing to ~1e18). When prices are unavailable we derive them
 * from the reserve array: a smaller reserve means a scarcer, more-likely outcome,
 * so p[i] = (1/r[i]) / sum_j(1/r[j]).
 */

/** Normalize a `prices()` array (1e18-scaled) into 0..1 probabilities. */
export function pricesToProbabilities(prices: bigint[]): number[] {
  const nums = prices.map((p) => Number(p) / 1e18);
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const n = nums.length || 1;
    return nums.map(() => 1 / n);
  }
  return nums.map((p) => p / sum);
}

/** Derive 0..1 probabilities from the per-outcome reserve array. */
export function reservesToProbabilities(reserves: bigint[]): number[] {
  const n = reserves.length;
  if (n === 0) return [];
  const invs = reserves.map((r) => (r > 0n ? 1 / Number(r) : 0));
  const sum = invs.reduce((a, b) => a + b, 0);
  if (sum <= 0) return reserves.map(() => 1 / n);
  return invs.map((v) => v / sum);
}
