# Kickoff — web

Trade the beautiful game — live, on-chain. A Next.js trading frontend for live
FIFA World Cup 2026 prediction markets on **X Layer** (OKX's OP Stack L2).

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- TailwindCSS — dark sportsbook-meets-crypto theme
- wagmi v2 + viem v2 (`xLayer` chain ships in `viem/chains`)
- @tanstack/react-query (bundled with wagmi v2)
- recharts (probability chart), zustand (toast/UI state)

Wallet connectors, in priority order: **OKX Wallet** (injected, `window.okxwallet`)
→ **MetaMask** → generic injected. A "Switch to X Layer" helper appears whenever
the connected wallet is on the wrong chain.

## Quick start

```bash
npm install
cp .env.example .env.local   # edit values once contracts are deployed
npm run dev                  # http://localhost:3000
```

The app runs and is fully demoable **before any contracts are deployed**: when
`NEXT_PUBLIC_FACTORY` is unset or the zero address, it renders a built-in set of
mock World Cup markets and graceful empty states. It never crashes on missing
on-chain data.

## Environment variables

All config is `NEXT_PUBLIC_*` (public, compiled into the client bundle). See
`.env.example`. Never put secrets here.

| Var                              | Purpose                                                            | Default                               |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| `NEXT_PUBLIC_CHAIN_ID`           | Target chain. Mainnet = `196`; X Layer testnet = `1952` (`0x7a0`). | `1952`                                |
| `NEXT_PUBLIC_RPC_URL`            | JSON-RPC endpoint                                                  | `https://testrpc.xlayer.tech/terigon` |
| `NEXT_PUBLIC_EXPLORER_URL`       | OKLink base (tx links → `<url>/tx/<hash>`)                         | testnet OKLink if unset               |
| `NEXT_PUBLIC_USDC_ADDRESS`       | MockUSDC (6-dec collateral)                                        | zero addr → demo mode                 |
| `NEXT_PUBLIC_CONDITIONAL_TOKENS` | ConditionalTokens (ERC1155)                                        | zero addr → demo mode                 |
| `NEXT_PUBLIC_FACTORY`            | MarketMakerFactory                                                 | zero addr → demo mode                 |
| `NEXT_PUBLIC_OPTIMISTIC_ORACLE`  | OptimisticOracle (resolution-state surface, optional)              | zero addr → hidden                    |
| `NEXT_PUBLIC_CHAIN_NAME`         | Label for the network indicator                                    | derived from chainId                  |

When `NEXT_PUBLIC_CHAIN_ID != 196`, the viem chain is built with `defineChain`
from the env values (native gas OKB, 18 decimals). On `196` it uses viem's
built-in `xLayer`.

## Chain facts

- **X Layer mainnet**: chainId `196`, gas OKB, RPC `https://rpc.xlayer.tech`,
  explorer `https://www.oklink.com/xlayer`.
- **X Layer testnet**: chainId `1952` (`0x7a0`), gas OKB, RPC
  `https://testrpc.xlayer.tech/terigon`, explorer
  `https://www.oklink.com/xlayer-test`.

## Routes

| Route                               | What it does                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                 | Hero + featured markets + live recent-trades ticker + total volume + OKX fiat on-ramp                                                                                                        |
| `/markets`                          | Full market list with tabs (In-play / Matches / Over-Under / BTTS / Groups / Outright / Golden Boot)                                                                                         |
| `/markets/[market]`                 | Per-outcome probabilities + probability chart (tracks selected outcome) + N-outcome bet slip + recent trades + oracle resolution state + shareable bet slip. `[market]` is the FPMM address. |
| `/portfolio`                        | Connected wallet positions (any outcome), marks, est. value, Sell + post-resolution Redeem                                                                                                   |
| `/leaderboard`                      | Top traders by volume / realized PnL from event logs + referral link panel                                                                                                                   |
| `/markets/[market]/opengraph-image` | Dynamic OG bet-slip card for sharing                                                                                                                                                         |

## Trading UX

- **Buy**: `calcBuyAmount` → `buy(outcome, investment, minOut = quote*(1-slippage))`.
- **Sell** N shares: binary-search `calcSellAmount` for the collateral
  `returnAmount` that costs ~N shares, then
  `sell(outcome, returnAmount, maxShares = N*(1+slippage))`.
- USDC is 6-decimal; outcome tokens 18-decimal — amounts are formatted accordingly.
- **Categorical / N-outcome**: a market has `outcomeCount()` outcomes. Implied
  probabilities come from `prices()` (1e18-scaled, sum ~1e18); when unavailable
  they are derived from `getReserves()` as `p[i] = (1/r[i]) / Σ(1/r[j])`. Outcome
  labels are derived from the market's category + metadataURI (see `lib/labels.ts`).
- Every successful tx raises a toast linking to OKLink (`<explorer>/tx/<hash>`).

## Virality & onboarding

- **OKX fiat on-ramp** — `Buy crypto ↗` links out to `https://web3.okx.com/`.
- **Shareable bet slips** — every market detail has copy-link + share-to-X, with
  a referral tag (`?ref=<wallet>`) and a branded OG card.
- **Referrals** — first-touch attribution stored client-side; the leaderboard
  shows your referral link and who referred you. Non-custodial, attribution only.

## Contract ABIs

Minimal hand-written ABI fragments live in `lib/abis.ts`, matching the deployed
categorical contracts (MockUSDC, ConditionalTokens, MarketMakerFactory,
FixedProductMarketMaker, OptimisticOracle) from `contracts/out/*.sol/*.json`.

## Build

```bash
npm run build
npm run typecheck
```
