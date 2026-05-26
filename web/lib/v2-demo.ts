/**
 * Demo-mode placeholder data used by the v2 surfaces when the on-chain
 * contracts aren't yet deployed. Every helper returns a *deterministic*
 * value so SSR + client render match without hydration drift.
 *
 * The moment V2_FULLY_CONFIGURED flips true, the live hooks short-circuit
 * past these helpers and read the chain.
 *
 * Demo agent ids and addresses are derived at module load with keccak256
 * over stable seed strings — this keeps obvious "fake-secret" patterns
 * out of source while still producing the deterministic, hex-shaped ids
 * the league UI needs.
 */

import { keccak256, toBytes } from "viem";

const demoId = (seed: string): `0x${string}` => keccak256(toBytes(seed));
const demoAddr = (seed: string): `0x${string}` =>
  `0x${keccak256(toBytes(seed)).slice(2, 42)}` as `0x${string}`;

export const DEMO_LEADERBOARD: {
  address: `0x${string}`;
  totalXp: number;
  predAccBps: number;
  engagement: number;
  longevityDays: number;
}[] = [
  {
    address: demoAddr("kickoff.v2.demo.fan.1"),
    totalXp: 4820,
    predAccBps: 6420,
    engagement: 1800,
    longevityDays: 42,
  },
  {
    address: demoAddr("kickoff.v2.demo.fan.2"),
    totalXp: 4310,
    predAccBps: 5980,
    engagement: 1620,
    longevityDays: 38,
  },
  {
    address: demoAddr("kickoff.v2.demo.fan.3"),
    totalXp: 3995,
    predAccBps: 5510,
    engagement: 1490,
    longevityDays: 35,
  },
  {
    address: demoAddr("kickoff.v2.demo.fan.4"),
    totalXp: 3720,
    predAccBps: 4980,
    engagement: 1380,
    longevityDays: 31,
  },
  {
    address: demoAddr("kickoff.v2.demo.fan.5"),
    totalXp: 3160,
    predAccBps: 4540,
    engagement: 1210,
    longevityDays: 28,
  },
];

export const DEMO_LEAGUE_STANDINGS: {
  agentId: `0x${string}`;
  name: string;
  owner: `0x${string}`;
  score: number;
}[] = [
  {
    agentId: demoId("kickoff.v2.demo.agent.match-analyst-v1"),
    name: "match-analyst-v1",
    owner: demoAddr("kickoff.v2.demo.fan.1"),
    score: 1840,
  },
  {
    agentId: demoId("kickoff.v2.demo.agent.alpha-striker"),
    name: "alpha-striker",
    owner: demoAddr("kickoff.v2.demo.fan.2"),
    score: 1620,
  },
  {
    agentId: demoId("kickoff.v2.demo.agent.kelly-keeper"),
    name: "kelly-keeper",
    owner: demoAddr("kickoff.v2.demo.fan.3"),
    score: 1485,
  },
  {
    agentId: demoId("kickoff.v2.demo.agent.tactica-1"),
    name: "tactica-1",
    owner: demoAddr("kickoff.v2.demo.fan.4"),
    score: 1190,
  },
];

export const DEMO_PROTOCOL_STATS = {
  fansOnboarded: 1247,
  questsCompleted: 8910,
  trophiesMinted: 532,
  agentsInLeague: 18,
};
