import { describe, expect, it } from "vitest";
import { articles } from "./articles";
import { getLaunchMarkets, hubPages } from "./content";
import {
  absoluteUrl,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  getSitemapEntries,
  siteConfig,
} from "./seo";

describe("ScreenOdds SEO helpers", () => {
  it("builds canonical absolute URLs for screenodds.com", () => {
    expect(siteConfig.url).toBe("https://screenodds.com");
    expect(absoluteUrl("/awards")).toBe("https://screenodds.com/awards");
    expect(absoluteUrl("blog/best-picture-odds")).toBe(
      "https://screenodds.com/blog/best-picture-odds",
    );
  });

  it("builds Article JSON-LD with absolute images and canonical page URLs", () => {
    const article = articles[0];
    const jsonLd = buildArticleJsonLd(article);

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      image: absoluteUrl(article.heroImage),
      mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
    });
  });

  it("builds BreadcrumbList JSON-LD with absolute item URLs", () => {
    const jsonLd = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Awards", path: "/awards" },
    ]);

    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[1]).toMatchObject({
      position: 2,
      name: "Awards",
      item: "https://screenodds.com/awards",
    });
  });

  it("includes every launch hub, article, and fallback market in the sitemap entries", () => {
    const entries = getSitemapEntries();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(absoluteUrl("/"));
    expect(urls).toContain(absoluteUrl("/blog"));

    for (const hub of Object.values(hubPages)) {
      expect(urls).toContain(absoluteUrl(`/${hub.slug}`));
    }

    for (const article of articles) {
      expect(urls).toContain(absoluteUrl(`/blog/${article.slug}`));
    }

    for (const market of getLaunchMarkets()) {
      expect(urls).toContain(absoluteUrl(`/markets/${market.slug}`));
    }

    expect(new Set(urls).size).toBe(urls.length);
  });
});
