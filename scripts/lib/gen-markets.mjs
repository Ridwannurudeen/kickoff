// Regenerates data/markets.json from data/worldcup-2026.json (openfootball, CC0).
// FULL World Cup 2026 coverage for the v2 CATEGORICAL contracts:
//   - per match:  1X2 (3 outcomes), Over/Under 2.5 (2), BTTS (2)
//   - per group:  group-winner (one outcome per team)
//   - outright (binary, top teams) + golden-boot (binary, top players)
//
// questionId = keccak256(utf8(seed)) — deterministic & idempotent across runs.
// Each market carries outcomeSlotCount + outcomeLabels + category + title +
// metadataURI + openingDistribution (target opening line; uniform unless specified).
//
//   node lib/gen-markets.mjs
//
// CONFIG via env:
//   MATCH_LIMIT   how many matches to emit match markets for (default 8; 0 = all 104)
//   MATCH_MARKETS which per-match markets to emit, comma-sep of 1x2,ou25,btts (default all)
import { keccak256, toHex } from 'viem';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const mk = (s) => keccak256(toHex(s));
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', '..', 'data');

// --- CONFIG ---
const MATCH_LIMIT = (() => {
  const raw = process.env.MATCH_LIMIT;
  if (raw === undefined || raw === '') return 8; // affordable default for seeding
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 8;
  return Math.floor(n); // 0 = no cap (all matches)
})();
const MATCH_MARKETS = (process.env.MATCH_MARKETS || '1x2,ou25,btts')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Outright (binary, top teams) + Golden Boot (binary, top players). [subject, opening YES prob].
const outrights = [
  ['Spain', 0.21], ['France', 0.2], ['England', 0.15],
  ['Brazil', 0.12], ['Argentina', 0.11], ['Field', 0.21],
];
const goldenBoot = [
  ['Mbappe', 0.16], ['Kane', 0.14], ['Haaland', 0.08],
  ['Messi', 0.09], ['Yamal', 0.06], ['Field', 0.47],
];

const slug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const uniform = (n) => Array.from({ length: n }, () => 1 / n);

function loadWorldCup() {
  const raw = JSON.parse(readFileSync(resolve(dataDir, 'worldcup-2026.json'), 'utf8'));
  if (!raw || !Array.isArray(raw.matches)) {
    throw new Error('worldcup-2026.json missing a `matches` array — run fetch:worldcup first.');
  }
  return raw;
}

function buildMatchMarkets(matches, skipped) {
  const out = [];
  let emitted = 0;
  for (let i = 0; i < matches.length; i++) {
    if (MATCH_LIMIT > 0 && emitted >= MATCH_LIMIT) break;
    const m = matches[i] || {};
    const team1 = m.team1;
    const team2 = m.team2;
    if (!team1 || !team2) {
      skipped.push(`match #${i + 1}: missing team1/team2`);
      continue;
    }
    const fixture = `${team1} vs ${team2}`;
    // Stable key per fixture: round + teams (the openfootball file has no match id for group games).
    const key = `${m.round || 'Match'}:${team1}:${team2}`;

    if (MATCH_MARKETS.includes('1x2')) {
      const seed = `Kickoff:WC2026:1X2:${key}`;
      out.push({
        seed,
        questionId: mk(seed),
        category: '1x2',
        outcomeSlotCount: 3,
        outcomeLabels: [team1, 'Draw', team2],
        title: `${fixture} — match result`,
        fixture,
        round: m.round || null,
        group: m.group || null,
        openingDistribution: uniform(3),
        metadataURI: `kickoff://market/1x2/${slug(key)}`,
      });
    }
    if (MATCH_MARKETS.includes('ou25')) {
      const seed = `Kickoff:WC2026:OU25:${key}`;
      out.push({
        seed,
        questionId: mk(seed),
        category: 'over-under-2.5',
        outcomeSlotCount: 2,
        outcomeLabels: ['Over', 'Under'],
        title: `${fixture} — total goals Over/Under 2.5`,
        fixture,
        round: m.round || null,
        group: m.group || null,
        openingDistribution: uniform(2),
        metadataURI: `kickoff://market/ou25/${slug(key)}`,
      });
    }
    if (MATCH_MARKETS.includes('btts')) {
      const seed = `Kickoff:WC2026:BTTS:${key}`;
      out.push({
        seed,
        questionId: mk(seed),
        category: 'btts',
        outcomeSlotCount: 2,
        outcomeLabels: ['Yes', 'No'],
        title: `${fixture} — both teams to score`,
        fixture,
        round: m.round || null,
        group: m.group || null,
        openingDistribution: uniform(2),
        metadataURI: `kickoff://market/btts/${slug(key)}`,
      });
    }
    emitted++;
  }
  return out;
}

function buildGroupMarkets(matches, skipped) {
  // Reconstruct each group's team set from the group-stage fixtures, preserving
  // first-seen order (index = outcome index, per the OUTCOME CONVENTIONS).
  const groups = new Map();
  for (const m of matches) {
    if (!m || !m.group) continue;
    if (!groups.has(m.group)) groups.set(m.group, []);
    const teams = groups.get(m.group);
    for (const t of [m.team1, m.team2]) {
      if (t && !teams.includes(t)) teams.push(t);
    }
  }
  const out = [];
  for (const groupName of [...groups.keys()].sort()) {
    const teams = groups.get(groupName);
    if (teams.length < 2) {
      skipped.push(`${groupName}: only ${teams.length} team(s) — need >= 2`);
      continue;
    }
    const seed = `Kickoff:WC2026:GroupWinner:${groupName}`;
    out.push({
      seed,
      questionId: mk(seed),
      category: 'group-winner',
      outcomeSlotCount: teams.length,
      outcomeLabels: teams.slice(),
      title: `${groupName} — group winner`,
      group: groupName,
      openingDistribution: uniform(teams.length),
      metadataURI: `kickoff://market/group-winner/${slug(groupName)}`,
    });
  }
  return out;
}

function buildBinary(list, category, titleFn, fieldTitleFn) {
  return list.map(([subject, prob]) => {
    const seed = `Kickoff:WC2026:${category === 'outright' ? 'Outright' : 'GoldenBoot'}:${subject}`;
    return {
      seed,
      questionId: mk(seed),
      category,
      outcomeSlotCount: 2,
      outcomeLabels: ['Yes', 'No'],
      title: subject === 'Field' ? fieldTitleFn() : titleFn(subject),
      subject,
      // [0 Yes, 1 No] — opening YES prob from the bookmaker line.
      openingDistribution: [prob, 1 - prob],
      metadataURI: `kickoff://market/${category}/${slug(subject)}`,
    };
  });
}

function main() {
  const wc = loadWorldCup();
  const matches = wc.matches;
  const skipped = [];

  const matchMarkets = buildMatchMarkets(matches, skipped);
  const groupMarkets = buildGroupMarkets(matches, skipped);
  const outrightMarkets = buildBinary(
    outrights,
    'outright',
    (s) => `Will ${s} win the 2026 World Cup?`,
    () => 'Will another team (the Field) win the 2026 World Cup?',
  );
  const goldenBootMarkets = buildBinary(
    goldenBoot,
    'golden-boot',
    (s) => `Will ${s} win the 2026 World Cup Golden Boot?`,
    () => 'Will another player (the Field) win the 2026 World Cup Golden Boot?',
  );

  const markets = [...matchMarkets, ...groupMarkets, ...outrightMarkets, ...goldenBootMarkets];

  const counts = markets.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  const out = {
    description:
      'Kickoff seed market definitions for the FIFA World Cup 2026 (v2 categorical contracts). ' +
      'questionId = keccak256(utf8(seed)). openingDistribution is the target opening line per outcome ' +
      '(approx implied probability; not strictly normalized for binary book lines). ' +
      'Outcome conventions: 1X2 [Home,Draw,Away]; OU2.5 [Over,Under]; BTTS [Yes,No]; ' +
      'group-winner one outcome per team; outright/golden-boot binary [Yes,No].',
    collateralDecimals: 6,
    generatedFrom: 'scripts/lib/gen-markets.mjs (deterministic, from data/worldcup-2026.json)',
    config: { matchLimit: MATCH_LIMIT, matchMarkets: MATCH_MARKETS, totalMatchesAvailable: matches.length },
    counts,
    markets,
  };

  const dest = resolve(dataDir, 'markets.json');
  writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${markets.length} markets to ${dest}`);
  console.log('  by category:', JSON.stringify(counts));
  console.log(`  match limit: ${MATCH_LIMIT === 0 ? 'all' : MATCH_LIMIT} of ${matches.length} matches; per-match markets: ${MATCH_MARKETS.join(', ')}`);
  if (skipped.length) {
    console.log(`  skipped ${skipped.length} market(s) (missing/short data):`);
    for (const s of skipped) console.log(`    - ${s}`);
  }
}

main();
