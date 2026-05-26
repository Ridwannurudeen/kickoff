/**
 * World Cup 2026 team registry. Stable numeric ids that align with the
 * uint16 ids FanRep.setFavoriteTeams expects. The list intentionally
 * covers all 16 group-stage groups' headliners — adding the full 48-team
 * list is a data-only change.
 */

import type { Team } from "./v2-types";

export const TEAMS: Team[] = [
  { id: 1, name: "Mexico", group: "A", flag: "MX" },
  { id: 2, name: "South Africa", group: "A", flag: "ZA" },
  { id: 3, name: "South Korea", group: "A", flag: "KR" },
  { id: 4, name: "Czech Republic", group: "A", flag: "CZ" },
  { id: 5, name: "Canada", group: "B", flag: "CA" },
  { id: 6, name: "Japan", group: "B", flag: "JP" },
  { id: 7, name: "Switzerland", group: "B", flag: "CH" },
  { id: 8, name: "Iran", group: "B", flag: "IR" },
  { id: 9, name: "USA", group: "C", flag: "US" },
  { id: 10, name: "England", group: "C", flag: "GB" },
  { id: 11, name: "Senegal", group: "C", flag: "SN" },
  { id: 12, name: "Uruguay", group: "C", flag: "UY" },
  { id: 13, name: "Brazil", group: "D", flag: "BR" },
  { id: 14, name: "Germany", group: "D", flag: "DE" },
  { id: 15, name: "Argentina", group: "E", flag: "AR" },
  { id: 16, name: "France", group: "E", flag: "FR" },
  { id: 17, name: "Spain", group: "F", flag: "ES" },
  { id: 18, name: "Portugal", group: "F", flag: "PT" },
  { id: 19, name: "Netherlands", group: "G", flag: "NL" },
  { id: 20, name: "Belgium", group: "G", flag: "BE" },
  { id: 21, name: "Croatia", group: "H", flag: "HR" },
  { id: 22, name: "Morocco", group: "H", flag: "MA" },
];

export function teamById(tid: number): Team | undefined {
  return TEAMS.find((t) => t.id === tid);
}

export function teamsByGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group);
}
