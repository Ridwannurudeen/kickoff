# Kickoff UI system — sports-app (FotMob/OneFootball) look

Dark + green, **data-dense and scannable**. Lists with hairline dividers beat big cards.
One green action color; gold (`honor`) is for trophies/champion moments only. No
corner-glow, no pill-soup, subtle motion only. Numbers are always tabular.

## Tokens (tailwind)
- Surfaces (low→high): `bg-pitch-bg` page · `bg-pitch-surface` · `bg-pitch-card` cards ·
  `bg-pitch-raised` hover/active. Borders: `border-pitch-border` (hairline), `border-pitch-line` (fainter divider).
- Accent: `grass` (DEFAULT/dark/glow) — the only action/active color. `text-grass`, `bg-grass`.
- Semantics: `live` (red), `win`, `draw`, `loss`, `no` (error). `muted` for secondary text.
- `honor` (gold) ONLY for trophies/champion. Don't use for nav/CTAs.
- Type: `font-sans` (Inter) for everything; `font-display` (Anton, uppercase) for big scores,
  headline numbers, page H1s. **All numbers**: add `tabular-nums` or use the `.statnum` class.
- `shadow-card` for elevation (not `shadow-glow`).

## Utility classes (globals.css)
`.card` / `.card-link` (interactive) · `.row` / `.row-link` (dense list row + divider) ·
`.label` (uppercase section eyebrow) · `.seg`/`.seg-active` · `.statnum` (tabular display).
`.btn-primary`/`.btn-ghost`/`.pill`/`.input` still exist.

## Components — `@/components/ui`
Compose these; do not hand-roll equivalents.
- `SectionHeader({ label, action?: {href,label} })` — eyebrow + optional "See all →".
- `Card({ children, className?, interactive?, href? })` — surface; href/interactive → hover lift.
- `StatTile({ label, value, accent?, sub? })` — label + big `.statnum`.
- `StatusDot({ tone: live|upcoming|closed|completed|grass|neutral, pulse? })`.
- `Badge({ children, tone: neutral|grass|live|honor })`.
- `ListRow({ left?, title, subtitle?, right?, href? })` — generic dense row (quests, leaderboard, activity).
- `SegmentedControl({ tabs:[{id,label,count?}], active, onChange })` — tabs/filters (client).
- `MatchRow({ fixture })` — FotMob fixture row (flag·team·time·team·group). Reuse for home/schedule/team.
- `GroupTable({ group, highlightId? })` — compact standings.

Reuse existing: `@/components/Flag`, `@/lib/fixtures` (ALL_FIXTURES, nextFixtures, fixturesByGroup,
fixturesForTeam, daysUntilKickoff, KICKOFF_UNIX), `@/lib/teams` (TEAMS, teamById, teamByName,
teamsByGroup, GROUP_LETTERS), `@/components/Countdown`, `@/lib/v2-fan` (useFanScore),
`@/lib/useCountUp`, `useT` from `@/components/I18nProvider`.

## Rules for page rebuilds (Wave 1 agents)
- **Only edit your assigned page file(s).** Do NOT touch tailwind.config.ts, globals.css,
  components/ui/*, Header/Footer, or lib/locales/* (frozen).
- **No new i18n keys / no new copy** — reuse existing `t()` keys. If a label seems missing,
  reuse the closest existing key; don't invent.
- **Preserve all data**: wagmi/React-Query hooks, contract addresses, on-chain reads/writes,
  and the honest empty/fallback states (no fabricated numbers).
- Keep accessibility (focus rings, alt/title on flags, semantic headings).
- Prefer dense rows/tables over stacks of big cards. Lead pages with the most scannable data.
- Run `npm run typecheck` on your changes before reporting.
