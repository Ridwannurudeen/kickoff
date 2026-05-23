/**
 * Minimal ABI fragments matching the deployed Kickoff (categorical / N-outcome)
 * contracts. Signatures mirror the Foundry artifacts in contracts/out/*.sol/*.json
 * exactly so the UI can read live state and submit trades.
 *
 * The engine is categorical: a market has `outcomeCount()` outcomes; `prices()`
 * returns 1e18-scaled implied probabilities (sum ~1e18) and `getReserves()`
 * returns the per-outcome reserve array. There is no `spotPrice(uint8)`.
 */

export const erc20Abi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export const conditionalTokensAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "redeemPositions",
    stateMutability: "nonpayable",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getPositionId",
    stateMutability: "pure",
    inputs: [
      { name: "collateral", type: "address" },
      { name: "conditionId", type: "bytes32" },
      { name: "outcomeIndex", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOutcomeSlotCount",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "conditionStatus",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "payoutNumerators",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "event",
    name: "ConditionResolved",
    inputs: [
      { name: "conditionId", type: "bytes32", indexed: true },
      { name: "oracle", type: "address", indexed: true },
      { name: "payoutNumerators", type: "uint256[]", indexed: false },
    ],
  },
] as const;

export const factoryAbi = [
  {
    type: "function",
    name: "marketsLength",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allMarkets",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "marketCondition",
    stateMutability: "view",
    inputs: [{ name: "market", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "conditionalTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "market", type: "address", indexed: true },
      { name: "conditionId", type: "bytes32", indexed: true },
      { name: "collateral", type: "address", indexed: false },
      { name: "outcomeSlotCount", type: "uint8", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;

export const fpmmAbi = [
  {
    type: "function",
    name: "outcomeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "prices",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getPositionIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "calcBuyAmount",
    stateMutability: "view",
    inputs: [
      { name: "outcomeIndex", type: "uint8" },
      { name: "investmentAmount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "calcSellAmount",
    stateMutability: "view",
    inputs: [
      { name: "outcomeIndex", type: "uint8" },
      { name: "returnAmount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "conditionId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "collateralToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feePoolWeight",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feesWithdrawableBy",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "closed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "outcomeIndex", type: "uint8" },
      { name: "investmentAmount", type: "uint256" },
      { name: "minOutcomeTokensToBuy", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "outcomeIndex", type: "uint8" },
      { name: "returnAmount", type: "uint256" },
      { name: "maxOutcomeTokensToSell", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "addFunding",
    stateMutability: "nonpayable",
    inputs: [
      { name: "addedFunds", type: "uint256" },
      { name: "distributionHint", type: "uint256[]" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "removeFunding",
    stateMutability: "nonpayable",
    inputs: [{ name: "sharesToBurn", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawFees",
    stateMutability: "nonpayable",
    inputs: [{ name: "account", type: "address" }],
    outputs: [],
  },
  {
    type: "event",
    name: "FPMMFundingAdded",
    inputs: [
      { name: "funder", type: "address", indexed: true },
      { name: "amountsAdded", type: "uint256[]", indexed: false },
      { name: "sharesMinted", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FPMMFundingRemoved",
    inputs: [
      { name: "funder", type: "address", indexed: true },
      { name: "amountsRemoved", type: "uint256[]", indexed: false },
      { name: "collateralFeesRemoved", type: "uint256", indexed: false },
      { name: "sharesBurnt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FeesWithdrawn",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FPMMBuy",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "outcomeIndex", type: "uint8", indexed: false },
      { name: "investmentAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "outcomeTokensBought", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FPMMSell",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "outcomeIndex", type: "uint8", indexed: false },
      { name: "returnAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "outcomeTokensSold", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * ParlayBook — combine 2–8 FPMM legs (market + chosen outcome) into a fixed-odds
 * parlay. Stake is 6-dec USDC, approved to the book before placeParlay. Payout =
 * stake × product(1e18 / prices()[outcome]); settled permissionlessly once every
 * leg's condition resolves. result: 0 lost, 1 won, 2 void.
 */
export const parlayBookAbi = [
  {
    type: "function",
    name: "placeParlay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "markets", type: "address[]" },
      { name: "outcomes", type: "uint8[]" },
      { name: "stake", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "settleParlay",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getParlay",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "bettor", type: "address" },
      { name: "stake", type: "uint256" },
      { name: "payout", type: "uint256" },
      { name: "settled", type: "bool" },
      { name: "markets", type: "address[]" },
      { name: "outcomes", type: "uint8[]" },
    ],
  },
  {
    type: "function",
    name: "parlaysLength",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "freeLiquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxExposureBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "minLegs",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "maxLegs",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "collateral",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "conditionalTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "ParlayPlaced",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "bettor", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
      { name: "payout", type: "uint256", indexed: false },
      { name: "legs", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ParlaySettled",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "result", type: "uint8", indexed: false },
      { name: "paid", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * OptimisticOracle — used read-only to surface a market's resolution state.
 * status: 0 None, 1 Proposed, 2 Disputed, 3 Settled.
 */
export const oracleAbi = [
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [
      { name: "proposer", type: "address" },
      { name: "disputer", type: "address" },
      { name: "proposedAt", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "payouts", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "liveness",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "bondAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
