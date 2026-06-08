import { describe, expect, it } from "vitest";
import { articles } from "./articles";
import { getLaunchMarkets, hubPages } from "./content";
import { getDraftNewsPosts, getPublishedNewsPosts } from "./editorial";
import {
  absoluteUrl,
  buildArticleJsonLd,
  buildNewsArticleJsonLd,
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

  it("builds NewsArticle JSON-LD with absolute images and canonical page URLs", () => {
    const post = getPublishedNewsPosts()[0];
    const jsonLd = buildNewsArticleJsonLd(post);

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: post.title,
      description: post.description,
      image: absoluteUrl(post.heroImage),
      mainEntityOfPage: absoluteUrl(`/news/${post.slug}`),
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

  it("includes every launch hub, article, published news post, and fallback market in the sitemap entries", () => {
    const entries = getSitemapEntries();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(absoluteUrl("/"));
    expect(urls).toContain(absoluteUrl("/blog"));
    expect(urls).toContain(absoluteUrl("/news"));

    for (const hub of Object.values(hubPages)) {
      expect(urls).toContain(absoluteUrl(`/${hub.slug}`));
    }

    for (const article of articles) {
      expect(urls).toContain(absoluteUrl(`/blog/${article.slug}`));
    }

    for (const post of getPublishedNewsPosts()) {
      expect(urls).toContain(absoluteUrl(`/news/${post.slug}`));
    }

    for (const draft of getDraftNewsPosts()) {
      expect(urls).not.toContain(absoluteUrl(`/news/${draft.slug}`));
    }

    for (const market of getLaunchMarkets()) {
      expect(urls).toContain(absoluteUrl(`/markets/${market.slug}`));
    }

    expect(new Set(urls).size).toBe(urls.length);
  });
});
