// Fetches the openfootball World Cup 2026 schedule (CC0, no API key) and saves it
// to data/worldcup-2026.json, then prints the groups. Tries a few likely paths and
// reports which one worked. Never invents data — if all paths fail it exits non-zero.
//   node fetch-worldcup.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');

// Most-likely first. openfootball/worldcup.json layout has shifted across editions,
// so we probe a small ordered list rather than assume one path.
const CANDIDATE_URLS = [
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json',
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026--north-america/worldcup.json',
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/all.json',
];

async function tryFetch(url) {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return { ok: false, status: res.status };
    const json = await res.json();
    if (!json || !Array.isArray(json.matches)) {
      return { ok: false, status: 'parsed but no matches[] array' };
    }
    return { ok: true, json };
  } catch (err) {
    return { ok: false, status: err.message };
  }
}

function summarizeGroups(matches) {
  const groups = new Map();
  for (const m of matches) {
    const g = m.group;
    if (!g || !/^Group /i.test(g)) continue; // skip knockout rounds
    if (!groups.has(g)) groups.set(g, new Set());
    if (m.team1) groups.get(g).add(m.team1);
    if (m.team2) groups.get(g).add(m.team2);
  }
  return groups;
}

async function main() {
  let result = null;
  let usedUrl = null;
  for (const url of CANDIDATE_URLS) {
    process.stdout.write(`Trying ${url} ... `);
    const r = await tryFetch(url);
    if (r.ok) {
      console.log('OK');
      result = r.json;
      usedUrl = url;
      break;
    }
    console.log(`failed (${r.status})`);
  }

  if (!result) {
    console.error('\nAll candidate URLs failed. Not writing any file (no invented data).');
    console.error('Check https://github.com/openfootball/worldcup.json for the current 2026 path.');
    process.exitCode = 1;
    return;
  }

  mkdirSync(dataDir, { recursive: true });
  const dest = resolve(dataDir, 'worldcup-2026.json');
  writeFileSync(dest, JSON.stringify(result, null, 2) + '\n');
  console.log(`\nSaved ${result.matches.length} matches to ${dest}`);
  console.log(`Source: ${usedUrl}\n`);

  const groups = summarizeGroups(result.matches);
  if (groups.size === 0) {
    console.log('No "Group X" rounds found in the feed (schedule may be knockout-only so far).');
    return;
  }
  console.log(`Groups (${groups.size}):`);
  for (const [g, teams] of [...groups.entries()].sort()) {
    console.log(`  ${g}: ${[...teams].sort().join(', ')}`);
  }
}

main();
