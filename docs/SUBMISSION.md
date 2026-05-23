# X Cup Submission — Kickoff

> **DO NOT SUBMIT WITHOUT EXPLICIT APPROVAL.** This is a fill-in-the-blanks draft for the single X Cup Google Form. Review every field, fill the `TODO`s, then submit yourself.
>
> **Deadline:** 23:59 UTC, **May 28, 2026**.
> **Prizes:** 1st 5,000 USDT · 2nd 3,000 USDT (×2) · 3rd 1,000 USDT (×3).
> **Judging:** dual AI-judge + human-judge. Criteria: **Innovation** (WC differentiation), **Market potential** (capture WC traffic → X Layer on-chain users + transactions), **Completion** (delivered, demonstrable, on-chain verifiable), **Demo video** (bonus).

---

## The 8 required fields

### (1) Email
`TODO — your contact email`

### (2) Project Name
```
Kickoff
```

### (3) One-Line Description & Project Highlights  ← **SCORED**

**One-line description:**
```
Kickoff — trade the beautiful game, live and on-chain: continuously-tradeable, categorical FIFA World Cup 2026 markets on X Layer, settled by a trustless bonded optimistic oracle, where every position is a real transaction in the OKX ecosystem.
```

**Project Highlights:**
```
• World-Cup-native, categorical markets — the only live, continuously-tradeable World Cup market on X Layer. Native N-outcome markets (1X2 Home/Draw/Away, group winner with one outcome per team, Over/Under 2.5, Both-Teams-To-Score, outright, Golden Boot) where the implied probabilities sum to ~100%. Not a general prediction market with a sports tab; every market, seed, and oracle is built for WC 2026 (48 teams, USA/Canada/Mexico, 104 matches, Jun 11–Jul 19).

• Trustless resolution — a bonded optimistic oracle, not a single key. Anyone proposes a result and posts a bond; anyone disputes; anyone settles undisputed results on-chain. The deployment revokes the deployer's direct resolver role, so the oracle is the sole settlement path (verified on-chain).

• Converts the biggest event in sports into X Layer on-chain activity — the exact metric OKX rewards. Each trade is a real transaction and each trader a new OKX-ecosystem wallet. The World Cup is a recurring global traffic spike; Kickoff is the funnel that turns that attention into on-chain transactions and users.

• Live categorical AMM, not an order book. Each market is a general Fixed-Product Market Maker (Gnosis/Polymarket lineage) over N outcomes: price = normalized inverse reserve = implied probability, moves with every trade, the set sums to 1. Enter, exit, or flip any second between now and the final.

• Live on-chain proof on X Layer testnet (chain 1952): 12 categorical markets seeded (incl. a 1X2 3-way and a group-winner 4-way), real volume from 7 distinct trader wallets, a full propose → 120s liveness → settle oracle cycle that resolved conditions, plus a public-LP funding lifecycle and a parlay book. Every step verifiable on OKLink.

• OKX-native end to end — OKX Wallet to connect, OKB for gas, sub-cent fees, OKLink for verifiable proof, OKX on-ramp for fiat. Differentiated vs Polymarket (Polygon, order-book) and Azuro/Overtime/SX Bet (general sportsbooks).

• Real now, honest scope. Trading and the optimistic-oracle resolution cycle are live and verifiable on X Layer testnet today; markets settle on the real result in June–July 2026. The demo proposes a clearly-labeled simulated result so the full trade→propose→settle→redeem lifecycle is demonstrable now. Mainnet, third-party audit, and the production API-FOOTBALL feed are gated.

• Depth beyond a single AMM — public liquidity and parlays. The market maker is itself an ERC-20 LP token: anyone can add/remove liquidity and earn pro-rata trading fees (permissionless market-making, proven on testnet). A house-backed ParlayBook offers 2–8-leg combination bets (distinct-condition-enforced, exposure-capped) — the bet types fans actually want, on-chain.

• Built clean: ConditionalTokens + MarketMakerFactory + FixedProductMarketMaker (EIP-1167 minimal-proxy clone per market, itself an ERC-20 LP token) + OptimisticOracle + ParlayBook + USDC collateral. Solidity 0.8.26, OpenZeppelin v5.6.1, Foundry; 60 tests green (categorical + fuzz no-free-money + full oracle cycle + LP fee-split/exit + parlay exposure guards); reentrancy-guarded, CEI, collateral-whitelisted, per-proposal bond/deadline snapshots, append-only resolution. Deps vendored — a plain git clone builds with no submodules.
```

### (4) Project X (Twitter) Official Handle URL
`TODO — https://x.com/<dedicated Kickoff account>` (e.g. `https://x.com/KickoffMarkets`)

### (5) X Post Link (tags @XLayerOfficial + #BuildX)
`TODO — URL of the submission post` (use Post #8 from `docs/X_CONTENT.md`).
**Verify the post tags @XLayerOfficial AND contains #BuildX before submitting.**

### (6) Team Telegram contacts
`TODO — Telegram handle(s)`

### (7) Team X contacts
`TODO — personal/team X handle(s)`

### (8) Public GitHub repo link
`TODO — https://github.com/<owner>/kickoff` (must be **public**; confirm it loads logged-out)

### (Optional) Note to X Layer team
```
Kickoff is built to do exactly what X Cup is for: turn World Cup attention into real on-chain activity on X Layer. Live categorical AMM markets, a trustless bonded optimistic oracle for resolution, OKX Wallet + OKB gas — all live on X Layer testnet (chain 1952) with 9 seeded markets, real multi-wallet volume, and a completed propose→settle oracle cycle, every step verifiable on OKLink. Happy to walk the team through the live demo and on-chain trades.
```

---

## Pre-submit checklist

**Account & posts**
- [ ] Dedicated Kickoff X account exists and has posted actively May 19–28.
- [ ] Submission post tags **@XLayerOfficial** and includes **#BuildX**.
- [ ] Launch thread is pinned.

**Repo**
- [ ] GitHub repo is **public** (open it in a logged-out/incognito window to confirm).
- [ ] `README.md` present at root; `docs/` (ARCHITECTURE, DEMO_SCRIPT) present.
- [ ] Plain `git clone` builds — deps vendored, no submodule step. `cd contracts && forge build` succeeds.
- [ ] No secrets committed (no `.env`, no private keys).

**On-chain (Completion / verifiability)**
- [x] v3 (funded-LP + parlays) contracts deployed to X Layer testnet (chain 1952); addresses in the README "Deployed addresses" table (`MarketMakerFactory` `0x08A349C2…`, `ConditionalTokens` `0x846AA126…`, `OptimisticOracle` `0xA82075EB…`, `ParlayBook` `0xF323A948…`, `MockUSDC` `0xd347711C…`, FPMM impl `0x4d12be79…`).
- [x] Real trade txs exist and are viewable on OKLink — 12 categorical markets, volume from 7 distinct trader wallets, plus a public-LP funding lifecycle and a parlay book (links ready for judges).
- [x] A full propose → 120s liveness → settle oracle cycle resolved conditions on-chain; deployer resolver role revoked (verified).
- [ ] Demo settlement / proposed result is clearly labeled "simulated".

**Demo video (bonus)**
- [ ] 1–3 min video recorded per `docs/DEMO_SCRIPT.md`, showing real on-chain trades + the optimistic-oracle propose→settle + OKLink + labeled simulated result.
- [ ] Video link ready (and added to the submission post / form note if appropriate).

**Form fields**
- [ ] Fields (1)(4)(5)(6)(7)(8) filled — no remaining `TODO`s.
- [ ] One-Line Description & Highlights (field 3) pasted in full.

**Final**
- [ ] Submitting **before 23:59 UTC May 28, 2026**.
- [ ] **User has explicitly approved submission.**

---

> Restated: **do not submit the Google Form, do not post the X submission, do not create accounts without the user's explicit go-ahead.** All content here is a draft.
