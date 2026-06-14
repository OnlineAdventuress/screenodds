import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("market page sentiment integration", () => {
  it("loads and renders the cached sentiment pulse", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "app", "markets", "[slug]", "page.tsx"),
      "utf8",
    );

    expect(source).toContain('import { SentimentPulse } from "@/components/sentiment-pulse"');
    expect(source).toContain('import { getSentimentPulseForMarket } from "@/lib/sentiment"');
    expect(source).toContain("await getSentimentPulseForMarket(market.slug)");
    expect(source).toContain(
      "<SentimentPulse pulse={sentimentPulse} marketProbability={market.probability} />",
    );
  });
});
