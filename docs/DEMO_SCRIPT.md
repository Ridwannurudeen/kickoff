# Demo Video Script — Kickoff

**Target length:** 2:00 (hard cap 3:00 for the optional bonus).
**Goal:** prove (a) innovation — categorical World-Cup markets + trustless bonded optimistic oracle, (b) **real, in-window on-chain trades** with OKLink tx links, (c) **labeled simulated propose → settle resolution + redeem**.
**Tone:** confident, plain English, technical-but-accessible. No hype, no jargon walls.

> **Recording rules**
> - Have OKLink testnet (`https://www.oklink.com/xlayer-test`) open in a second tab. Every time you trade or run the oracle, switch to OKLink and show the **confirmed transaction** — this is the proof judges score on "on-chain verifiability."
> - Keep the wallet network indicator (X Layer testnet / chain 1952, gas in OKB) visible at least once.
> - When you show resolution, the **"SIMULATED RESULT"** label must be on screen and read aloud. Never imply the match has been played.
> - Show real clock time or a tx timestamp early so trades are visibly "in-window."

---

## Shot list & voiceover

### 0:00 – 0:15 — Cold open / the hook

**On screen:** Kickoff landing page. Title "Kickoff — Trade the beautiful game, live, on-chain." Grid of WC 2026 markets with the market-type tabs (1X2 match result, Group winner, Over/Under, BTTS, Outright, Golden Boot). Probabilities shown as percentages.

**Voiceover:**
> "This is Kickoff — live World Cup 2026 markets you can trade right now, on-chain, on X Layer. Match results, group winners, outright champions. Every price is a live probability set by the market."

---

### 0:15 – 0:35 — The innovation (categorical + trustless)

**On screen:** Open a **1X2 match-result** market (or a group-winner market). Show the three (or N) outcomes — Home / Draw / Away — each with a probability, and an overlay: "Categorical AMM · probabilities sum to 100% · trade any time." Briefly flash a second overlay: "Resolved by a bonded optimistic oracle — no single key."

**Voiceover:**
> "Most prediction markets are a binary order book on another chain. Kickoff is a live, categorical automated market maker, built for the World Cup, on OKX's X Layer. A match-result market has three outcomes — Home, Draw, Away — and the prices are implied probabilities that add up to a hundred percent. And when results come in, nobody single-handedly decides them: a bonded optimistic oracle does, where anyone can propose, dispute, and settle."

---

### 0:35 – 1:05 — REAL trade #1 (buy), with on-chain proof

**On screen:** In the 1X2 market, click an outcome (e.g. "Home") → buy panel. Enter an amount of USDC. Show the quote (shares out, new probability, fee in bps). Click **Buy** → OKX Wallet pops up showing **X Layer testnet / gas in OKB** → confirm.

**Voiceover:**
> "Let's trade. I'll back the home side with USDC. The wallet is OKX, the chain is X Layer, gas is paid in OKB — fractions of a cent. Confirm."

**On screen:** Tx confirms in the UI; that outcome's probability ticks up while the others tick down (still summing to 100%). **Cut to the OKLink tab**, paste/click the tx hash, show the **confirmed transaction** on X Layer testnet.

**Voiceover:**
> "Confirmed. Here it is on OKLink — a real transaction on X Layer, right now. The home probability moved up, the others moved down, and the set still sums to a hundred. That's the categorical AMM at work."

---

### 1:05 – 1:25 — REAL trade #2 (multi-wallet / second market), proving "continuously tradeable"

**On screen:** Open a second market (e.g. a **group-winner** 4-way) and **buy** one team, OR **sell** part of the first position — ideally from a second wallet to show multi-trader activity. Confirm in OKX Wallet. Show the probability move. **Cut to OKLink** again — second confirmed tx. (The hardened testnet deploy already has volume from 7 distinct trader wallets — call that out.)

**Voiceover:**
> "And it keeps going — a different market, a different wallet. Here's a four-way group-winner market. Second transaction, also live on X Layer. There's already real volume here from seven different trader wallets — every trade is on-chain activity and a new active wallet in the OKX ecosystem."

---

### 1:25 – 1:50 — Labeled SIMULATED resolution: propose → settle → redeem

**On screen:** Switch to the resolution view with a clearly visible **"SIMULATED RESULT — for demo only"** banner. Run the keeper's **propose** step (the simulated result, e.g. "Home win"); show the bond posted and the **liveness window** (120s on testnet) counting. After it elapses undisputed, run **settle** — condition status flips to **Resolved**. Go to the winning position → **Redeem** → confirm in wallet → collateral returns. Cut to OKLink for the propose and settle txs.

**Voiceover:**
> "The tournament hasn't been played yet, so for the demo I'll run a clearly-labeled simulated result, using open World Cup data. Watch the oracle work: anyone proposes the outcome and posts a bond, a liveness window opens — on testnet it's two minutes — and because nobody disputes, anyone can settle it on-chain. The condition resolves, and the winning shares redeem one-to-one for USDC. In June, this same oracle settles the real result from a live football feed — and the deployer's resolver key is already revoked, so the oracle is the only thing that can resolve a market."

---

### 1:50 – 2:00 — Close / the pitch

**On screen:** Back to the market grid. Overlay text: "Kickoff · X Layer testnet (1952) · #BuildX · @XLayerOfficial". Repo / handle on screen.

**Voiceover:**
> "Kickoff turns the biggest event in sports into on-chain activity on X Layer. World-Cup-native categorical markets, a trustless optimistic oracle, OKX from wallet to gas. Trade the beautiful game — live, on-chain."

---

## Pre-record checklist

- [ ] Wallet funded with testnet OKB (gas) and MockUSDC (open faucet, for collateral); allowance pre-approved if the flow needs it, so the demo doesn't stall on an approval popup.
- [ ] At least two categorical markets live and seeded with liquidity — including a 1X2 3-way and a group-winner 4-way — so probability moves are visible, not extreme slippage.
- [ ] OKLink tab pre-loaded to X Layer **testnet** (`https://www.oklink.com/xlayer-test`).
- [ ] The **"SIMULATED RESULT"** label is wired and visible before recording the resolution segment.
- [ ] The keeper is set to SIMULATED mode (reads `data/results.json`) so propose runs without an API key.
- [ ] Screen recording at 1080p+; wallet popups legible; cursor visible.
- [ ] Do a silent dry run end-to-end (buy → buy/sell → propose → settle → redeem) to confirm no failed txs on camera.
- [ ] Captions/overlays for the chain (testnet 1952), gas token (OKB), and #BuildX / @XLayerOfficial.

## Optional B-roll / fallback

- If a live tx is slow to confirm on camera, have a **pre-confirmed** tx hash ready to show on OKLink so the "verifiable on-chain" beat never dies waiting. The hardened deploy already has settled oracle cycles to fall back on.
- Keep a short architecture overlay (categorical FPMM + conditional tokens + optimistic oracle) as a 5-second cutaway if you need to pad to fill the innovation section.
