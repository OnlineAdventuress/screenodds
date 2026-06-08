import { describe, expect, it } from "vitest";
import { hubPages, keywordTargets } from "./content";

describe("ScreenOdds content map", () => {
  it("defines all launch hubs", () => {
    expect(Object.keys(hubPages).sort()).toEqual([
      "awards",
      "box-office",
      "movies",
      "reality-tv",
      "tv",
    ]);
  });

  it("keeps DataForSEO-backed keyword targets for priority pages", () => {
    expect(keywordTargets["polymarket-oscars"]).toMatchObject({
      keyword: "polymarket oscars",
      volume: 720,
      difficulty: 0,
    });
  });
});
