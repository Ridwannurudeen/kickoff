# X (Twitter) Content Plan — Kickoff

> **Draft only.** Do **not** post any of this without explicit approval. These are ready-to-send drafts for the dedicated Kickoff X account.
>
> **Hard requirements (X Cup hackathon):**
> - Run a **dedicated** project X account and post **actively** May 19–28.
> - **Every** post tags **@XLayerOfficial** and uses **#BuildX**.
> - The **submission post** must tag @XLayerOfficial with #BuildX (this exact link goes in the Google Form).

## Account setup (one-time)

- **Handle:** `@KickoffMarkets` (or `@TradeKickoff` if taken) — TODO confirm availability.
- **Display name:** Kickoff
- **Bio:** `Trade the beautiful game — live, on-chain. Live World Cup 2026 markets on @XLayerOfficial. #BuildX`
- **Pinned:** the launch thread below (post #1).
- **Link:** repo URL (TODO) once public.
- **Avatar/header:** Kickoff mark; header can show the markets grid screenshot.

## Voice

Technical-but-accessible. Confident, no hype, no emoji spam (a single emoji is fine, never a wall). Lead with what's real. Always close the loop on the chain (X Layer / OKB) and the tag.

---

## Post 1 — Launch thread (PIN THIS) — ~May 22

**Tweet 1/5**
> Introducing Kickoff: trade the World Cup, live and on-chain.
>
> Live, continuously-tradeable World Cup 2026 markets on @XLayerOfficial. Spain to win it. Mbappé for the Golden Boot. Prices move the second anyone trades.
>
> Built for #BuildX. Thread 🧵

**Tweet 2/5**
> How it works: each market is a live AMM, and every outcome's price is its implied probability — the set always sums to 100%.
>
> Markets aren't just yes/no: match results are 3-way (Home/Draw/Away), groups are N-way (one outcome per team). No order book, no counterparty wait — enter or exit any time.

**Tweet 3/5**
> Why X Layer: OKX Wallet to connect, OKB for gas, sub-cent fees, OKLink for verifiable proof.
>
> Every trade is a real transaction on @XLayerOfficial — built for the OKX ecosystem from wallet to gas. #BuildX

**Tweet 4/5**
> The stack: a Fixed-Product Market Maker (Gnosis/Polymarket lineage), USDC collateral, ERC-1155 conditional tokens, one minimal-proxy AMM per market. Solidity 0.8.26 + OpenZeppelin v5.6.1 + Foundry.

**Tweet 5/5**
> Trading is live on-chain now; markets settle on the real result in June–July. World-Cup-native, live AMM, OKX-first.
>
> Trade the beautiful game — live, on-chain. Building in the open for #BuildX with @XLayerOfficial. More this week.

---

## Post 2 — The differentiator — ~May 23

> Most prediction markets are an order book on another chain.
>
> Kickoff is a live AMM, built for the World Cup, on @XLayerOfficial. Each market is its own pool — the price is the implied probability and it moves with every trade.
>
> World-Cup-native. OKX-native. #BuildX

---

## Post 3 — Build progress (contracts) — ~May 24

> Build update: conditional tokens + factory + per-market AMM coming together.
>
> One transaction creates a market: prepare the condition, clone a FixedProductMarketMaker (EIP-1167 minimal proxy), seed liquidity. Solidity 0.8.26, OpenZeppelin v5.6.1, Foundry, `forge test` green.
>
> #BuildX @XLayerOfficial

---

## Post 4 — Real-trade demo (GIF/clip) — ~May 25

> Live on @XLayerOfficial: buying "Spain to win" with USDC.
>
> Confirm in OKX Wallet, gas in OKB, price ticks up the moment the trade lands — and here's the confirmed tx on OKLink. Real on-chain trading, right now. [attach GIF + OKLink link]
>
> #BuildX

---

## Post 5 — Markets / seed lineup — ~May 26

> Opening lineup on Kickoff:
>
> Outright winner — Spain, France, England, Brazil, Argentina + Field
> Golden Boot — Mbappé, Kane, Haaland, Messi, Yamal + Field
>
> Each is its own live market on @XLayerOfficial. Trade your call. #BuildX

---

## Post 6 — Settlement / how it resolves — ~May 27

> How Kickoff settles: a bonded optimistic oracle, not a single key. Anyone proposes a result and posts a bond; anyone can dispute during the liveness window; undisputed results settle on-chain — winning shares redeem 1:1 for USDC.
>
> The deployer's resolver role is revoked, so the oracle is the only settlement path. Live results from a football feed in June–July; the demo shows a clearly-labeled simulated settlement so the full trade→propose→settle→redeem path works today.
>
> #BuildX @XLayerOfficial

---

## Post 7 — Leaderboard / engagement tease — ~May 27

> Coming to Kickoff: a live leaderboard of the sharpest World Cup traders on @XLayerOfficial.
>
> Every position is on-chain, so the board is verifiable, not vibes. Who's calling the bracket right? #BuildX

---

## Post 8 — SUBMISSION POST (this link goes in the form) — ~May 28

> Kickoff is live for #BuildX on @XLayerOfficial 🏆
>
> Live, on-chain World Cup 2026 markets — trade outcomes against a live AMM, settle on the real result, all on X Layer. World-Cup-native, OKX from wallet to gas.
>
> Demo + repo: [LINKS — TODO]
>
> Trade the beautiful game — live, on-chain.

> **Reminder:** the URL of *this* post is Google Form field (5). It MUST tag @XLayerOfficial and include #BuildX. Verify both are present before you submit.

---

## Cadence summary

| Date | Post | Notes |
|---|---|---|
| May 22 | #1 Launch thread | Pin it |
| May 23 | #2 Differentiator | |
| May 24 | #3 Build progress | |
| May 25 | #4 Real-trade demo | Attach GIF + OKLink link |
| May 26 | #5 Seed markets | |
| May 27 | #6 Settlement + #7 Leaderboard | |
| May 28 | #8 Submission post | Link goes in the form |

Every post: **@XLayerOfficial + #BuildX**. Reply to and quote @XLayerOfficial threads during the window for reach.
