import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getFallbackSentimentPulse,
  getSentimentPulseForMarket,
  getSentimentTopicForMarket,
  normalizeSentimentSnapshot,
} from "./sentiment";

describe("sentiment pulse cache", () => {
  it("returns deterministic fallback content when no snapshot exists", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "screenodds-sentiment-"));
    try {
      const pulse = await getSentimentPulseForMarket("love-island-odds", {
        baseDir: dir,
      });

      expect(pulse.marketSlug).toBe("love-island-odds");
      expect(pulse.confidence).toBe("fallback");
      expect(pulse.sourceCounts.x).toBeGreaterThanOrEqual(0);
      expect(pulse.summary).toContain("ScreenOdds");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("parses valid cached snapshots without leaking secrets", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "screenodds-sentiment-"));
    try {
      await writeFile(
        path.join(dir, "love-island-odds.json"),
        JSON.stringify({
          marketSlug: "love-island-odds",
          query: "Love Island Polymarket",
          checkedAt: "2026-06-12T00:00:00.000Z",
          windowDays: 30,
          sentimentLabel: "mixed",
          summary: "X discussion is focused on Love Island prediction markets.",
          topNarratives: ["Polymarket added Love Island markets"],
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
        }),
      );

      const pulse = await getSentimentPulseForMarket("love-island-odds", {
        baseDir: dir,
      });

      expect(pulse.confidence).toBe("live");
      expect(pulse.citedPosts[0]?.author).toBe("PredictionNews_");
      expect(JSON.stringify(pulse)).not.toContain("xai-");
      expect(JSON.stringify(pulse)).not.toContain("apiKey");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back when cached JSON is invalid", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "screenodds-sentiment-"));
    try {
      await writeFile(path.join(dir, "love-island-odds.json"), "{not json");

      const pulse = await getSentimentPulseForMarket("love-island-odds", {
        baseDir: dir,
      });

      expect(pulse.confidence).toBe("fallback");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("normalizes partial snapshots and market topic config", () => {
    expect(getSentimentTopicForMarket("polymarket-oscars-best-picture")?.query).toBe(
      "Polymarket Oscars Best Picture Kalshi",
    );

    const snapshot = normalizeSentimentSnapshot({
      marketSlug: "highest-grossing-movie-in-2026",
      query: "highest grossing movie Polymarket Kalshi",
      checkedAt: "2026-06-12T00:00:00.000Z",
      summary: "Movie chart discussion is thin but relevant.",
    });

    expect(snapshot?.sentimentLabel).toBe("neutral");
    expect(snapshot?.topNarratives.length).toBeGreaterThan(0);
  });

  it("exposes direct fallback generation for seeded and unknown markets", () => {
    expect(getFallbackSentimentPulse("love-island-odds").query).toBe(
      "Love Island Polymarket",
    );
    expect(getFallbackSentimentPulse("unknown-market").marketSlug).toBe(
      "unknown-market",
    );
  });
});
