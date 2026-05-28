# Demo Video Script — Kickoff v2

**Target length:** 2:30 (hard cap 3:00).
**Goal:** prove (a) **innovation** — a composable Fan Reputation SBT + a permissionless Bring-Your-Own-Agent platform on X Layer, (b) **real, in-window on-chain activity** from a free quest lifecycle with OKLink tx links, (c) the **multi-agent Companion wow moment** — one click fans out to multiple agents, each charging a tiny OKB fee, and (d) three eligible tracks hit: **Social + NFT + AI Agent**.
**Tone:** confident, plain English, technical-but-accessible. No hype, no jargon walls.

> **Recording rules**
> - Keep a second tab on OKLink testnet (`https://www.oklink.com/xlayer-test`). Every state-changing action (mint, complete, settle, claim, callAgent) cuts to OKLink to show the **confirmed transaction**.
> - Keep the wallet network indicator (X Layer testnet / chain 1952, gas in OKB) visible at least once.
> - The `PREDICTION` quest in the demo settles against a **clearly-labeled simulated match** (real WC matches start 2026-06-11, after the submission window). The on-screen "SIMULATED MATCH — for demo only" banner must be visible during settlement, and read aloud.
> - Show real clock time or a tx timestamp early so the activity is visibly "in-window."

---

## Shot list & voiceover

### 0:00 – 0:12 — Cold open / the hook

**On screen:** Kickoff v2 landing page. Title: "Kickoff — the World Cup fan platform on X Layer." Below it, four tiles: **Fan ID** · **Quests** · **Trophies** · **Companion (multi-agent AI)**. Footer chip: "Built for #BuildX on @XLayerOfficial."

**Voiceover:**
> "This is Kickoff — a global fan platform for World Cup 2026, live on X Layer. Free quests, a composable on-chain Fan Reputation, commemorative trophies, and a multi-agent AI Companion any builder can plug into."

---

### 0:12 – 0:25 — Connect OKX Wallet

**On screen:** Click **Connect Wallet** → OKX Wallet pops up → approve → wallet pill in the top right shows **X Layer testnet · chain 1952 · OKB gas**.

**Voiceover:**
> "One wallet, one chain. OKX Wallet, X Layer testnet, gas paid in OKB. Every action you'll see is a real transaction on X Layer."

**OKLink artefact:** none yet — establishes network identity for the rest of the demo.

---

### 0:25 – 0:42 — Mint Fan ID (the SBT)

**On screen:** On the landing page, click **Mint Fan ID**. OKX Wallet popup → confirm. UI flips to "Fan ID #N · soulbound · non-transferable" with a multi-dimensional reputation panel: `predictionAccuracyBps · engagementBreadth · longevityDays`. Cut to OKLink: confirmed `FanRep.mint()` tx.

**Voiceover:**
> "First step — mint a free Fan ID. It's an ERC-721, soulbound, one per wallet. It carries a multi-dimensional reputation score that other apps can read on-chain. That's the primitive — a composable Fan Rep SBT."

**OKLink artefact:** `FanRep.mint()` tx — confirmed, with the new tokenId visible in event logs.

---

### 0:42 – 1:00 — Complete a SELF_ATTEST quest

**On screen:** Go to `/quests`. Live quest row: **"Daily fact — read three facts about today's fixture."** Click through three short cards, then click **Complete**. OKX Wallet → confirm. UI shows **+50 XP** credited; the Fan Rep `engagementBreadth` ticks up. Cut to OKLink: confirmed `QuestEngine.complete()` tx with the `QuestCompleted` event in the logs.

**Voiceover:**
> "Quests are free, and every completion is a real X Layer transaction. This is a self-attest quest — read three facts, click complete. Fifty XP, my engagement dimension goes up. The XP is written to the Fan Rep SBT by the quest engine — nothing off-chain, nothing trusted."

**OKLink artefact:** `QuestEngine.complete()` tx with `QuestCompleted` event.

---

### 1:00 – 1:20 — Commit a PREDICTION quest (simulated match)

**On screen:** Same `/quests` page. Quest row: **"Predict the score — Simulated Friendly · for demo only"** with a clear yellow banner: "SIMULATED MATCH · real WC matches begin 2026-06-11." Pick a score (e.g., 2-1), click **Commit**. OKX Wallet → confirm. UI shows a "Committed" pill and the hash of the commit. Cut to OKLink: confirmed `QuestEngine.complete()` tx for the prediction commit.

**Voiceover:**
> "Here's a prediction quest. Real World Cup matches start June 11, after this submission window — so the demo uses a clearly-labeled simulated friendly. I commit a hashed prediction before kickoff. The contract stores the commit; nobody can see what I picked until I reveal."

**OKLink artefact:** prediction-commit tx on `QuestEngine`.

---

### 1:20 – 1:45 — Optimistic Oracle settles, reveal credits XP

**On screen:** Switch to a "Resolution" panel, with the **"SIMULATED MATCH — for demo only"** banner pinned at the top. Trigger the keeper's **propose** step (the simulated result, e.g., "2-1 home win"); show the bond posted and the **120s liveness window** counting down (jump-cut). After the window elapses undisputed, run **settle** → condition flips to **Resolved**. Back on `/quests`, click **Reveal**: the contract checks the reveal against the commit + the OO result, scales XP by closeness, and writes to `FanRep`. Cut to OKLink for the propose, the settle, and the reveal txs.

**Voiceover:**
> "Now the oracle. Anyone can propose the result and post a bond — this is the same bonded optimistic oracle we reused from v1. A two-minute liveness window opens, nobody disputes, anyone settles it on-chain. I reveal my prediction, the contract scales the XP by how close I was, and my prediction-accuracy dimension on the Fan Rep moves up. In June, this same oracle settles real matches from a live football feed — and the deployer's resolver role is already revoked, so the oracle is the only settlement path."

**OKLink artefacts:** `OptimisticOracle.propose`, `OptimisticOracle.settle`, and `QuestEngine.settlePrediction` txs.

---

### 1:45 – 2:00 — Claim a Trophy (NFT track)

**On screen:** Go to `/trophies`. The **"First Whistle"** trophy is now unlocked (Fan ID + first match-day quest). Click **Claim** → OKX Wallet → confirm. ERC-1155 trophy appears in the gallery. Cut to OKLink: `Trophy.claim()` tx with the Transfer event.

**Voiceover:**
> "Trophies are commemorative ERC-1155s. Fixed supply, deterministic gating, no randomness, no fee beyond gas — they're earned, not bought. First Whistle: minted."

**OKLink artefact:** `Trophy.claim()` tx with the Transfer event.

---

### 2:00 – 2:20 — Companion — the multi-agent wow moment

**On screen:** Open `/companion`. Type: **"Brief me on the next match."** Click **Ask**. UI shows three lanes lighting up in parallel: `match-analyst` · `personal-stats` · `highlights`. A single OKX Wallet popup confirms the **`composeAgents`** call. Beside each lane, a tiny "0.0001 OKB" fee chip appears as that agent's service replies. The aggregated briefing renders below. Cut to OKLink: a single `AgentRegistry.composeAgents` tx with three `Called` events, and three later `submitResult` txs from the agent wallets.

**Voiceover:**
> "Now the Companion. One question, one click, one transaction — and the registry fans out to three agents in parallel: match analyst, personal stats, post-match highlights. Each charges a tiny OKB fee for the service — fractions of a cent. This is OnchainOS in practice: agents are first-class on-chain entities you call and pay through a registry."

**OKLink artefact:** `AgentRegistry.composeAgents` tx with three `Called` events; three `submitResult` txs from the agent wallets.

---

### 2:20 – 2:35 — AgentLeague — Bring Your Own Agent

**On screen:** Open `/league`. Standings table with the three first-party agents and one example user-deployed agent. Highlight the **"Deploy your agent"** CTA in the header, click it — modal shows a four-step path: (1) `git clone` the BYO example, (2) host it, (3) `AgentRegistry.registerAgent`, (4) `AgentLeague.enterAgent`. Path shown: **`agents/v2-example-byo/`**.

**Voiceover:**
> "And here's the platform jump. The registry is permissionless. Anyone can deploy their own AI agent to X Layer and enter it into AgentLeague — a free-skill prediction tournament. The protocol is the platform; our Companion is just the seed. Top-ranked agent's owner gets the AI Champion trophy. No money in, no money out — reputation only."

**OKLink artefact:** an existing `AgentLeague.enterAgent` tx from the example user-deployed agent — shown briefly to prove it's live.

---

### 2:35 – 2:50 — Close / the pitch

**On screen:** Back to the landing page. Overlay text: **"Kickoff v2 · X Layer testnet (1952) · #BuildX · @XLayerOfficial"**. Three chips light up: **Social** (Fan ID + leaderboards) · **NFT** (Trophies + composable Fan Rep SBT) · **AI Agent** (multi-agent Companion + BYO league). Repo / handle on screen.

**Voiceover:**
> "Kickoff v2 turns World Cup attention into real X Layer activity: free quests, a composable Fan Rep SBT any app can read, and a Bring-Your-Own-Agent league anyone can ship into. Three tracks, one chain, one wallet. Built for #BuildX on X Layer."

---

## Pre-record checklist

- [ ] Wallet funded with testnet OKB for gas across the full lifecycle (mint, complete×2, claim, composeAgents).
- [ ] At least one `SELF_ATTEST` quest and one `PREDICTION` quest registered against a **clearly-labeled simulated friendly**.
- [ ] Keeper in SIMULATED mode (reads `data/results.json`) so propose runs without an API key.
- [ ] All three first-party agents registered in `AgentRegistry` and their off-chain services running.
- [ ] One example user-deployed agent registered + entered in the active `AgentLeague` season so the standings table isn't empty.
- [ ] The **"SIMULATED MATCH — for demo only"** banner is wired on the prediction quest row and on the resolution panel.
- [ ] OKLink tab pre-loaded to X Layer **testnet** (`https://www.oklink.com/xlayer-test`).
- [ ] Screen recording at 1080p+; OKX Wallet popups legible; cursor visible.
- [ ] Silent dry run end-to-end (mint → self-attest → predict-commit → propose → settle → reveal → claim trophy → composeAgents → league standings) with no failed txs on camera.

## Fallback B-roll

- If a tx is slow to confirm on camera, have a **pre-confirmed** OKLink page ready (mint, complete, settle, composeAgents) so the "verifiable on-chain" beat never dies waiting.
- 5-second architecture cutaway (FanRep + QuestEngine + Trophy + AgentRegistry + AgentLeague + OptimisticOracle) available if you need to pad the innovation section.


---

## Already-confirmed OKLink artefacts (recorded 2026-05-26 to 2026-05-28)

These are real on-chain transactions from the build sessions, all on X Layer testnet (chain 1952). Use them as **fallback B-roll** if anything is slow to confirm during the live recording — every tx below is browsable on OKLink right now.

**BYO example agent — the AgentLeague lifecycle, end-to-end:**

| Step | Tx hash | What it proves |
|---|---|---|
| `AgentLeague.openSeason` (admin) | `0x5c0db17e1ece60d6751b0caf36ca3f3400e1ed9221d7369ce0dd6570aab51ab2` | season 1 active |
| `AgentRegistry.registerAgent` from sim wallet | `0xeef325862b93255f6e1236e1c90e2773a9d5e5ecda04b68d3fbef5ca9219c1be` | BYO agent listed |
| `AgentLeague.enterAgent` | `0x37c9620ceea6e8d312063cf49fdeb9a6802f2f3eedfee989f1be25afad566c3e` | enterIndex = 1 |
| `AgentLeague.submitPrediction` (commit, before kickoff) | `0x1832db0349509010c9d48e11385d1904728c39ab8c98ca9361398692ef3606ec` | hash-committed slot 0 |
| `OptimisticOracle.propose` (keeper) | `0x4f91d7a477f0f0e0c0cf09a9e4c339a2dbc97183b49713f02500d7df14acdb3c` | result [1,0,0] proposed |
| `OptimisticOracle.settle` (after 120s liveness) | `0x95d55a32c1d1842ffc3e35eb267bfb562ff65f79fcb9ac17d7a048010f94507e` | condition flips to Resolved |
| `AgentLeague.scorePrediction` (reveal) | `0xa9b688d1724cc80cae9a30ad3b2a30e65a0c0ba5001217d955674ce35e946f24` | 1000 XP credited, score increments |

**Companion services — three on-chain agents, each registered separately, each responding with real Claude Haiku 4.5 text via `submitResult`:**

| Service | Register tx | callAgent tx | submitResult tx (reply on chain) |
|---|---|---|---|
| `match-analyst` | `0x00a04be3465038a83387322c44e3463c8817c3eaca5412d2c75395e14c862e10` | `0xb6a4fd88f29e00056e30b58357508242835b5c45efeed27299a51babb4a03e28` | `0xd97e0d3fb725ad533f7e77a7373c95f04cb935949e6437f2f47b71f8119b6038` |
| `personal-stats` | `0x1f0f03bd8ba1114ec257260a14ce931135723b53ebb422bfd7bfeda5b7195f72` | `0x4b18bc09ec92f93b4c2d0abc02344bfbaad3e2d4a2b57a1abdb8e28380cdd640` | `0x5a6bee5c32daf4f68695ba8b002004e1b79863c707869ae1123ae1d89505c51d` |
| `highlights` | `0x550b753088d8e3c6a70f99e77aa28af9779fec854be9a42db83f8332d7e74d27` | `0x235a50145e1f6250cb7d27e2e14c2c5240a53744b49872731ade8d038ea0667a` | `0x3e8dd75cf73d6ac182774996c90add0a2dd6606a1fbd01900de289353a9d9c94` |

The `submitResult` tx bytes decode to real Claude Haiku 4.5 output (~400-900 bytes per reply). Examples from the recording day:

- `match-analyst` returned a 928-byte Group C/E pre-match preview ("Brazil vs Germany - Pre-Match Preview...")
- `personal-stats` returned a 544-byte XP-stats block + Claude coaching note
- `highlights` returned a 416-byte 3-1 narration using only the supplied minute marks — no invented events

**Direct OKLink links** (paste into the URL bar during the recording if a live tx is slow):

```
https://www.oklink.com/xlayer-test/tx/<tx-hash-from-the-tables-above>
```

The contracts themselves are linked from `README.md`'s **Deployed addresses** table — use those links to show the contract's transaction history if you'd rather pan than cut.
