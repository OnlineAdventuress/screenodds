import { describe, expect, it } from "vitest";
import { hubPages } from "./content";

describe("ScreenOdds content registry", () => {
  it("defines a generated hero image for every market hub", () => {
    const hubs = Object.values(hubPages) as Array<{
      heroImage?: string;
      heroAlt?: string;
    }>;

    expect(hubs.every((hub) => hub.heroImage?.startsWith("/images/"))).toBe(true);
    expect(hubs.every((hub) => hub.heroAlt && hub.heroAlt.length > 20)).toBe(true);
  });
});
