import { describe, expect, it } from "vitest";
import { buildGammaEventsUrl, entertainmentTags, isScreenOddsMarket } from "./polymarket";

describe("Polymarket entertainment fetch contract", () => {
  it("tracks the approved entertainment tags", () => {
    expect(entertainmentTags.map((tag) => tag.id)).toEqual([
      53, 51, 18, 100338, 100339, 102952,
    ]);
  });

  it("builds a Gamma API URL for active related events", () => {
    const url = buildGammaEventsUrl(53);

    expect(url).toContain("https://gamma-api.polymarket.com/events?");
    expect(url).toContain("tag_id=53");
    expect(url).toContain("related_tags=false");
    expect(url).toContain("active=true");
    expect(url).toContain("closed=false");
    expect(url).toContain("order=volume1mo");
  });

  it("excludes non-entertainment awards markets", () => {
    expect(
      isScreenOddsMarket({
        id: "nobel",
        title: "Nobel Peace Prize Winner 2026",
        slug: "nobel-peace-prize-winner-2026",
        description: "Winner of the Nobel Peace Prize.",
        category: "Awards",
        vertical: "Awards",
        tags: ["Awards", "Politics"],
        probability: 0.1,
        noProbability: 0.9,
        volume1mo: 1,
        volume24hr: 1,
        volume1wk: 1,
        liquidity: 1,
        endDate: null,
        updatedAt: "2026-06-08T00:00:00Z",
        source: "polymarket",
      }),
    ).toBe(false);

    expect(
      isScreenOddsMarket({
        id: "tony",
        title: "Tony Awards: Best Play Winner",
        slug: "tony-awards-best-play-winner",
        description: "Best Play winner market.",
        category: "Awards",
        vertical: "Awards",
        tags: ["Awards", "Culture", "Movies"],
        probability: 0.4,
        noProbability: 0.6,
        volume1mo: 1,
        volume24hr: 1,
        volume1wk: 1,
        liquidity: 1,
        endDate: null,
        updatedAt: "2026-06-08T00:00:00Z",
        source: "polymarket",
      }),
    ).toBe(true);
  });
});
