import { describe, expect, it } from "vitest";
import { articles, getArticleBySlug } from "./articles";

describe("ScreenOdds article registry", () => {
  it("ships the published SEO articles", () => {
    const slugs = articles.map((article) => article.slug).sort();

    expect(slugs).toEqual(expect.arrayContaining([
      "best-actor-oscars-odds",
      "best-picture-odds",
      "big-brother-odds",
      "dancing-with-the-stars-odds",
      "love-island-odds",
      "next-james-bond-actor-odds",
      "polymarket-analytics",
      "polymarket-golden-globes",
      "polymarket-grammys",
      "polymarket-love-island",
      "polymarket-netflix-odds",
      "polymarket-oscars-2026",
      "polymarket-oscars-odds",
      "polymarket-tracker",
      "polymarket-volume",
      "prediction-market-arbitrage",
      "survivor-odds",
      "tony-awards-odds",
      "weekend-box-office-predictions",
    ]));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("returns article records by slug", () => {
    expect(getArticleBySlug("polymarket-oscars-odds")?.primaryKeyword).toBe(
      "polymarket oscars",
    );
  });

  it("keeps priority authority guides above the refresh-depth floor", () => {
    const prioritySlugs = [
      "best-picture-odds",
      "big-brother-odds",
      "love-island-odds",
      "next-james-bond-actor-odds",
      "polymarket-oscars-odds",
    ];

    for (const slug of prioritySlugs) {
      const article = getArticleBySlug(slug);
      const text = [
        article?.title,
        article?.description,
        ...(article?.sections ?? []).flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
        ...(article?.faqs ?? []).flatMap((faq) => [faq.question, faq.answer]),
      ].join(" ");
      const wordCount = text.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g)?.length ?? 0;

      expect(wordCount, `${slug} word count`).toBeGreaterThanOrEqual(1_000);
      expect(article?.sources.length, `${slug} source count`).toBeGreaterThanOrEqual(3);
      expect(article?.marketLinks.length, `${slug} market links`).toBeGreaterThanOrEqual(2);
    }
  });
});
