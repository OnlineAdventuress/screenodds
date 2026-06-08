import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { MarketCategory } from "./markets";

export type ArticleSection = {
  heading: string;
  paragraphs: string[];
};

export type EditorialStatus = "published" | "draft";

export type EditorialSource = {
  title: string;
  url: string;
  publisher: string;
  accessedAt: string;
  sourceType:
    | "official"
    | "market-data"
    | "keyword-data"
    | "box-office-data"
    | "trade-reporting"
    | "reference";
};

export type MediaAsset = {
  kind: "real" | "generated" | "site";
  url: string;
  alt: string;
  provider: "TMDb" | "Official" | "Kie.ai" | "ScreenOdds" | "Jina";
  sourceUrl: string;
  credit: string;
  usageNote: string;
};

export type InfographicAsset = {
  url: string;
  alt: string;
  provider: "Kie.ai" | "ScreenOdds";
  promptSummary: string;
  usageNote: string;
};

export type RelatedLink = {
  href: string;
  label: string;
  description: string;
};

export type EditorialBase = {
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  status: EditorialStatus;
  publishedAt: string;
  updatedAt: string;
  heroImage: string;
  heroAlt: string;
  heroMedia: MediaAsset;
  sections: ArticleSection[];
  sources: EditorialSource[];
  marketLinks: RelatedLink[];
  related: RelatedLink[];
  inlineImages: MediaAsset[];
  infographics: InfographicAsset[];
  faqs: Array<{ question: string; answer: string }>;
};

export type EvergreenGuide = EditorialBase & {
  kind: "guide";
  primaryKeyword: string;
  keywordVolume: number;
  keywordDifficulty: number;
};

export type NewsRiskFlag =
  | "rumor"
  | "allegation"
  | "leak"
  | "unclear-sourcing"
  | "missing-image-attribution";

export type NewsPost = EditorialBase & {
  kind: "news";
  newsType:
    | "market-move"
    | "box-office-update"
    | "awards-signal"
    | "reality-tv-signal"
    | "streaming-signal";
  riskLevel: "low" | "review";
  sourceConfidence: number;
  riskFlags: NewsRiskFlag[];
};

export type EditorialItem = EvergreenGuide | NewsPost;

const contentRoot = path.join(process.cwd(), "content");

const jinaImageAllowlist = new Set([
  "image.tmdb.org",
  "www.themoviedb.org",
  "themoviedb.org",
  "www.oscars.org",
  "oscars.org",
  "www.theacademy.org",
  "theacademy.org",
  "www.emmys.com",
  "emmys.com",
  "www.cbs.com",
  "cbs.com",
  "www.nbc.com",
  "nbc.com",
  "www.itv.com",
  "itv.com",
]);

function readContentDirectory<T>(directory: "guides" | "news"): T[] {
  const target = path.join(contentRoot, directory);

  if (!existsSync(target)) {
    return [];
  }

  return readdirSync(target)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => {
      const raw = readFileSync(path.join(target, file), "utf8");
      return JSON.parse(raw) as T;
    });
}

function byUpdatedDateDesc(a: EditorialItem, b: EditorialItem) {
  return new Date(`${b.updatedAt}T00:00:00Z`).getTime() - new Date(`${a.updatedAt}T00:00:00Z`).getTime();
}

export function getAllGuides(): EvergreenGuide[] {
  return readContentDirectory<EvergreenGuide>("guides").sort(byUpdatedDateDesc);
}

export function getPublishedGuides(): EvergreenGuide[] {
  return getAllGuides().filter((guide) => guide.status === "published");
}

export function getGuideBySlug(slug: string): EvergreenGuide | null {
  return getPublishedGuides().find((guide) => guide.slug === slug) ?? null;
}

export function getAllNewsPosts(): NewsPost[] {
  return readContentDirectory<NewsPost>("news").sort(byUpdatedDateDesc);
}

export function getPublishedNewsPosts(): NewsPost[] {
  return getAllNewsPosts().filter((post) => post.status === "published");
}

export function getDraftNewsPosts(): NewsPost[] {
  return getAllNewsPosts().filter((post) => post.status === "draft");
}

export function getNewsPostBySlug(slug: string): NewsPost | null {
  return getPublishedNewsPosts().find((post) => post.slug === slug) ?? null;
}

export function getLatestNews(limit = 3, category?: MarketCategory): NewsPost[] {
  const posts = category
    ? getPublishedNewsPosts().filter((post) => post.category === category)
    : getPublishedNewsPosts();

  return posts.slice(0, limit);
}

export function validateMediaAsset(asset: MediaAsset): string[] {
  const errors: string[] = [];

  if (!asset.url) {
    errors.push("Media assets require url.");
  }
  if (!asset.alt) {
    errors.push("Media assets require alt.");
  }
  if (asset.kind === "real") {
    if (!asset.sourceUrl) {
      errors.push("Real media assets require sourceUrl.");
    }
    if (!asset.credit) {
      errors.push("Real media assets require credit.");
    }
    if (!asset.usageNote) {
      errors.push("Real media assets require usageNote.");
    }
  }
  if (asset.provider === "Jina") {
    if (!isAllowlistedImageSource(asset.sourceUrl)) {
      errors.push("Jina image results require an allowlisted sourceUrl.");
    }
    if (!asset.credit || !asset.usageNote) {
      errors.push("Jina image results require attribution and usage metadata.");
    }
  }

  return errors;
}

export function validatePublishedContent(item: EditorialItem): string[] {
  const errors: string[] = [];

  if (item.status !== "published") {
    return errors;
  }

  if (!item.slug) {
    errors.push("Published content requires slug.");
  }
  if (!item.title) {
    errors.push("Published content requires title.");
  }
  if (!item.description) {
    errors.push("Published content requires description.");
  }
  if (!item.heroImage) {
    errors.push("Published content requires heroImage.");
  }
  if (!item.heroAlt) {
    errors.push("Published content requires heroAlt.");
  }
  if (item.sources.length === 0) {
    errors.push("Published content requires at least one source.");
  }
  if (item.related.length === 0) {
    errors.push("Published content requires related links.");
  }
  if (item.marketLinks.length === 0) {
    errors.push("Published content requires at least one market link.");
  }

  for (const source of item.sources) {
    if (!source.title || !source.url || !source.publisher || !source.accessedAt) {
      errors.push(`Source metadata is incomplete for ${item.slug}.`);
    }
  }

  errors.push(...validateMediaAsset(item.heroMedia));
  for (const asset of item.inlineImages) {
    errors.push(...validateMediaAsset(asset));
  }

  if (item.kind === "news" && !isPublishableNewsPost(item)) {
    errors.push("Published news must pass low-risk publish checks.");
  }

  return errors;
}

export function isPublishableNewsPost(post: NewsPost): boolean {
  return (
    post.status === "published" &&
    post.riskLevel === "low" &&
    post.sourceConfidence >= 0.75 &&
    post.riskFlags.length === 0 &&
    post.sources.length > 0 &&
    post.heroImage.length > 0 &&
    post.heroAlt.length > 0 &&
    post.related.length > 0 &&
    validateMediaAsset(post.heroMedia).length === 0
  );
}

function isAllowlistedImageSource(sourceUrl: string): boolean {
  if (!sourceUrl) {
    return false;
  }

  try {
    return jinaImageAllowlist.has(new URL(sourceUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}
