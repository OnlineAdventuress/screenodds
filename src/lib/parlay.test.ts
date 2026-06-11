import { describe, expect, it } from "vitest";
import {
  buildParlayEventMarketsSearchUrl,
  normalizeParlaySearchResponse,
  summarizeParlayMarkets,
} from "./parlay";

describe("Parlay event-market discovery", () => {
  it("builds event-market search URLs without serializing the API key", () => {
    const url = buildParlayEventMarketsSearchUrl({
      query: "love island",
      sources: ["polymarket", "kalshi"],
      minConfidence: 0.2,
      sort: "match",
      limit: 10,
    });

    expect(url.toString()).toBe(
      "https://parlay-api.com/v1/event-markets/search?q=love+island&sources=polymarket%2Ckalshi&min_confidence=0.2&sort=match&limit=10",
    );
    expect(url.toString()).not.toContain("apiKey");
  });

  it("normalizes event-market results and summarizes source coverage", () => {
    const response = normalizeParlaySearchResponse({
      markets: [
        {
          source: "polymarket",
          market_id: "2382065",
          event_title: "Who will win Love Island USA Season 8? (Women)",
          title: "Will Kayda Bosse win Love Island USA Season 8?",
          volume: 980.9812,
          match_confidence: 0.99,
          prices: { best_bid: 0.2, best_ask: 0.3, last: 0.25 },
          url: "https://polymarket.com/event/who-will-win-love-island-usa-season-8",
        },
        {
          source: "kalshi",
          market_id: "KXLOVEISLMENTION",
          event_title: "What will the cast say during Love Island Episode 2?",
          title: "What will any contestant say?",
          outcome: "Drama",
          volume: 98433.46,
          match_confidence: 0.98,
          prices: { yes_bid: 0.1, yes_ask: 0.12, last: 0.11 },
          url: "https://kalshi.com/markets/KXLOVEISLMENTION",
        },
      ],
      source_summary: {
        polymarket: { count: 1, max_volume: 980.9812, top_match_confidence: 0.99 },
        kalshi: { count: 1, max_volume: 98433.46, top_match_confidence: 0.98 },
      },
    });

    expect(response.markets).toHaveLength(2);
    expect(response.markets[0]).toMatchObject({
      source: "polymarket",
      id: "2382065",
      eventTitle: "Who will win Love Island USA Season 8? (Women)",
      volume: 980.9812,
      matchConfidence: 0.99,
    });
    expect(response.markets[0].prices?.bestAsk).toBe(0.3);

    const summary = summarizeParlayMarkets(response.markets);

    expect(summary.totalMarkets).toBe(2);
    expect(summary.sourceCounts).toEqual({ kalshi: 1, polymarket: 1 });
    expect(summary.topMarket?.source).toBe("kalshi");
  });
});
