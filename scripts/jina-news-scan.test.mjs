import { describe, expect, it } from "vitest";
import { parseJinaSearchResults } from "./jina-news-scan.mjs";

describe("Jina news scan parser", () => {
  it("parses numbered Jina search result blocks", () => {
    const results = parseJinaSearchResults(`
[1] Title: Best Picture Predictions & Real-Time Odds | Polymarket
[1] URL Source: https://polymarket.com/predictions/best-picture

[2] Title: Oscars News
[2] URL Source: https://www.oscars.org/news
`);

    expect(results).toEqual([
      {
        title: "Best Picture Predictions & Real-Time Odds | Polymarket",
        url: "https://polymarket.com/predictions/best-picture",
        publisher: "Polymarket",
        sourceType: "market-data",
      },
      {
        title: "Oscars News",
        url: "https://www.oscars.org/news",
        publisher: "Oscars",
        sourceType: "official",
      },
    ]);
  });
});
