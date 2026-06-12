import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SentimentPulse } from "./sentiment-pulse";
import type { SentimentPulse as SentimentPulseModel } from "../lib/sentiment";

const pulse: SentimentPulseModel = {
  marketSlug: "love-island-odds",
  query: "Love Island Polymarket",
  checkedAt: "2026-06-12T00:00:00.000Z",
  windowDays: 30,
  sentimentLabel: "mixed",
  summary: "X discussion is focused on Love Island prediction markets.",
  topNarratives: [
    "Polymarket added Love Island markets",
    "Kalshi is also active around Love Island outcomes",
  ],
  sourceCounts: { x: 10, reddit: 0, polymarket: 2, kalshi: 3 },
  citedPosts: [
    {
      source: "x",
      author: "PredictionNews_",
      url: "https://x.com/PredictionNews_/status/2062231921791541519",
      date: "2026-06-03",
      engagementLabel: "4 likes",
      text: "Polymarket added Love Island markets.",
    },
  ],
  relatedMarkets: [
    {
      source: "kalshi",
      title: "who will be eliminated",
      url: "https://kalshi.com/markets/KXLIUSAELIMINATION",
      priceLabel: "Best ask 36%",
      volumeLabel: "$65.4K volume",
    },
  ],
  confidence: "live",
};

describe("SentimentPulse", () => {
  it("renders sentiment summary, narratives, source counts, and links", () => {
    const html = renderToStaticMarkup(<SentimentPulse pulse={pulse} />);

    expect(html).toContain("Sentiment pulse");
    expect(html).toContain("mixed");
    expect(html).toContain("Checked 2026-06-12");
    expect(html).toContain("30-day window");
    expect(html).toContain("X:10");
    expect(html).toContain("Polymarket:2");
    expect(html).toContain("Kalshi:3");
    expect(html).toContain("PredictionNews_");
    expect(html).toContain("who will be eliminated");
    expect(html).toContain('href="https://x.com/PredictionNews_/status/2062231921791541519"');
    expect(html).toContain('href="https://kalshi.com/markets/KXLIUSAELIMINATION"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });

  it("renders a fallback-safe panel without cited links", () => {
    const html = renderToStaticMarkup(
      <SentimentPulse
        pulse={{
          ...pulse,
          confidence: "fallback",
          citedPosts: [],
          relatedMarkets: [],
        }}
      />,
    );

    expect(html).toContain("fallback");
    expect(html).toContain("No cited social posts cached yet.");
    expect(html).toContain("No related comparison markets cached yet.");
  });
});
