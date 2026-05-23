# Kickoff — Roadmap

**Vision:** become the on-chain venue where the world trades live sport — starting with the single biggest event on earth, the FIFA World Cup 2026 — and turn that once-in-four-years traffic spike into a permanent prediction-and-trading layer for the OKX / X Layer ecosystem.

The thesis is proven by demand, not hope: Polymarket already shows **~$1.1B of lifetime volume on a *single* "2026 World Cup Winner" market**. That demand sits on Polygon and centralized books today. Kickoff routes it onto X Layer, where OKX's wallet, OKB gas, sub-cent fees and 5,000 TPS make a month-long traffic event tradeable for mainstream fans.

---

## Where we are today — v0.1 (hackathon, shipped)

Live and verifiable on **X Layer testnet (chain 1952)**:

- **Categorical, multi-outcome markets** (2–16 outcomes) on a Gnosis-style **Fixed-Product Market Maker**, with **ERC-1155 conditional tokens** (split / merge / redeem) and **USDC collateral** — buy *and* sell, real price discovery, prices that sum to 1 across all outcomes. Market types: 1X2 (Home/Draw/Away), group winner (one outcome per team), Over/Under 2.5, Both-Teams-To-Score, outright winner, Golden Boot.
- **World Cup markets seeded** (categorical 1X2 + group-winner alongside outright + Golden Boot), EIP-1167 clone per market, with real multi-wallet trading volume on-chain.
- **Trustless resolution** via a bonded **OptimisticOracle** (propose / dispute / settle, per-proposal bond + liveness window) — the deployer's direct `ORACLE_ROLE` is **revoked on deploy**, so the oracle is the sole settlement path (verified on-chain). A full propose → liveness → settle cycle is proven on testnet. An off-chain keeper feeds it (simulated now; API-FOOTBALL skeleton for production).
- **Public liquidity**: the FPMM is itself an ERC-20 LP token — anyone can `addFunding` / `removeFunding` and earns pro-rata trading fees (permissionless market-making, proven on testnet).
- **Parlays**: a house-backed `ParlayBook` for 2–8-leg fixed-odds combination bets (distinct-condition-enforced, exposure-capped).
- **Next.js trading app** (wagmi/viem, OKX-Wallet-first): categorical markets list / detail with live chart + bet slip, liquidity panel, parlay builder, portfolio (incl. LP P&L) / leaderboard — installable PWA.
- **60/60 Foundry tests** incl. no-free-money + price-bounds fuzz, the full optimistic-oracle cycle, LP fee-split / pro-rata exit, and parlay exposure / duplicate-leg guards. End-to-end proven on-chain: deploy → seed → trade → propose → settle → redeem.

This already pulls forward the **optimistic oracle** (Phase 1) and **public liquidity, categorical & parlay markets, and the PWA** (Phase 2) as testnet previews — the remaining gate for those is mainnet + a third-party audit, below.

**Known limits to retire:** contracts are hackathon-grade and **unaudited**; resolution depends on an off-chain keeper feeding the oracle (the dispute window is the backstop); deployed against testnet **MockUSDC**, not mainnet USDC; settlement of real World Cup results lands after the hackathon (group stage starts June 11, 2026).

---

## Phase 1 — "Kickoff" · Mainnet + World Cup launch (June 2026)
*The window: group stage June 11 – July 19, 2026. Capture the spike.*

- **Mainnet deployment** on X Layer (chain 196) against **real USDC** (`0x74b7…`), contracts **verified on OKLink** and **independently audited** (hard gate before real money).
- **Full tournament coverage**: all **104 matches** (match result, double chance, over/under goals, both-teams-to-score) + every group winner + outright + Golden Boot / Golden Glove. Auto-generated from the fixture feed.
- **Trustless resolution v1**: automated keeper on **API-FOOTBALL** posting results, wrapped in an **optimistic oracle** (UMA / Reality.eth-style) with a dispute window + bond — so no single multisig can decide outcomes.
- **In-play micro-markets**: "next goal", "next card", live win-probability that re-prices during matches — the use case X Layer's sub-cent fees + ~1s blocks uniquely enable.
- **Mainstream onboarding**: ERC-4337 / OKX smart-account login (email/social), **sponsored first trade** (gasless), fiat→USDC via OKX on-ramp. Kill every drop-off between a fan and their first on-chain position.
- **Virality**: shareable bet-slip cards (OG images), referral leaderboards, "match-day" push.

**North star for the window:** new X Layer wallets created, transactions generated, and notional volume during the tournament.

---

## Phase 2 — "Full Time" · Liquidity & depth (Q3 2026, post-tournament)
*Convert the spike into a real market venue.*

- **Public liquidity provision**: LP tokens on the FPMM, pro-rata fee accrual, incentive program — anyone can be a market maker (today it's protocol-only).
- **Hybrid CLOB + AMM**: an order book layered over the AMM (Polymarket model) for tight spreads on liquid markets, AMM as backstop liquidity.
- **Categorical & parlay markets**: native multi-outcome conditions ("who wins Group A" as one 4-way market that sums to 1) and **combinable legs** (parlays) via nested conditional tokens — better capital efficiency and the bet types fans actually want.
- **Mobile-first PWA**, portfolio P&L, position alerts.
- **Security**: second audit + public bug bounty.

---

## Phase 3 — "Extra Time" · Decentralize & generalize (Q4 2026)

- **Permissionless market creation**: anyone lists a market by posting a bond; bad/ambiguous markets resolved by the optimistic oracle + slashing.
- **Decentralized resolution network**: multiple independent data feeds + dispute escalation; remove all admin keys from the resolution path.
- **Protocol governance**: token + DAO controlling listings, fees, treasury, and incentive emissions.
- **All-sports expansion**: the FPMM + conditional-token engine is sport-agnostic — Champions League, NFL, NBA, cricket, F1, esports. Same rails, more events.

---

## Phase 4 — "The League" · The prediction layer of X Layer (2027+)

- **Any event, on-chain**: elections, macro prints, crypto prices, culture/awards — Kickoff becomes the general prediction-and-trading layer, not just sport.
- **B2B infrastructure / SDK**: white-label markets + a resolution-oracle product other X Layer apps embed (an Azuro-style infra play on OKX's chain).
- **Copy-trading & signals**: reuse the **x402 signal-marketplace rail (Beacon)** so sharp forecasters monetize calls and fans one-click-mirror them.
- **Cross-chain liquidity** via OKX bridge / LayerZero, with X Layer as the settlement home.

---

## North-star metrics
1. **On-chain transactions & unique wallets on X Layer** (the metric OKX rewards).
2. **Notional volume** and **open interest / TVL**.
3. **Active markets** and **resolution accuracy / dispute rate**.
4. **Retention**: % of World-Cup-acquired wallets still trading 90 days later (the spike-to-evergreen conversion).

## Moat & positioning
Not "out-liquidity Polymarket" — be the **event-native, OKX-ecosystem venue**: World-Cup-deep markets, live AMM trading (buy *and* sell, exit anytime), OKX-Wallet + OKB-gas + sub-cent fees making mainstream onboarding frictionless, and a sport-agnostic engine that generalizes after the final whistle.

## Risks & hard dependencies (named honestly)
- **Audit before mainnet money** — current contracts are hackathon-grade; a real audit is non-negotiable for Phase 1.
- **Oracle is the crux** — automated + optimistic resolution must be robust; outright/Golden-Boot markets only settle after the final, so the fixture→market mapping needs careful curation.
- **Regulatory / geo** — prediction & betting markets face real legal constraints by jurisdiction (cf. Polymarket's history); geofencing, terms, and compliance posture must be deliberate, not an afterthought.
- **Cold-start liquidity** post-tournament — Phase 2 LP incentives must bridge the gap between the World Cup spike and evergreen volume.
