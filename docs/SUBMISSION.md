# X Cup Submission — Kickoff

> **DO NOT SUBMIT WITHOUT EXPLICIT APPROVAL.** This is a fill-in-the-blanks draft for the single X Cup Google Form. Review every field, fill the `TODO`s, then submit yourself.
>
> **Deadline:** extended window, ~two weeks from 2026-05-26. Confirm the exact cutoff on the official OKX X Cup page before submitting.
> **Judging:** dual AI-judge + human-judge. Criteria: **Innovation** (WC differentiation), **Market potential** (capture WC attention → X Layer on-chain users + transactions), **Completion** (delivered, demonstrable, on-chain verifiable), **Demo video** (bonus).
> **Eligible tracks hit:** **Social + NFT + AI Agent** — three of six.

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
Kickoff — a global fan platform that turns World Cup 2026 attention into real X Layer activity through free Quests, a composable Fan Reputation SBT, and a Bring-Your-Own-Agent league anyone can join.
```

**Project Highlights:**
```
• A composable Fan Reputation primitive — not just another app. FanRep is a soulbound ERC-721 (one per wallet) that carries a multi-dimensional on-chain reputation: prediction accuracy, engagement breadth, longevity. Any X Layer app can read it as `score(address)` and build on top. The Fan ID is the primitive; quests, trophies, and the league are first-party consumers of the same primitive.

• A permissionless AI Agent platform, not a single Companion. AgentRegistry lets anyone register an autonomous agent on X Layer (their backend, their LLM, their logic) and charge OKB per call. Kickoff seeds three first-party agents — match-analyst, personal-stats, highlights — but the registry itself is open. The multi-agent Companion is just the first consumer.

• Bring-Your-Own-Agent league — the OnchainOS thesis demonstrated end-to-end. AgentLeague is a free-skill, free-entry prediction tournament for AI agents. Builders deploy an agent, register it, enter it, and compete with Kickoff's own agents for XP, reputation, and the AI Champion trophy. No money wagered, no money paid out — reputation-only. The protocol is the platform.

• Three OKX X Cup tracks hit by design. Social (Fan ID + global/team leaderboards + shareable profiles), NFT (commemorative ERC-1155 Trophies + the composable Fan Rep SBT), and AI Agent (multi-agent Companion + permissionless registry + BYO league).

• Converts the biggest event in sports into X Layer on-chain activity. Every quest completion is a real X Layer transaction. Every Companion call is a real OKB payment to an agent wallet. Every league entry and every prediction commit/reveal is on-chain. The World Cup is a recurring global attention spike; Kickoff is the funnel that turns that attention into real OKX-ecosystem wallets, transactions, and OKB demand.

• OKX-native end to end. OKX Wallet to connect, OKB for gas and for agent service fees, sub-cent costs, OKLink for verifiable proof, OKX on-ramp for fiat. Differentiated from generic prediction markets and from generic Web3 fan tokens — this is a fan platform, with an on-chain reputation, an agent economy, and an open AI-agent league.

• Built clean: five contracts on Solidity 0.8.26, OpenZeppelin v5, Foundry — FanRep (soulbound ERC-721 with multi-dim reputation), QuestEngine (XP + SELF_ATTEST / PREDICTION / EXTERNAL_PROOF), Trophy (ERC-1155, deterministic gating, no randomness, no mint fee), AgentRegistry (permissionless agent layer with composeAgents), AgentLeague (BYO seasons + leaderboard + commit-reveal predictions). The bonded OptimisticOracle from v1 is reused unchanged for prediction-quest settlement. Append-only resolution, role-gated XP writes, reentrancy-guarded, CEI. The deployer's resolver role is revoked so the oracle is the only settlement path.

• Honest scope, honest demo. The real World Cup begins 2026-06-11, after the submission window. The demo settles prediction quests against a clearly-labeled simulated friendly so the full commit → propose → 120s liveness → settle → reveal → XP-credit lifecycle is demonstrable today on X Layer testnet (chain 1952). Mainnet, third-party audit, and the production API-FOOTBALL feed are gated.

• Free-skill, free-entry, no wagers. Quests are free. League entry is free. Trophies are gas-only to claim. Agent calls are fee-for-service in OKB (sub-cent), with a free tier always available. No entry fees against outcomes, no payouts in money, no randomised mints, no interest. The product earns its place through reputation and utility, not through staked money.
```

### (4) Project X (Twitter) Official Handle URL
`TODO — https://x.com/<dedicated Kickoff account>`

### (5) X Post Link (tags @XLayerOfficial + #BuildX)
`TODO — URL of the submission post` (use the Submission Post from `docs/X_CONTENT.md`).
**Verify the post tags @XLayerOfficial AND contains #BuildX before submitting.**

### (6) Team Telegram contacts
`TODO — Telegram handle(s)`

### (7) Team X contacts
`TODO — personal/team X handle(s)`

### (8) Public GitHub repo link
`TODO — https://github.com/<owner>/kickoff` (must be **public**; confirm it loads logged-out)

### (Optional) Note to X Layer team
```
Kickoff v2 is built to do exactly what the OKX X Cup is for: turn World Cup 2026 attention into real on-chain activity on X Layer. It hits three eligible tracks by design — Social (Fan ID + leaderboards), NFT (Trophies + a composable Fan Rep SBT any app can read), and AI Agent (a multi-agent Companion plus a permissionless registry and a Bring-Your-Own-Agent league). Every quest completion is a real X Layer transaction; every Companion call is OKB demand. The bonded optimistic oracle from v1 is reused unchanged to settle prediction quests, with the deployer's resolver role already revoked. Real WC matches begin 2026-06-11, after the submission window, so the demo settles a clearly-labeled simulated friendly — the same oracle path will handle live matches in June–July. Happy to walk the team through the live demo, the on-chain artefacts, and the BYO-agent tutorial path.
```

---

## Pre-submit checklist

**Account & posts**
- [ ] Dedicated Kickoff X account exists and has posted actively across the submission window.
- [ ] Submission post tags **@XLayerOfficial** and includes **#BuildX**.
- [ ] Launch thread is pinned.
- [ ] "Deploy your agent into AgentLeague" post is live with a link to the BYO tutorial path (`agents/v2-example-byo/`).

**Repo**
- [ ] GitHub repo is **public** (open it in a logged-out/incognito window to confirm).
- [ ] `README.md` present at root; `docs/` (KICKOFF-V2-DESIGN, DEMO_SCRIPT_V2, ARCHITECTURE, SECURITY, ROADMAP) present.
- [ ] Plain `git clone` builds — deps vendored, no submodule step. `cd contracts && forge build` succeeds; v2 tests green.
- [ ] No secrets committed (no `.env`, no private keys).

**On-chain (Completion / verifiability)**
- [ ] Five v2 contracts deployed to X Layer testnet (chain 1952): `FanRep`, `QuestEngine`, `Trophy`, `AgentRegistry`, `AgentLeague`. Addresses listed in the README "Deployed addresses" table.
- [ ] `OptimisticOracle` reused from v1 (unchanged); deployer's resolver role revoked, verified on-chain.
- [ ] Real on-chain artefacts viewable on OKLink: at least one `FanRep.mint`, one `SELF_ATTEST` completion, one `PREDICTION` commit + reveal across a full propose → 120s liveness → settle cycle, one `Trophy.claim`, one `AgentRegistry.composeAgents` (with three `Called` + three `submitResult`), one `AgentLeague.enterAgent` from an example user-deployed agent.
- [ ] Any prediction settlement in the demo is clearly labeled "simulated match — for demo only" on screen and in the voiceover.

**Demo video (bonus)**
- [ ] 2–3 min video recorded per `docs/DEMO_SCRIPT_V2.md`, covering: connect → Fan ID mint → SELF_ATTEST quest → PREDICTION commit → OO settle → reveal + XP credit → Trophy claim → Companion multi-agent (composeAgents) → AgentLeague + "Deploy your agent" CTA.
- [ ] Video link ready (and added to the submission post / form note if appropriate).

**Form fields**
- [ ] Fields (1)(4)(5)(6)(7)(8) filled — no remaining `TODO`s.
- [ ] One-Line Description & Highlights (field 3) pasted in full.

**Final**
- [ ] Submitting before the official OKX X Cup cutoff.
- [ ] **User has explicitly approved submission.**

---

> Restated: **do not submit the Google Form, do not post the X submission, do not create accounts without the user's explicit go-ahead.** All content here is a draft.
