import { describe, expect, it } from "vitest";
import { buildGammaEventsUrl, entertainmentTags } from "./polymarket";

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
});
