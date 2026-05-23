import type { MarketCategory } from "./types";

/**
 * Parses the on-chain metadataURI into a category + subject + optional outcome
 * labels. Convention: `kickoff://market/<category>/<subject>` where <subject>
 * is a slug. For fixture-style markets the subject may encode the teams:
 *   1x2:   kickoff://market/1x2/brazil-vs-france  -> ["Home (Brazil)","Draw","Away (France)"]
 *   group: kickoff://market/group/group-d?teams=usa,iran,ghana,wales
 * Anything unrecognised falls back to a sensible generic.
 */

const VALID: MarketCategory[] = [
  "1x2",
  "over-under",
  "btts",
  "group",
  "outright",
  "golden-boot",
];

export interface ParsedMeta {
  category: MarketCategory;
  /** human subject, e.g. "Brazil" or "Group D". */
  subject: string;
  /** explicit outcome labels parsed from metadata (may be empty). */
  outcomeLabels: string[];
}

/** Title-case a slug segment ("brazil" -> "Brazil", "south-korea" -> "South Korea"). */
function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseMetadata(uri: string): ParsedMeta {
  // strip scheme and split path + query
  const cleaned = uri.replace(/^kickoff:\/\//, "").replace(/^market\//, "");
  const [path, query = ""] = cleaned.split("?");
  const segments = path.split("/").filter(Boolean);

  // Normalize generator slug variants to the canonical category vocabulary.
  const ALIASES: Record<string, MarketCategory> = {
    "over-under-2.5": "over-under",
    ou25: "over-under",
    "group-winner": "group",
  };
  const raw0 = segments[0] ?? "";
  const normalized = (ALIASES[raw0] ?? raw0) as MarketCategory;
  const category = VALID.includes(normalized) ? normalized : "outright";
  const subjectSlug = segments.slice(1).join("/") || "";

  const params = new URLSearchParams(query);
  const teamsParam = params.get("teams");
  const explicitTeams = teamsParam
    ? teamsParam
        .split(",")
        .map((t) => titleCase(t.trim()))
        .filter(Boolean)
    : [];

  if (category === "1x2") {
    const [home, away] = subjectSlug.split(/-vs-|-v-/);
    const homeName = home ? titleCase(home) : "Home";
    const awayName = away ? titleCase(away) : "Away";
    return {
      category,
      subject:
        home && away ? `${homeName} vs ${awayName}` : titleCase(subjectSlug),
      outcomeLabels: [homeName, "Draw", awayName],
    };
  }

  if (category === "group") {
    return {
      category,
      subject: subjectSlug ? titleCase(subjectSlug) : "Group",
      outcomeLabels: explicitTeams,
    };
  }

  return {
    category,
    subject: subjectSlug ? titleCase(subjectSlug) : "",
    outcomeLabels: [],
  };
}

/**
 * Resolves N outcome labels for a market. Uses explicit labels from metadata
 * when present, otherwise derives them from the category + outcome count, and
 * finally degrades to generic "Outcome i".
 */
export function outcomeLabels(
  category: MarketCategory,
  count: number,
  meta: ParsedMeta,
): string[] {
  if (meta.outcomeLabels.length === count) return meta.outcomeLabels;

  switch (category) {
    case "1x2":
      if (count === 3) {
        return meta.outcomeLabels.length === 3
          ? meta.outcomeLabels
          : ["Home", "Draw", "Away"];
      }
      break;
    case "over-under":
      if (count === 2) return ["Over 2.5", "Under 2.5"];
      break;
    case "btts":
      if (count === 2) return ["Yes", "No"];
      break;
    case "outright":
    case "golden-boot":
      if (count === 2) return ["Yes", "No"];
      break;
    case "group":
      if (meta.outcomeLabels.length === count) return meta.outcomeLabels;
      break;
  }

  return Array.from({ length: count }, (_, i) => `Outcome ${i + 1}`);
}

/** Headline question text for the market header / cards. */
export function questionFor(
  category: MarketCategory,
  subject: string,
  count: number,
): string {
  switch (category) {
    case "1x2":
      return subject || "Match result";
    case "over-under":
      return subject
        ? `${subject} — Over/Under 2.5 goals`
        : "Over/Under 2.5 goals";
    case "btts":
      return subject
        ? `${subject} — Both teams to score?`
        : "Both teams to score?";
    case "group":
      return subject ? `Who wins ${subject}?` : "Group winner";
    case "golden-boot":
      return subject
        ? `Will ${subject} win the 2026 World Cup Golden Boot?`
        : "2026 World Cup Golden Boot";
    case "outright":
    default:
      return subject
        ? `Will ${subject} win the 2026 World Cup?`
        : `Outright winner (${count} outcomes)`;
  }
}
