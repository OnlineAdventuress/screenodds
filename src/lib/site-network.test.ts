import { describe, expect, it } from "vitest";
import {
  getAllNetworkSites,
  getSiteNetworkLinks,
  ownedNetworkDomains,
} from "./site-network";

describe("site network registry", () => {
  it("includes every owned odds and stats domain once", () => {
    expect(ownedNetworkDomains).toEqual([
      "odsage.com",
      "riftodds.lol",
      "gridodds.com",
      "macroodds.com",
      "geoodds.com",
      "refstats.app",
    ]);

    expect(getAllNetworkSites().map((site) => site.domain)).toEqual(ownedNetworkDomains);
  });

  it("keeps GeoOdds for geography and geopolitics contexts", () => {
    const genericEntertainment = getSiteNetworkLinks({
      pageType: "hub",
      category: "Reality TV",
      maxLinks: 4,
    });

    expect(genericEntertainment.map((link) => link.domain)).not.toContain("geoodds.com");

    const geographyContext = getSiteNetworkLinks({
      pageType: "article",
      category: "Culture",
      tags: ["country", "geopolitics", "map markets"],
      maxLinks: 4,
    });

    expect(geographyContext.map((link) => link.domain)).toContain("geoodds.com");
  });

  it("prioritizes source and methodology links for box office pages", () => {
    const links = getSiteNetworkLinks({
      pageType: "market",
      category: "Box Office",
      tags: ["box office", "movie revenue", "forecast"],
      maxLinks: 3,
    });

    expect(links.map((link) => link.domain)).toEqual([
      "refstats.app",
      "odsage.com",
      "macroodds.com",
    ]);
    expect(links.every((link) => link.href.startsWith("https://"))).toBe(true);
  });
});
