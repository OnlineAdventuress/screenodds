import { describe, expect, it } from "vitest";
import {
  calculateMarketSummary,
  filterMarkets,
  normalizeGammaEvent,
  rankMarketsByOpportunity,
  type Market,
} from "./markets";

function makeMarket(partial: Partial<Market> & Pick<Market, "title" | "category">): Market {
  return {
    id: partial.title.toLowerCase().replaceAll(" ", "-"),
    title: partial.title,
    slug: partial.title.toLowerCase().replaceAll(" ", "-"),
    description: "",
    category: partial.category,
    vertical: partial.category,
    tags: [partial.category],
    probability: 0.5,
    noProbability: 0.5,
    volume1mo: 1,
    volume24hr: 1,
    volume1wk: 1,
    liquidity: 1,
    endDate: null,
    updatedAt: "2026-06-08T00:00:00Z",
    source: "fallback",
    ...partial,
  };
}

describe("ScreenOdds market utilities", () => {
  it("normalizes Gamma events into ScreenOdds markets", () => {
    const market = normalizeGammaEvent({
      id: "1",
      title: '"Scary Movie" Opening Weekend Box Office',
      slug: "scary-movie-opening-weekend-box-office",
      description: "Opening weekend gross market.",
      volume1mo: "308870.14",
      volume24hr: "110809.56",
      volume1wk: "308870.14",
      liquidity: "87963.55",
      endDate: "2026-06-08T12:00:00Z",
      updatedAt: "2026-06-08T00:00:00Z",
      tags: [{ label: "Movies" }, { label: "box office" }],
      markets: [{ outcomePrices: '["0.62","0.38"]' }],
    });

    expect(market.category).toBe("Box Office");
    expect(market.probability).toBe(0.62);
    expect(market.volume1mo).toBe(308870.14);
  });

  it("calculates market summary totals", () => {
    const markets = [
      makeMarket({
        title: "Market One",
        category: "Movies",
        volume1mo: 100,
        volume24hr: 10,
        volume1wk: 30,
        liquidity: 40,
        probability: 0.4,
      }),
      makeMarket({
        title: "Market Two",
        category: "Movies",
        volume1mo: 200,
        volume24hr: 20,
        volume1wk: 50,
        liquidity: 60,
        probability: 0.6,
      }),
    ];

    expect(calculateMarketSummary(markets)).toMatchObject({
      totalMarkets: 2,
      totalVolume1mo: 300,
      totalVolume24hr: 30,
      totalLiquidity: 100,
    });
  });

  it("filters markets by category and query", () => {
    const markets = [
      makeMarket({ title: "Best Picture Odds", category: "Awards" }),
      makeMarket({ title: "Love Island Odds", category: "Reality TV" }),
    ];

    expect(filterMarkets(markets, { category: "Awards", query: "picture" })).toHaveLength(1);
  });

  it("ranks SEO-relevant liquid markets first", () => {
    const ranked = rankMarketsByOpportunity([
      makeMarket({
        id: "a",
        title: "Polymarket Oscars Best Picture",
        slug: "polymarket-oscars-best-picture",
        category: "Awards",
        tags: ["Awards", "Oscars"],
        volume1mo: 5000,
        volume24hr: 500,
        volume1wk: 1000,
        liquidity: 2000,
      }),
      makeMarket({
        id: "b",
        title: "Minor Culture Market",
        slug: "minor-culture-market",
        category: "Culture",
        tags: ["Culture"],
        volume1mo: 50,
        volume24hr: 0,
        volume1wk: 10,
        liquidity: 20,
      }),
    ]);

    expect(ranked[0].slug).toBe("polymarket-oscars-best-picture");
  });
});
