# kickoff-indexer

Builds the **global fan leaderboard** that `FanRep` can't serve itself (soulbound
ERC-721, no enumeration). Scans `FanMinted` logs in ≤100-block windows (the X Layer
testnet RPC's `eth_getLogs` cap) from the deploy block, reads each holder's on-chain
`score()`, and serves a ranked snapshot over loopback HTTP for the web app.

See [`../../docs/INDEXER-SCOPE.md`](../../docs/INDEXER-SCOPE.md) for the full design.

## Run

```bash
cp env-example .env     # fill FAN_REP (+ RPC_URL/DEPLOY_BLOCK if not default)
npm install
npm run start           # node --experimental-strip-types src/main.ts
```

First run backfills (~10 min for ~290k blocks) and checkpoints to `data/holders.json`;
restarts resume instantly. Snapshot is rebuilt every `SNAPSHOT_INTERVAL_MS`.

## Endpoints (loopback, port `PORT`, default 3066)

- `GET /leaderboard` → `{ generatedAt, holderCount, rows: [{ address, total, predictionAccuracyBps, engagementBreadth, longevityDays }] }`
- `GET /health` → `{ ok, holders, lastScannedBlock, generatedAt }`

The web app reads `/leaderboard` server-side via `web/app/api/leaderboard/route.ts`
(`INDEXER_URL`), so the service stays internal to the box.

## Deploy (VPS)

Runs as systemd `kickoff-indexer.service` (User=kickoff, HOME=/tmp,
EnvironmentFile=/etc/kickoff/indexer.env), alongside the other `kickoff-*` services.
