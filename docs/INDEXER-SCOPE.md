# Global Leaderboard Indexer — Scope

## Why

`FanRep` is a soulbound ERC-721 with **no enumeration** (`totalSupply`/`tokenByIndex`
are absent). The web app can read any single wallet's `score(addr)` but cannot list
all holders, so `/leaderboard` shows the connected wallet's own standing plus an honest
"global ranking needs an indexer" note. This service is that indexer.

## Verified constraints (probed against the live RPC, not assumed)

- `eth_getLogs` on `https://testrpc.xlayer.tech/terigon` caps the block range at
  **100 blocks per call**.
- The node is **archive** (historical `eth_getCode` works), so the FanRep deploy block
  is discoverable by binary search: **≈ 31,343,831**.
- As of scoping, **~291,660 blocks since deploy** → a full `FanMinted` backfill is
  **~2,917 `getLogs` calls** (one-time, resumable), then tail.
- `score(address) → (total, predictionAccuracyBps, engagementBreadth, longevityDays)`
  is a normal `view` call (no range limit, batchable) and is the **on-chain source of
  truth**. The indexer reuses it rather than re-deriving from `XPRecorded`.

## Architecture

A standalone TS Node service `services/indexer` (viem + dotenv,
`node --experimental-strip-types src/main.ts`) matching the existing
`services/match-analyst|personal-stats|highlights` pattern, run on the VPS as systemd
`kickoff-indexer.service`.

Responsibilities:
1. **Backfill** — from `DEPLOY_BLOCK` → head, `getLogs(FanMinted)` in ≤100-block
   windows; collect holder addresses. Checkpoint `{ lastScannedBlock, holders[] }` to
   `data/holders.json` so it is resumable and survives restarts.
2. **Tail** — every `TAIL_INTERVAL` (~30s), scan `(lastScannedBlock → head - CONFIRMATIONS]`
   in ≤100-block windows for new `FanMinted`; advance the checkpoint. A small
   `CONFIRMATIONS` lag (≈5) plus a re-scan overlap avoids reorg gaps.
3. **Snapshot** — every `SNAPSHOT_INTERVAL` (~60s), batched-parallel `score(addr)` reads
   for all holders; build a ranked `rows[]` sorted by `total` desc; cache in memory and
   write `data/leaderboard.json`.
4. **Serve** — `node:http` on `127.0.0.1:PORT`, `GET /leaderboard` →
   `{ generatedAt, holderCount, rows: [{ address, total, predictionAccuracyBps,
   engagementBreadth, longevityDays }] }`. `GET /health` → status + checkpoint.

Storage: flat JSON files (`data/holders.json`, `data/leaderboard.json`). SQLite is
unnecessary for a holder set + snapshot; revisit only if the holder count grows large.

## Web integration (no nginx/CORS change)

- `web/app/api/leaderboard/route.ts` — server-side `fetch(INDEXER_URL + "/leaderboard")`
  with a short `s-maxage` cache; the indexer stays internal to the box.
- `web/app/leaderboard/page.tsx` — render the real global table + reuse `Podium` for the
  top 3 via React Query, **keeping the existing "your standing" + honest empty/fallback**
  when the indexer is unreachable. Reuses the retained `leaderboard_col_rank/col_fan` keys.

## Config (env)

`RPC_URL`, `CHAIN_ID`, `FAN_REP` (address), `DEPLOY_BLOCK` (default 31343831),
`PORT`, `BACKFILL_WINDOW` (≤100), `BACKFILL_THROTTLE_MS`, `TAIL_INTERVAL_MS`,
`SNAPSHOT_INTERVAL_MS`, `CONFIRMATIONS`. Web side: `INDEXER_URL`.

## Risks / mitigations

- **getLogs rate** — throttle backfill (e.g. 50ms between calls) and checkpoint every
  window so a crash resumes, not restarts.
- **Reorgs** — index up to `head - CONFIRMATIONS` and re-scan a small overlap each tail.
- **RPC flakiness** — per-call retry with backoff; tail/snapshot are idempotent.
- **Cold start** — first backfill ~10 min; persisted afterward, so restarts are instant.

## Out of scope (later)

- Per-team leaderboards (also index `FavoriteTeamsSet`).
- Historical XP charts / time series.

## Build order

1. Service skeleton + backfill → `holders.json` (sanity-check holder count vs testnet).
2. Snapshot via batched `score()` + `/leaderboard` HTTP endpoint.
3. Tail loop + checkpoint.
4. Web `/api/leaderboard` route + page table + fallback.
5. `kickoff-indexer.service` systemd unit + deploy (extend `deploy-kickoff`).
