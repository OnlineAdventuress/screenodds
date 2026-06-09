import { describe, expect, it } from "vitest";
import {
  getCoveredKeywordTargets,
  getKeywordCoverage,
  getKeywordGaps,
  keywordClusters,
} from "./keyword-coverage";

describe("DataForSEO keyword coverage", () => {
  it("tracks Polymarket entertainment keywords across the core clusters", () => {
    const coverage = getKeywordCoverage();
    const categories = new Set(coverage.map((item) => item.category));

    expect(coverage.length).toBeGreaterThan(0);
    expect([...categories]).toEqual(expect.arrayContaining(keywordClusters));
  });

  it("maps covered keyword targets to crawlable ScreenOdds URLs", () => {
    const covered = getCoveredKeywordTargets();

    expect(covered.length).toBeGreaterThan(0);
    for (const target of covered) {
      expect(target.targetUrl).toMatch(/^\/(blog|news|markets|awards|box-office|movies|oscars|reality-tv|tv)/);
      expect(target.dataSource).toBe("DataForSEO");
    }
  });

  it("keeps uncovered keyword opportunities visible as planned gaps", () => {
    const gaps = getKeywordGaps();

    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((gap) => gap.status === "planned")).toBe(true);
  });

  it("monitors both Polymarket and common misspelling variants without keyword stuffing", () => {
    const coverage = getKeywordCoverage();
    const hasPolymarket = coverage.some((item) => item.keyword.includes("polymarket"));
    const hasTypoMonitor = coverage.some((item) => item.keyword.includes("pollymarket"));

    expect(hasPolymarket).toBe(true);
    expect(hasTypoMonitor).toBe(true);
  });
});
