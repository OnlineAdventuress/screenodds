import { describe, expect, it } from "vitest";
import {
  getAllNewsPosts,
  getDraftNewsPosts,
  getLatestNews,
  getPublishedGuides,
  getPublishedNewsPosts,
  isPublishableNewsPost,
  validateMediaAsset,
  validatePublishedContent,
} from "./editorial";
import { metadataTitle } from "./seo";

describe("editorial content registry", () => {
  it("keeps guide and news slugs unique across the full content set", () => {
    const slugs = [
      ...getPublishedGuides().map((guide) => `blog/${guide.slug}`),
      ...getAllNewsPosts().map((post) => `news/${post.slug}`),
    ];

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("excludes draft news from the published news collection", () => {
    const drafts = getDraftNewsPosts();
    const publishedSlugs = new Set(getPublishedNewsPosts().map((post) => post.slug));

    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(publishedSlugs.has(draft.slug)).toBe(false);
    }
  });

  it("requires published guides and news to have source, image, and related-link metadata", () => {
    const published = [...getPublishedGuides(), ...getPublishedNewsPosts()];

    expect(published.length).toBeGreaterThan(0);
    for (const item of published) {
      expect(validatePublishedContent(item)).toEqual([]);
    }
  });

  it("keeps published search metadata concise and unique enough for SERPs", () => {
    const published = [...getPublishedGuides(), ...getPublishedNewsPosts()];
    const newsDescriptions = new Set<string>();

    for (const item of published) {
      const title = metadataTitle(item.title, item.seoTitle);

      expect(title.length, `${item.slug} title length`).toBeGreaterThanOrEqual(30);
      expect(title.length, `${item.slug} title length`).toBeLessThanOrEqual(60);
      expect(item.description.length, `${item.slug} description length`).toBeGreaterThanOrEqual(
        120,
      );
      expect(item.description.length, `${item.slug} description length`).toBeLessThanOrEqual(160);

      if (item.kind === "news") {
        expect(newsDescriptions.has(item.description), `${item.slug} duplicate description`).toBe(
          false,
        );
        newsDescriptions.add(item.description);
      }
    }
  });

  it("rejects real media assets without attribution metadata", () => {
    expect(
      validateMediaAsset({
        kind: "real",
        url: "/media/movie/example/poster.jpg",
        alt: "Example movie poster",
        provider: "TMDb",
        sourceUrl: "",
        credit: "",
        usageNote: "",
      }),
    ).toEqual(
      expect.arrayContaining([
        "Real media assets require sourceUrl.",
        "Real media assets require credit.",
        "Real media assets require usageNote.",
      ]),
    );
  });

  it("rejects Jina image results from non-allowlisted sources", () => {
    expect(
      validateMediaAsset({
        kind: "real",
        url: "/media/movie/example/random.jpg",
        alt: "Random entertainment image",
        provider: "Jina",
        sourceUrl: "https://example.com/random.jpg",
        credit: "Example",
        usageNote: "Unverified source.",
      }),
    ).toEqual(
      expect.arrayContaining(["Jina image results require an allowlisted sourceUrl."]),
    );
  });

  it("keeps low-confidence news in draft mode", () => {
    const draft = getDraftNewsPosts()[0];

    expect(draft).toBeDefined();
    expect(isPublishableNewsPost(draft)).toBe(false);
  });

  it("returns latest published news by category without drafts", () => {
    const awardsNews = getLatestNews(5, "Awards");

    expect(awardsNews.length).toBeGreaterThan(0);
    expect(awardsNews.every((post) => post.category === "Awards")).toBe(true);
    expect(awardsNews.every((post) => post.status === "published")).toBe(true);
  });
});
