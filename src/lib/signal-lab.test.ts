import { describe, expect, it } from "vitest";
import {
  buildSignalLabModel,
  clampReaderProbability,
  compareProbabilityEstimate,
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
});
