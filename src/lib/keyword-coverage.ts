import keywordCoverageData from "../../content/keyword-coverage.json";
import type { MarketCategory } from "./markets";

export type KeywordCoverageStatus = "covered" | "planned" | "monitor";

export type KeywordCoverageItem = {
  keyword: string;
  category: MarketCategory;
  cluster: "polymarket" | "awards" | "box-office" | "movies" | "tv-streaming" | "reality-tv";
  status: KeywordCoverageStatus;
  targetUrl: string;
  searchVolume: number;
  keywordDifficulty: number | null;
  cpc: number | null;
  intent: "informational" | "navigational" | "commercial" | "mixed";
  priority: number;
  dataSource: "DataForSEO";
  checkedAt: string;
  notes: string;
};

export const keywordClusters: MarketCategory[] = [
  "Awards",
  "Box Office",
  "Movies",
  "TV & Streaming",
  "Reality TV",
];

export function getKeywordCoverage(): KeywordCoverageItem[] {
  return [...(keywordCoverageData as KeywordCoverageItem[])].sort(
    (a, b) => b.priority - a.priority || b.searchVolume - a.searchVolume,
  );
}

export function getCoveredKeywordTargets(): KeywordCoverageItem[] {
  return getKeywordCoverage().filter((item) => item.status === "covered");
}

export function getKeywordGaps(): KeywordCoverageItem[] {
  return getKeywordCoverage().filter((item) => item.status === "planned");
}
