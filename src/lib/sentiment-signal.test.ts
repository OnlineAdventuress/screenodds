import { describe, expect, it } from "vitest";
import {
  DEFAULT_SENTIMENT_SIGNAL_CONFIG,
  calculateSentimentSignal,
  calibrateProbabilityMapping,
} from "./sentiment-signal";

describe("sentiment probability signal", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("aggregates outcome stance into a social-implied probability and divergence", () => {
    const signal = calculateSentimentSignal({
      marketProbability: 0.42,
      now,
      items: [
        {
          source: "x",
          url: "https://x.com/example/status/1",
          text: "The winner edit keeps pointing toward the market leader.",
          publishedAt: "2026-06-13T12:00:00.000Z",
          engagement: 120,
          relevance: 0.92,
          stance: 0.82,
          confidence: 0.86,
        },
        {
          source: "reddit",
          url: "https://www.reddit.com/r/example/comments/1",
          text: "Audience vote chatter is lining up with the same outcome.",
          publishedAt: "2026-06-12T12:00:00.000Z",
          engagement: 45,
          relevance: 0.78,
          stance: 0.64,
          confidence: 0.74,
        },
        {
          source: "web",
          url: "https://example.com/awards-signal",
          text: "A fresh recap highlights the same frontrunner narrative.",
          publishedAt: "2026-06-10T12:00:00.000Z",
          engagement: 8,
          relevance: 0.7,
          stance: 0.42,
          confidence: 0.68,
        },
        {
          source: "x",
          url: "https://x.com/example/status/irrelevant",
          text: "A generic joke about the show with no market signal.",
          publishedAt: "2026-06-13T12:00:00.000Z",
          engagement: 900,
          relevance: 0.1,
          stance: 1,
          confidence: 0.95,
        },
      ],
    });

    expect(signal.sampleSize).toBe(3);
    expect(signal.rawIndex).toBeGreaterThan(0.45);
    expect(signal.socialProbability).toBeGreaterThan(0.6);
    expect(signal.divergence).toBeGreaterThan(0.12);
    expect(signal.signal).toBe(true);
    expect(signal.confidenceLabel).toBe("medium");
    expect(signal.topItems[0]?.url).toBe("https://x.com/example/status/1");
  });

  it("marks thin samples as low confidence even when divergence is large", () => {
    const signal = calculateSentimentSignal({
      marketProbability: 0.2,
      now,
      items: [
        {
          source: "x",
          url: "https://x.com/example/status/2",
          text: "One confident post is not enough to call a signal.",
          publishedAt: "2026-06-14T12:00:00.000Z",
          engagement: 300,
          relevance: 0.95,
          stance: 1,
          confidence: 0.95,
        },
      ],
    });

    expect(signal.sampleSize).toBe(1);
    expect(signal.socialProbability).toBeGreaterThan(0.75);
    expect(signal.signal).toBe(false);
    expect(signal.confidenceLabel).toBe("low");
  });

  it("returns a neutral no-signal state when no relevant items qualify", () => {
    const signal = calculateSentimentSignal({
      marketProbability: 0.5,
      now,
      items: [
        {
          source: "web",
          text: "Old and unrelated item.",
          publishedAt: "2026-04-01T12:00:00.000Z",
          engagement: 10,
          relevance: 0.1,
          stance: 1,
          confidence: 0.8,
        },
      ],
    });

    expect(signal.sampleSize).toBe(0);
    expect(signal.socialProbability).toBeNull();
    expect(signal.divergence).toBeNull();
    expect(signal.signal).toBe(false);
    expect(signal.methodology).toContain("uncalibrated");
  });

  it("keeps calibration as an explicit future hook", () => {
    expect(calibrateProbabilityMapping([], DEFAULT_SENTIMENT_SIGNAL_CONFIG)).toEqual({
      status: "insufficient-data",
      snapshotCount: 0,
      message:
        "Need resolved historical snapshots before fitting Platt scaling or isotonic calibration.",
    });
  });
});
