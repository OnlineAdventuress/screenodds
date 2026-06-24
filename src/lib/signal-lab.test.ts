import { describe, expect, it } from "vitest";
import {
  buildSignalLabModel,
  clampReaderProbability,
  comparePriceToReaderEstimate,
  compareProbabilityEstimate,
  probabilityToCents,
} from "./signal-lab";
import type { ExternalSignal } from "./external-signals";
import type { Market } from "./markets";

function makeMarket(partial: Partial<Market> = {}): Market {
  return {
    id: "polymarket-oscars-best-picture",
    title: "Polymarket Oscars Best Picture odds",
    slug: "polymarket-oscars-best-picture",
    description: "Oscar market hub for Best Picture probabilities.",
    category: "Awards",
    vertical: "Awards",
    tags: ["Awards", "Oscars", "Movies"],
    probability: 0.22,
    noProbability: 0.78,
    volume1mo: 628,
    volume24hr: 19,
    volume1wk: 107,
    liquidity: 8653,
    endDate: "2027-02-28T00:00:00Z",
    updatedAt: "2026-06-08T00:00:00Z",
    source: "fallback",
    ...partial,
  };
}

function makeSignal(partial: Partial<ExternalSignal> = {}): ExternalSignal {
  return {
    id: "signal-1",
    label: "Box office context",
    value: "Weekend grosses",
    detail: "Source-backed entertainment signal.",
    kind: "box-office",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/box-office",
    checkedAt: "2026-06-21T00:00:00.000Z",
    confidence: "fallback",
    ...partial,
  };
}

describe("Signal Lab probability helpers", () => {
  it("clamps reader probability estimates to the allowed 1-99 range", () => {
    expect(clampReaderProbability(-20)).toBe(1);
    expect(clampReaderProbability(0)).toBe(1);
    expect(clampReaderProbability(42.4)).toBe(42);
    expect(clampReaderProbability(120)).toBe(99);
    expect(clampReaderProbability(Number.NaN)).toBe(50);
  });

  it("compares market probability with the reader estimate using plain labels", () => {
    expect(compareProbabilityEstimate(0.22, 30)).toMatchObject({
      readerProbability: 0.3,
      differencePoints: -8,
      label: "Market lower than your estimate",
    });
    expect(compareProbabilityEstimate(0.62, 50)).toMatchObject({
      readerProbability: 0.5,
      differencePoints: 12,
      label: "Market higher than your estimate",
    });
    expect(compareProbabilityEstimate(0.51, 50)).toMatchObject({
      label: "Close to your estimate",
    });
  });

  it("converts market probability into yes/no cents", () => {
    expect(probabilityToCents(0.224)).toBe(22);
    expect(probabilityToCents(0)).toBe(0);
    expect(probabilityToCents(1)).toBe(100);
    expect(probabilityToCents(Number.NaN)).toBe(0);
  });

  it("compares market price to the reader fair price using neutral labels", () => {
    expect(comparePriceToReaderEstimate(0.62, 50)).toMatchObject({
      marketYesPriceCents: 62,
      readerYesPriceCents: 50,
      differenceCents: 12,
      label: "Market is above your estimate",
    });
    expect(comparePriceToReaderEstimate(0.22, 35)).toMatchObject({
      marketYesPriceCents: 22,
      readerYesPriceCents: 35,
      differenceCents: -13,
      label: "Market is below your estimate",
    });
    expect(comparePriceToReaderEstimate(0.51, 50)).toMatchObject({
      label: "Market is close to your estimate",
    });
  });
});

describe("Signal Lab model", () => {
  it("builds a strong box office model when volume, liquidity, and source coverage are present", () => {
    const model = buildSignalLabModel({
      market: makeMarket({
        slug: "scary-movie-opening-weekend-box-office",
        title: '"Scary Movie" Opening Weekend Box Office',
        category: "Box Office",
        vertical: "Box Office",
        tags: ["Movies", "Box Office"],
        probability: 0.62,
        volume1mo: 308870,
        volume24hr: 110809,
        liquidity: 87963,
      }),
      externalSignals: [
        makeSignal({
          id: "tmdb-1",
          label: "TMDb title metadata",
          value: "Scary Movie",
          kind: "movie-metadata",
          sourceName: "TMDb",
          sourceUrl: "https://www.themoviedb.org/movie/4247",
          confidence: "live",
        }),
        makeSignal({
          id: "box-office-1",
          label: "Box office context",
          value: "Weekend grosses",
          kind: "box-office",
        }),
      ],
    });

    expect(model.marketSlug).toBe("scary-movie-opening-weekend-box-office");
    expect(model.probabilityLabel).toBe("62%");
    expect(model.reliability.label).toBe("Strong signal");
    expect(model.valueMath).toMatchObject({
      marketYesPriceCents: 62,
      marketNoPriceCents: 38,
      defaultReaderYesPriceCents: 62,
    });
    expect(model.evidenceBreakdown.map((item) => item.label)).toEqual([
      "Market depth",
      "Source coverage",
      "Sentiment freshness",
      "Catalyst clarity",
    ]);
    expect(model.readerChecklist.length).toBeGreaterThanOrEqual(4);
    expect(model.readerChecklist[0]?.label).toMatch(/Check|Compare|Confirm|Watch/);
    expect(model.researchLinks.some((link) => link.href === "/box-office")).toBe(true);
    expect(model.researchLinks.some((link) => link.href === "/blog/2026-box-office-predictions")).toBe(true);
    expect(model.checks.some((check) => check.label === "Market liquidity")).toBe(true);
    expect(model.checks.some((check) => check.label === "Box office signal")).toBe(true);
    expect(model.catalysts.some((catalyst) => catalyst.label.includes("Weekend"))).toBe(true);
  });

  it("marks thin reality TV markets as thin while still returning useful checks", () => {
    const model = buildSignalLabModel({
      market: makeMarket({
        slug: "big-brother-odds",
        title: "Big Brother winner odds",
        category: "Reality TV",
        vertical: "Reality TV",
        tags: ["Reality TV", "Big Brother"],
        probability: 0.14,
        volume1mo: 140,
        volume24hr: 0,
        liquidity: 1000,
        endDate: null,
      }),
      externalSignals: [],
      sentimentPulse: null,
    });

    expect(model.reliability.label).toBe("Thin signal");
    expect(model.reliability.warnings.length).toBeGreaterThan(0);
    expect(model.checks.some((check) => check.label === "Reality TV signal")).toBe(true);
    expect(model.catalysts.length).toBeGreaterThan(0);
  });

  it("adds distinct related market links when related markets are supplied", () => {
    const model = buildSignalLabModel({
      market: makeMarket({ category: "Awards", vertical: "Awards" }),
      relatedMarkets: [
        makeMarket({
          slug: "grammys-predictions",
          title: "Grammy odds",
          category: "Awards",
          vertical: "Awards",
        }),
      ],
    });

    expect(model.researchLinks.some((link) => link.href === "/awards")).toBe(true);
    expect(model.researchLinks.some((link) => link.href === "/markets/grammys-predictions")).toBe(true);
    expect(model.researchLinks.some((link) => link.href === "/blog/oscar-predictions-2026")).toBe(true);
    expect(new Set(model.researchLinks.map((link) => link.href)).size).toBe(
      model.researchLinks.length,
    );
  });
});
