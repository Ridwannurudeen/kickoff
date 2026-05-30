# Keeper — making match quests claimable on-chain

The web shows match-day PREDICTION + check-in quests as **Upcoming** (generated from the
real fixtures in `web/lib/v2-match-quests.ts`, with ids byte-identical to what the keeper
registers). They become **claimable** only once the keeper has registered them on-chain
and their window is open. The keeper (`scripts/keeper-v2.mjs`) is **not yet running** — it
needs a signing key, so it is operator-gated. The web UI is already built and will light up
automatically once registration happens.

## What the keeper does

Per match (`scripts/keeper-v2.mjs`, verified):
1. **PREPARE** `ConditionalTokens.prepareCondition(USDC, questionId, 3)` (1X2).
2. **REGISTER** `QuestEngine.registerQuest` twice — PREDICTION (commit window
   `[kickoff-24h, kickoff]`, 1000 XP) + SELF_ATTEST check-in (`[kickoff, +3h]`, 200 XP).
3. **PROPOSE** after full-time: `OptimisticOracle.propose(conditionId, oneHot(winner))`.
4. **SETTLE** after 120s liveness: `OptimisticOracle.settle` → users then call
   `settlePrediction` (the web "Reveal & claim" button does this).

All steps are **idempotent** (skips already-prepared/registered/proposed). Flags:
`--register-only`, `--propose-only`, `--settle-only`, `--simulate` (synthetic scores from
`data/keeper-v2-fixtures.json` for a full demo cycle pre-tournament), `--dry-run`,
`--upcoming-days=N`.

## Requirements (what YOU must provide)

The signing key (`ORACLE_PK`) must:
- hold **`QUEST_REGISTRAR_ROLE`** on `QuestEngine` (to `registerQuest`),
- hold **USDC** (the OO bond for `propose`) and **OKB** (gas).
- `OptimisticOracle` must already hold `ORACLE_ROLE` on `ConditionalTokens` (set at deploy).

Env (`/etc/kickoff/keeper.env`): `RPC_URL`, `CHAIN_ID`, `USDC`, `CONDITIONAL_TOKENS`,
`OPTIMISTIC_ORACLE`, `QUEST_ENGINE` (all sourceable from `web/.env.local`), and `ORACLE_PK`
(**you add this — never commit it**).

## Deploy + enable (operator runbook)

1. Ship + install the keeper (does NOT run it):
   `/deploy-kickoff --keeper` — copies `scripts/` → `/opt/kickoff/scripts` and `data/` →
   `/opt/kickoff/data`, `npm ci`, writes `/etc/kickoff/keeper.env` (addresses filled,
   `ORACLE_PK=` blank), installs `kickoff-keeper.service` (oneshot) + `kickoff-keeper.timer`
   (hourly), left **disabled**.
2. On the VPS, put your funded/role-granted key in `/etc/kickoff/keeper.env` (`ORACLE_PK=0x…`).
3. Sanity check (no broadcast): `sudo -u kickoff env $(cat /etc/kickoff/keeper.env|xargs) node /opt/kickoff/scripts/keeper-v2.mjs --dry-run`.
4. Register upcoming real quests: drop `--dry-run` with `--register-only`, or enable the timer:
   `systemctl enable --now kickoff-keeper.timer`.
5. **Demo artefact (optional):** a one-off full cycle on a simulated fixture —
   `… keeper-v2.mjs --simulate` (register → propose → wait 120s → `--settle-only`), then a
   fan commits + reveals from the UI. Produces the on-chain PREDICTION commit/reveal the
   submission checklist wants. NOTE: `data/keeper-v2-fixtures.json` is **not** tracked in
   git (so `--keeper` doesn't ship it) — create it on the box first (a `{matches:[{date,
   time,team1,team2,group,simScore:[h,a]}]}` file with a near-past kickoff), or the keeper
   falls back to it only when present.

## Rollback / pause
`systemctl disable --now kickoff-keeper.timer`. Registered quests stay on-chain (harmless);
the web simply shows them per their windows.
