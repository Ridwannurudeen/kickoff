/**
 * World Cup 2026 team registry — all 48 qualified teams across the 12 groups
 * (A–L). Names match data/worldcup-2026.json exactly so lib/fixtures.ts joins
 * cleanly on team name. `flag` is an ISO 3166-1 alpha-2 code (or a GB-* region
 * code for the home nations), consumed by components/Flag.tsx.
 *
 * Stable numeric ids align with the uint16 ids FanRep.setFavoriteTeams expects.
 */

import type { Team } from "./v2-types";

export const TEAMS: Team[] = [
  // Group A
  { id: 1, name: "Mexico", group: "A", flag: "MX" },
  { id: 2, name: "South Africa", group: "A", flag: "ZA" },
  { id: 3, name: "South Korea", group: "A", flag: "KR" },
  { id: 4, name: "Czech Republic", group: "A", flag: "CZ" },
  // Group B
  { id: 5, name: "Canada", group: "B", flag: "CA" },
  { id: 6, name: "Switzerland", group: "B", flag: "CH" },
  { id: 7, name: "Qatar", group: "B", flag: "QA" },
  { id: 8, name: "Bosnia & Herzegovina", group: "B", flag: "BA" },
  // Group C
  { id: 9, name: "Brazil", group: "C", flag: "BR" },
  { id: 10, name: "Morocco", group: "C", flag: "MA" },
  { id: 11, name: "Scotland", group: "C", flag: "GB-SCT" },
  { id: 12, name: "Haiti", group: "C", flag: "HT" },
  // Group D
  { id: 13, name: "USA", group: "D", flag: "US" },
  { id: 14, name: "Turkey", group: "D", flag: "TR" },
  { id: 15, name: "Australia", group: "D", flag: "AU" },
  { id: 16, name: "Paraguay", group: "D", flag: "PY" },
  // Group E
  { id: 17, name: "Germany", group: "E", flag: "DE" },
  { id: 18, name: "Ecuador", group: "E", flag: "EC" },
  { id: 19, name: "Ivory Coast", group: "E", flag: "CI" },
  { id: 20, name: "Curaçao", group: "E", flag: "CW" },
  // Group F
  { id: 21, name: "Netherlands", group: "F", flag: "NL" },
  { id: 22, name: "Japan", group: "F", flag: "JP" },
  { id: 23, name: "Sweden", group: "F", flag: "SE" },
  { id: 24, name: "Tunisia", group: "F", flag: "TN" },
  // Group G
  { id: 25, name: "Belgium", group: "G", flag: "BE" },
  { id: 26, name: "Egypt", group: "G", flag: "EG" },
  { id: 27, name: "Iran", group: "G", flag: "IR" },
  { id: 28, name: "New Zealand", group: "G", flag: "NZ" },
  // Group H
  { id: 29, name: "Spain", group: "H", flag: "ES" },
  { id: 30, name: "Uruguay", group: "H", flag: "UY" },
  { id: 31, name: "Saudi Arabia", group: "H", flag: "SA" },
  { id: 32, name: "Cape Verde", group: "H", flag: "CV" },
  // Group I
  { id: 33, name: "France", group: "I", flag: "FR" },
  { id: 34, name: "Senegal", group: "I", flag: "SN" },
  { id: 35, name: "Norway", group: "I", flag: "NO" },
  { id: 36, name: "Iraq", group: "I", flag: "IQ" },
  // Group J
  { id: 37, name: "Argentina", group: "J", flag: "AR" },
  { id: 38, name: "Austria", group: "J", flag: "AT" },
  { id: 39, name: "Algeria", group: "J", flag: "DZ" },
  { id: 40, name: "Jordan", group: "J", flag: "JO" },
  // Group K
  { id: 41, name: "Portugal", group: "K", flag: "PT" },
  { id: 42, name: "Colombia", group: "K", flag: "CO" },
  { id: 43, name: "Uzbekistan", group: "K", flag: "UZ" },
  { id: 44, name: "DR Congo", group: "K", flag: "CD" },
  // Group L
  { id: 45, name: "England", group: "L", flag: "GB-ENG" },
  { id: 46, name: "Croatia", group: "L", flag: "HR" },
  { id: 47, name: "Ghana", group: "L", flag: "GH" },
  { id: 48, name: "Panama", group: "L", flag: "PA" },
];

export function teamById(tid: number): Team | undefined {
  return TEAMS.find((t) => t.id === tid);
}

export function teamsByGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group);
}

/** Look up a team by its exact name (matches the fixtures dataset). */
export function teamByName(name: string): Team | undefined {
  return TEAMS.find((t) => t.name === name);
}

/** Group letters A–L, in order. */
export const GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;
