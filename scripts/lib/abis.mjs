// Minimal hand-written ABIs covering only the functions the off-chain scripts call.
// Signatures verified against the Foundry artifacts in ../contracts/out/*.sol/*.json
// (the "abi" field). These are the v2 CATEGORICAL contracts + OPTIMISTIC ORACLE.

export const mockUsdcAbi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'pure', inputs: [], outputs: [{ type: 'uint8' }] },
];

export const conditionalTokensAbi = [
  { type: 'function', name: 'prepareCondition', stateMutability: 'nonpayable', inputs: [{ name: 'collateral', type: 'address' }, { name: 'questionId', type: 'bytes32' }, { name: 'outcomeSlotCount', type: 'uint8' }], outputs: [{ name: 'conditionId', type: 'bytes32' }] },
  { type: 'function', name: 'getOutcomeSlotCount', stateMutability: 'view', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'isApprovedForAll', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'redeemPositions', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [{ name: 'payout', type: 'uint256' }] },
  { type: 'function', name: 'reportPayouts', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }, { name: 'payouts', type: 'uint256[]' }], outputs: [] },
  // 0=None, 1=Open, 2=Resolved, 3=Voided (verified against ConditionalTokens.json)
  { type: 'function', name: 'conditionStatus', stateMutability: 'view', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'payoutNumerators', stateMutability: 'view', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'getPositionId', stateMutability: 'pure', inputs: [{ name: 'collateral', type: 'address' }, { name: 'conditionId', type: 'bytes32' }, { name: 'outcomeIndex', type: 'uint8' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
];

export const factoryAbi = [
  { type: 'function', name: 'marketsLength', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allMarkets', stateMutability: 'view', inputs: [{ name: 'index', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'marketCondition', stateMutability: 'view', inputs: [{ name: 'market', type: 'address' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'createMarket', stateMutability: 'nonpayable', inputs: [{ name: 'collateral', type: 'address' }, { name: 'questionId', type: 'bytes32' }, { name: 'outcomeSlotCount', type: 'uint8' }, { name: 'metadataURI', type: 'string' }], outputs: [{ name: 'market', type: 'address' }, { name: 'conditionId', type: 'bytes32' }] },
  { type: 'event', name: 'MarketCreated', inputs: [{ name: 'market', type: 'address', indexed: true }, { name: 'conditionId', type: 'bytes32', indexed: true }, { name: 'collateral', type: 'address', indexed: false }, { name: 'outcomeSlotCount', type: 'uint8', indexed: false }, { name: 'metadataURI', type: 'string', indexed: false }] },
];

// FixedProductMarketMaker — categorical, N outcomes.
// NOTE: getReserves()/prices() are now uint256[] arrays (was a 2-tuple + spotPrice).
export const marketAbi = [
  { type: 'function', name: 'outcomeCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getReserves', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'prices', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'getPositionIds', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'calcBuyAmount', stateMutability: 'view', inputs: [{ name: 'outcomeIndex', type: 'uint8' }, { name: 'investmentAmount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'calcSellAmount', stateMutability: 'view', inputs: [{ name: 'outcomeIndex', type: 'uint8' }, { name: 'returnAmount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'buy', stateMutability: 'nonpayable', inputs: [{ name: 'outcomeIndex', type: 'uint8' }, { name: 'investmentAmount', type: 'uint256' }, { name: 'minOutcomeTokensToBuy', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sell', stateMutability: 'nonpayable', inputs: [{ name: 'outcomeIndex', type: 'uint8' }, { name: 'returnAmount', type: 'uint256' }, { name: 'maxOutcomeTokensToSell', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'addLiquidity', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'conditionId', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'collateralToken', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'feeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'closed', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
];

// OptimisticOracle — proposers/disputers post a bond (in bondToken == USDC collateral),
// then after `liveness` an undisputed proposal can be settled (writes payouts to the CT).
// status: 0=None, 1=Proposed, 2=Disputed, 3=Settled (verified against OptimisticOracle.json)
export const optimisticOracleAbi = [
  { type: 'function', name: 'propose', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }, { name: 'payouts', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'dispute', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'settle', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'resolveDispute', stateMutability: 'nonpayable', inputs: [{ name: 'conditionId', type: 'bytes32' }, { name: 'finalPayouts', type: 'uint256[]' }, { name: 'proposerWon', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'getProposal', stateMutability: 'view', inputs: [{ name: 'conditionId', type: 'bytes32' }], outputs: [{ name: 'proposer', type: 'address' }, { name: 'disputer', type: 'address' }, { name: 'proposedAt', type: 'uint64' }, { name: 'status', type: 'uint8' }, { name: 'payouts', type: 'uint256[]' }] },
  { type: 'function', name: 'bondAmount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'liveness', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'bondToken', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];
