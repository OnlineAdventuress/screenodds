import { describe, expect, it } from "vitest";
import {
  getAllNewsPosts,
  getDraftNewsPosts,
  getPublishedGuides,
  getPublishedNewsPosts,
  isPublishableNewsPost,
  validateMediaAsset,
  validatePublishedContent,
} from "./editorial";

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

  it("keeps low-confidence news in draft mode", () => {
    const draft = getDraftNewsPosts()[0];

    expect(draft).toBeDefined();
    expect(isPublishableNewsPost(draft)).toBe(false);
  });
});
