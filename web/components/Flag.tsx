/**
 * Real SVG national flags for the 48 World Cup 2026 teams. Backed by
 * country-flag-icons (3x2 ratio). We import only the codes lib/teams.ts uses
 * — a namespace import would bundle all ~260 flags — and map them by the
 * exact `flag` string stored on each Team (home-nation codes like "GB-ENG"
 * map to the underscore-named exports).
 *
 * NB: deliberately NOT flag emoji — Windows ships no regional-indicator
 * glyphs, so emoji flags would render as bare letters in Chrome/Edge.
 */

import {
  MX,
  ZA,
  KR,
  CZ,
  CA,
  CH,
  QA,
  BA,
  BR,
  MA,
  GB_SCT,
  HT,
  US,
  TR,
  AU,
  PY,
  DE,
  EC,
  CI,
  CW,
  NL,
  JP,
  SE,
  TN,
  BE,
  EG,
  IR,
  NZ,
  ES,
  UY,
  SA,
  CV,
  FR,
  SN,
  NO,
  IQ,
  AR,
  AT,
  DZ,
  JO,
  PT,
  CO,
  UZ,
  CD,
  GB_ENG,
  HR,
  GH,
  PA,
} from "country-flag-icons/react/3x2";

// country-flag-icons types its components as (props) => JSX.Element where the
// props extend both HTML and SVG attributes, so className/title are accepted.
type FlagComponent = (props: {
  title?: string;
  className?: string;
}) => React.JSX.Element;

const FLAGS: Record<string, FlagComponent> = {
  MX,
  ZA,
  KR,
  CZ,
  CA,
  CH,
  QA,
  BA,
  BR,
  MA,
  "GB-SCT": GB_SCT,
  HT,
  US,
  TR,
  AU,
  PY,
  DE,
  EC,
  CI,
  CW,
  NL,
  JP,
  SE,
  TN,
  BE,
  EG,
  IR,
  NZ,
  ES,
  UY,
  SA,
  CV,
  FR,
  SN,
  NO,
  IQ,
  AR,
  AT,
  DZ,
  JO,
  PT,
  CO,
  UZ,
  CD,
  "GB-ENG": GB_ENG,
  HR,
  GH,
  PA,
};

export function Flag({
  code,
  title,
  className = "h-4 w-6",
}: {
  code: string;
  title?: string;
  className?: string;
}) {
  const Svg = FLAGS[code];
  if (!Svg) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm bg-pitch-panel font-mono text-[10px] text-muted ${className}`}
        title={title}
      >
        {code}
      </span>
    );
  }
  return (
    <Svg
      title={title}
      className={`inline-block rounded-sm shadow-sm ring-1 ring-black/20 ${className}`}
    />
  );
}
