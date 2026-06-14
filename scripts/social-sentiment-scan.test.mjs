import { describe, expect, it } from "vitest";
import {
  buildDryRunSnapshot,
  getScanTargets,
  parseArgs,
  parseEnvText,
} from "./social-sentiment-scan.mjs";

describe("social sentiment scan script helpers", () => {
  it("exposes the first ScreenOdds scan targets", () => {
    const targets = getScanTargets();

    expect(targets.map((target) => target.marketSlug)).toEqual([
      "love-island-odds",
      "polymarket-oscars-best-picture",
      "highest-grossing-movie-in-2026",
    ]);
    expect(targets[0]).toMatchObject({
      query: "Love Island Polymarket",
      kalshiSeriesHint: "KXLIUSAELIMINATION",
    });
  });

  it("parses all, market, and dry-run flags", () => {
    expect(parseArgs(["--all", "--dry-run"])).toEqual({
      all: true,
      dryRun: true,
      marketSlug: null,
    });
    expect(parseArgs(["--market", "love-island-odds"])).toEqual({
      all: false,
      dryRun: false,
      marketSlug: "love-island-odds",
    });
  });

  it("builds a dry-run snapshot without requiring xAI credentials", () => {
    const target = getScanTargets()[0];
    const snapshot = buildDryRunSnapshot(target, {
      now: new Date("2026-06-12T00:00:00.000Z"),
    });

    expect(snapshot).toMatchObject({
      marketSlug: "love-island-odds",
      query: "Love Island Polymarket",
      checkedAt: "2026-06-12T00:00:00.000Z",
      confidence: "fallback",
    });
    expect(snapshot.summary).toContain("Dry run");
    expect(snapshot.scoredItems).toHaveLength(3);
    expect(snapshot.scoredItems[0]).toMatchObject({
      source: "x",
      relevance: 0.75,
      confidence: 0.65,
    });
    expect(JSON.stringify(snapshot)).not.toContain("xai-");
  });

  it("parses shared env text without keeping quotes", () => {
    expect(
      parseEnvText('XAI_API_KEY="xai-test"\nPARLAY_API_KEY=parlay-test\n# ignored'),
    ).toEqual({
      XAI_API_KEY: "xai-test",
      PARLAY_API_KEY: "parlay-test",
    });
  });
});
