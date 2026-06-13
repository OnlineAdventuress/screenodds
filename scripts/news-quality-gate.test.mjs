import { describe, expect, it } from "vitest";
import { evaluateNewsCandidate } from "./news-quality-gate.mjs";

const strongCandidate = {
  status: "published",
  sourceConfidence: 0.91,
  riskFlags: [],
  sources: [
    { sourceType: "market-data", url: "https://polymarket.com/pop-culture/oscars" },
    { sourceType: "trade-reporting", url: "https://variety.com/example" },
  ],
  marketLinks: [{ href: "/awards" }],
  related: [{ href: "/news" }],
  heroImage: "/images/awards-hero.png",
  heroAlt: "Awards market dashboard",
  sections: [
    {
      heading: "What changed",
      paragraphs: [
        "A verified awards market moved after a public source updated the relevant event page.",
      ],
    },
    {
      heading: "Market context",
      paragraphs: [
        "ScreenOdds explains the public signal, the source confidence, and the market context.",
      ],
    },
  ],
};

describe("news quality gate", () => {
  it("publishes low-risk candidates with trusted sources and ScreenOdds value", () => {
    const decision = evaluateNewsCandidate(strongCandidate, { requestedPublish: true });

    expect(decision).toEqual({
      action: "publish",
      score: 100,
      reasons: expect.arrayContaining([
        "source confidence is high",
        "has at least two trusted sources",
        "has ScreenOdds market context",
      ]),
    });
  });

  it("keeps reviewable candidates as drafts when sourcing is not strong enough", () => {
    const decision = evaluateNewsCandidate(
      {
        ...strongCandidate,
        sourceConfidence: 0.62,
        sources: [{ sourceType: "trade-reporting", url: "https://deadline.com/example" }],
      },
      { requestedPublish: true },
    );

    expect(decision.action).toBe("draft");
    expect(decision.score).toBeGreaterThanOrEqual(60);
    expect(decision.reasons).toContain("needs stronger sourcing before publication");
  });

  it("does not auto-publish trade-only scans without a primary source", () => {
    const decision = evaluateNewsCandidate(
      {
        ...strongCandidate,
        sources: [
          { sourceType: "trade-reporting", url: "https://variety.com/example" },
          { sourceType: "trade-reporting", url: "https://deadline.com/example" },
        ],
      },
      { requestedPublish: true },
    );

    expect(decision.action).toBe("draft");
    expect(decision.reasons).toContain(
      "needs an official, market-data, or box-office source before auto-publication",
    );
  });

  it("discards candidates that look risky or thin", () => {
    const decision = evaluateNewsCandidate(
      {
        ...strongCandidate,
        sourceConfidence: 0.32,
        riskFlags: ["rumor"],
        sources: [],
        marketLinks: [],
        sections: [{ heading: "Rumor", paragraphs: ["A social-only rumor is circulating."] }],
      },
      { requestedPublish: true },
    );

    expect(decision.action).toBe("discard");
    expect(decision.score).toBeLessThan(60);
    expect(decision.reasons).toContain("risk flags require editorial review");
    expect(decision.reasons).toContain("discarded because it is too thin or risky");
  });
});
