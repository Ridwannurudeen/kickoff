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
5. Register upcoming real quests now: `systemctl enable --now kickoff-keeper.timer` (done
   2026-05-30 — registered the first matches). The PREDICTION commit/reveal UI then goes
   live for each match once its commit window opens (24h before kickoff).

## Simulate demo cycle (produce the on-chain commit→reveal artefact today)

The web `/quests` UI only renders quests for the real bundled fixtures, so a *fabricated*
demo match can't be committed from the UI — the cycle is **scripted** (the keeper does
register/propose/settle; `scripts/demo-fan.mjs` does the fan commit/reveal using `ORACLE_PK`
as a demo fan). Runs from an **isolated workspace** at `/opt/kickoff/demo` so the live
keeper/timer is untouched. **OO bond = 0**, so no USDC is needed; OO liveness = 120s.

Setup (already staged on the VPS): `/opt/kickoff/demo/scripts` (keeper + `demo-fan.mjs`),
`/opt/kickoff/demo/data` (isolated schedule), `/opt/kickoff/demo/gen-fixture.sh`.

**IMPORTANT (keeper-v2.mjs:469):** `--simulate` reads the schedule from
`data/keeper-v2-fixtures.json`; a plain run reads `worldcup-2026.json`. They must be the
SAME file across register/propose/settle or the quest you register won't match the one you
propose. So: put the demo match in **`keeper-v2-fixtures.json`** and run **every** keeper
step with `--simulate`.

Run, on the VPS (helper sources the env + adds FAN_REP; key never printed):
```sh
run(){ sudo -u kickoff bash -c "set -a; . /etc/kickoff/keeper.env; export FAN_REP=0x133aD36f956A3550aee35D9126dE728FaF9d96C6; set +a; cd /opt/kickoff/demo/scripts && node $*"; }
# fixture (kickoff = now+3m, sim 3-1 Home) into keeper-v2-fixtures.json:
D=$(date -u -d "+3 minutes" +%Y-%m-%d); T=$(date -u -d "+3 minutes" +%H:%M)
printf '{"name":"sim","matches":[{"round":"Demo","date":"%s","time":"%s UTC+0","team1":"Demo United","team2":"Sim City FC","group":"Demo","simScore":[3,1]}]}' "$D" "$T" \
  | sudo -u kickoff tee /opt/kickoff/demo/data/keeper-v2-fixtures.json >/dev/null
QID=$(run -e "const{keccak256,toBytes}=require('viem');console.log(keccak256(toBytes('kickoff.v2.quest.prediction|'+process.argv[1]+'|Demo United|Sim City FC')))" "$D")
run keeper-v2.mjs --simulate --register-only --upcoming-days=1   # register (reads keeper-v2-fixtures.json)
run demo-fan.mjs commit "$QID" 0                                 # fan commits Home (slot 0); mints Fan ID if needed
#   …wait until kickoff passes (~3 min)…
run keeper-v2.mjs --simulate --propose-only --upcoming-days=1    # propose sim 3-1 → Home
#   …wait 125s (OO liveness 120s)…
run keeper-v2.mjs --simulate --settle-only --upcoming-days=1     # OO settles → condition resolved
run demo-fan.mjs reveal "$QID"                                   # settlePrediction → +1000 XP; prints score
```
Verified working 2026-05-30: fan `0x6988…` reached **1000 XP, #1** on the live board
(commit `0x05a245…` → propose `0x66eed8…` → settle `0x65268c…` → reveal `0x9042cd…`).
The demo fan wallet (the `ORACLE_PK` address) then appears on the global leaderboard with XP,
and the commit/propose/settle/reveal txs are on OKLink — the submission artefact. The match
is labeled "Demo United vs Sim City FC / group Demo" — say **"simulated match — demo only"**
on screen/in voiceover (submission requirement). Re-run `gen-fixture.sh` right before
recording so the kickoff is fresh. Cleanup: `rm -rf /opt/kickoff/demo` when done.

## Rollback / pause
`systemctl disable --now kickoff-keeper.timer`. Registered quests stay on-chain (harmless);
the web simply shows them per their windows.
