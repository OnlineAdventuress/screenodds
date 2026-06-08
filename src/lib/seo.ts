import type { Article } from "./articles";
import { articles } from "./articles";
import { getLaunchMarkets, hubPages } from "./content";
import { getPublishedNewsPosts, type NewsPost } from "./editorial";

export const siteConfig = {
  name: "ScreenOdds",
  url: "https://screenodds.com",
  description:
    "Live movie, box office, awards, TV, streaming, and reality TV prediction-market odds.",
  image: "/images/screenodds-og.png",
};

export type JsonLd = Record<string, unknown>;

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
};

export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}

export function buildWebsiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

export function buildArticleJsonLd(article: Article): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: absoluteUrl(article.heroImage),
    datePublished: article.updatedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
  };
}

export function buildNewsArticleJsonLd(post: NewsPost): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.description,
    image: absoluteUrl(post.heroImage),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: absoluteUrl(`/news/${post.slug}`),
    articleSection: post.category,
  };
}

export function buildFaqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function getSitemapEntries(): SitemapEntry[] {
  const now = new Date();
  const entries = new Map<string, SitemapEntry>();

  function add(path: string, entry: Omit<SitemapEntry, "url">) {
    const url = absoluteUrl(path);
    entries.set(url, { url, ...entry });
  }

  add("/", {
    lastModified: now,
    changeFrequency: "hourly",
    priority: 1,
  });

  add("/blog", {
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  });

  add("/news", {
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.75,
  });

  for (const hub of Object.values(hubPages)) {
    add(`/${hub.slug}`, {
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    });
  }

  for (const article of articles) {
    add(`/blog/${article.slug}`, {
      lastModified: new Date(`${article.updatedAt}T00:00:00Z`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const post of getPublishedNewsPosts()) {
    add(`/news/${post.slug}`, {
      lastModified: new Date(`${post.updatedAt}T00:00:00Z`),
      changeFrequency: "daily",
      priority: 0.75,
    });
  }

  for (const market of getLaunchMarkets()) {
    add(`/markets/${market.slug}`, {
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.75,
    });
  }

  return Array.from(entries.values());
}
