# X (Twitter) Content Plan — Kickoff v2

> **Draft only.** Do **not** post any of this without explicit approval. These are ready-to-send drafts for the dedicated Kickoff X account.
>
> **Hard requirements (OKX X Cup):**
> - Run a **dedicated** project X account and post **actively** across the submission window.
> - **Every** post tags **@XLayerOfficial** and uses **#BuildX**.
> - The **submission post** must tag @XLayerOfficial and include #BuildX (this exact link goes in the Google Form).

## Account setup (one-time)

- **Handle:** `@X_KICKOFF` (created; URL `https://x.com/X_KICKOFF`).
- **Display name:** Kickoff
- **Bio:** `World Cup 2026 fan platform on @XLayerOfficial. Free quests, on-chain Fan Reputation, multi-agent AI, Bring-Your-Own-Agent league. #BuildX`
- **Pinned:** the launch thread below (Post #1).
- **Link:** repo URL (TODO) once public.
- **Avatar/header:** Kickoff mark; header can show the four-tile landing (Fan ID · Quests · Trophies · Companion).

## Voice

Technical-but-accessible. Dev-facing where it earns the post. Confident, no hype, no emoji spam (a single emoji is fine, never a wall). Lead with what's real. Always close the loop on the chain (X Layer / OKB) and the tag.

---

## Post 1 — Launch thread (PIN THIS)

**Tweet 1/6**
> Introducing Kickoff v2: a global World Cup 2026 fan platform on @XLayerOfficial.
>
> Free quests. A composable Fan Reputation SBT. Commemorative trophies. A multi-agent AI Companion. And a Bring-Your-Own-Agent league anyone can ship into.
>
> Built for #BuildX. Thread 🧵

**Tweet 2/6**
> Step one: mint a free Fan ID — a soulbound ERC-721, one per wallet.
>
> It carries a multi-dimensional on-chain reputation: prediction accuracy, engagement breadth, longevity. Any app on @XLayerOfficial can read it. The Fan ID is the primitive, not the product.

**Tweet 3/6**
> Step two: complete free Quests during the tournament.
>
> Self-attest ("I watched today's match"), hash-committed score predictions settled by a bonded optimistic oracle, and signed-attestation quests for social actions. Every completion is a real X Layer transaction. Every XP write is on-chain.

**Tweet 4/6**
> Step three: meet the Companion.
>
> One question, one click — and the AgentRegistry fans out to three agents in parallel: match analyst, personal stats, post-match highlights. Each charges a tiny OKB fee for the service. OnchainOS in practice, on @XLayerOfficial.

**Tweet 5/6**
> Step four — the platform jump.
>
> AgentRegistry is permissionless. Anyone can register an autonomous agent on X Layer and enter it into AgentLeague — a free-skill prediction tournament. Top-ranked agent's owner takes the AI Champion trophy. Reputation only, no wagers.

**Tweet 6/6**
> Three OKX X Cup tracks hit by design: Social, NFT, AI Agent.
>
> Five contracts on X Layer testnet. OKX Wallet, OKB gas, OKLink-verifiable. Demo + repo coming this week.
>
> Building in the open for #BuildX with @XLayerOfficial.

---

## Post 2 — Why a Fan Rep SBT (the primitive angle)

> Most fan platforms hand you points in a database.
>
> Kickoff writes them to a soulbound on-chain Fan Reputation — prediction accuracy, engagement breadth, longevity — that any app on @XLayerOfficial can read via `score(address)`.
>
> The Fan ID is the primitive. Quests, trophies, and the league are first-party consumers of it. Yours can be the second.
>
> #BuildX

---

## Post 3 — Build progress (the multi-agent layer)

> Build update: AgentRegistry + composeAgents are wired.
>
> One transaction fans out to N registered agents, each charging OKB per call, each replying through `submitResult`. Caller → agent wallet direct, protocol fee zero in v1.
>
> Permissionless registration. Agents are first-class on-chain entities on @XLayerOfficial.
>
> #BuildX

---

## Post 4 — Build progress (AgentLeague seasons)

> Build update: AgentLeague is live in testnet.
>
> Open a season, agents enter (free), commit hashed predictions before kickoff, reveal after the optimistic oracle settles. Leaderboard ranks by closeness × accuracy × breadth.
>
> Free-skill, free-entry. The OnchainOS thesis on @XLayerOfficial: anyone ships, anyone enters.
>
> #BuildX

---

## Post 5 — Behind the scenes (honest scope)

> Honest scope: real World Cup matches start 2026-06-11.
>
> So the demo settles prediction quests against a clearly-labeled simulated friendly — full commit → propose → 120s liveness window → settle → reveal → XP credit, every step on-chain, every tx on OKLink.
>
> Same oracle path handles live matches in June–July, on @XLayerOfficial. #BuildX

---

## Post 6 — Builders: deploy your own agent into AgentLeague

> Builders: AgentLeague is open. Bring your own agent.
>
> 1. Clone the BYO example: `agents/v2-example-byo/`
> 2. Host it (any backend, any LLM)
> 3. `AgentRegistry.registerAgent` on @XLayerOfficial
> 4. `AgentLeague.enterAgent` into the active season
>
> Free entry. Reputation + a trophy for the top-ranked agent's owner. No wagers, no payouts in money — pure free-skill on-chain.
>
> Tutorial path → [REPO LINK + `/agents/v2-example-byo`]
>
> #BuildX

---

## Post 7 — Submission Post (this link goes in the form)

> Kickoff v2 is live for #BuildX on @XLayerOfficial.
>
> A permissionless AI Agent platform for World Cup 2026 — multi-agent Companion, Bring-Your-Own-Agent league, composable Fan Reputation SBT, free quests. Three OKX X Cup tracks hit: Social + NFT + AI Agent.
>
> OKX Wallet, OKB gas, OKLink-verifiable end to end.
>
> Demo + repo: [LINKS — TODO]

> **Reminder:** the URL of *this* post is Google Form field (5). It MUST tag @XLayerOfficial and include #BuildX. Verify both are present before you submit.

---

## Cadence summary

| Slot | Post | Notes |
|---|---|---|
| Day 1 | #1 Launch thread | Pin it |
| Day 3 | #2 Fan Rep SBT primitive | |
| Day 5 | #3 AgentRegistry + composeAgents | |
| Day 7 | #4 AgentLeague seasons | |
| Day 9 | #5 Honest-scope / simulated demo | |
| Day 11 | #6 BYO-agent tutorial CTA | Link to `agents/v2-example-byo/` |
| Submission day | #7 Submission post | URL goes in the form |

Every post: **@XLayerOfficial + #BuildX**. Reply to and quote @XLayerOfficial threads during the window for reach.
