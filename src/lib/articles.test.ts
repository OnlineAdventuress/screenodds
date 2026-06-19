import { describe, expect, it } from "vitest";
import { articles, getArticleBySlug } from "./articles";

describe("ScreenOdds article registry", () => {
  it("ships the published SEO articles", () => {
    expect(articles.map((article) => article.slug).sort()).toEqual([
      "best-actor-oscars-odds",
      "best-picture-odds",
      "big-brother-odds",
      "dancing-with-the-stars-odds",
      "love-island-odds",
      "next-james-bond-actor-odds",
      "polymarket-golden-globes",
      "polymarket-grammys",
      "polymarket-love-island",
      "polymarket-netflix-odds",
      "polymarket-oscars-2026",
      "polymarket-oscars-odds",
      "survivor-odds",
      "tony-awards-odds",
      "weekend-box-office-predictions",
    ]);
  });

  it("returns article records by slug", () => {
    expect(getArticleBySlug("polymarket-oscars-odds")?.primaryKeyword).toBe(
      "polymarket oscars",
    );
  });
});
