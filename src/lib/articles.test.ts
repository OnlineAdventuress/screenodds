import { describe, expect, it } from "vitest";
import { articles, getArticleBySlug } from "./articles";

describe("ScreenOdds article registry", () => {
  it("ships the published SEO articles", () => {
    expect(articles.map((article) => article.slug).sort()).toEqual([
      "best-picture-odds",
      "big-brother-odds",
      "love-island-odds",
      "next-james-bond-actor-odds",
      "polymarket-golden-globes",
      "polymarket-grammys",
      "polymarket-love-island",
      "polymarket-oscars-2026",
      "polymarket-oscars-odds",
    ]);
  });

  it("returns article records by slug", () => {
    expect(getArticleBySlug("polymarket-oscars-odds")?.primaryKeyword).toBe(
      "polymarket oscars",
    );
  });
});
