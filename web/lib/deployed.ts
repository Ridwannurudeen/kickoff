import type { MarketCategory } from "./types";

/**
 * Bundled, read-only enrichment for markets deployed by scripts/create-markets.
 * Mirrors data/deployed-markets.json (subject/category/title/outcomeLabels). Gives
 * on-chain markets friendly subjects, titles and outcome labels when the
 * metadataURI alone is terse. Optional — markets not listed here still render from
 * chain + metadata. Regenerate with scripts/_gen_deployed_ts.mjs after re-seeding.
 */
export interface DeployedMeta {
  market: string;
  subject: string;
  category: MarketCategory;
  title: string;
  outcomeLabels: string[];
}

export const DEPLOYED_META: DeployedMeta[] = [
  {
    market: "0x57da3347781f54fa739df85d9e96fd7df99a6ec5",
    subject: "South Korea vs Czech Republic",
    category: "1x2",
    title: "South Korea vs Czech Republic — match result",
    outcomeLabels: ["South Korea","Draw","Czech Republic"],
  },
  {
    market: "0xf57dcbabb6da9ec6ae0e2eb4c01612978229f599",
    subject: "Czech Republic vs South Africa",
    category: "1x2",
    title: "Czech Republic vs South Africa — match result",
    outcomeLabels: ["Czech Republic","Draw","South Africa"],
  },
  {
    market: "0x9d1e1fe961d690f95873af4e972e3bdbb637f272",
    subject: "Mexico vs South Korea",
    category: "1x2",
    title: "Mexico vs South Korea — match result",
    outcomeLabels: ["Mexico","Draw","South Korea"],
  },
  {
    market: "0xa205cee0ac73ee2878d9740b904787273cb45507",
    subject: "Group B",
    category: "group",
    title: "Group B — group winner",
    outcomeLabels: ["Canada","Bosnia & Herzegovina","Qatar","Switzerland"],
  },
  {
    market: "0xf8229d6a3f9b7cd18794e97ad0ea29aa73ee4b8d",
    subject: "Group C",
    category: "group",
    title: "Group C — group winner",
    outcomeLabels: ["Brazil","Morocco","Haiti","Scotland"],
  },
  {
    market: "0x69f5746d90d380a60f3eba18e47f8aaa8c6c297a",
    subject: "France",
    category: "outright",
    title: "Will France win the 2026 World Cup?",
    outcomeLabels: ["Yes","No"],
  },
  {
    market: "0x5b6fe19c0487c0b9833a27f1ef5a8b3a954b0d32",
    subject: "England",
    category: "outright",
    title: "Will England win the 2026 World Cup?",
    outcomeLabels: ["Yes","No"],
  },
  {
    market: "0x5ebcc9757bd00390baf21c4fef393c68193afade",
    subject: "Mbappe",
    category: "golden-boot",
    title: "Will Mbappe win the 2026 World Cup Golden Boot?",
    outcomeLabels: ["Yes","No"],
  },
  {
    market: "0x846d5375d4a9ebd9873d6a0a957b924abaf24ff9",
    subject: "Kane",
    category: "golden-boot",
    title: "Will Kane win the 2026 World Cup Golden Boot?",
    outcomeLabels: ["Yes","No"],
  },
];

const BY_ADDRESS = new Map(
  DEPLOYED_META.map((m) => [m.market.toLowerCase(), m]),
);

export function deployedMeta(address: string): DeployedMeta | undefined {
  return BY_ADDRESS.get(address.toLowerCase());
}
