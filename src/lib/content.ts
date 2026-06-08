import { fallbackMarkets } from "./fixtures";
import {
  calculateMarketSummary,
  categoryOrder,
  filterMarkets,
  getMarketBySlug,
  rankMarketsByOpportunity,
  type Market,
  type MarketCategory,
} from "./markets";

export type HubPage = {
  slug: string;
  category: MarketCategory;
  eyebrow: string;
  title: string;
  description: string;
  primaryKeyword: string;
  intro: string;
  heroImage: string;
  heroAlt: string;
};

export type KeywordTarget = {
  keyword: string;
  volume: number;
  difficulty: number;
  intent: "informational" | "commercial";
};

export const hubPages = {
  movies: {
    slug: "movies",
    category: "Movies",
    eyebrow: "Movie markets",
    title: "Movie Prediction Markets",
    description:
      "Live movie prediction markets for franchise releases, casting decisions, and year-end film outcomes.",
    primaryKeyword: "next james bond actor odds",
    intro:
      "Track market-implied movie probabilities without digging through the full Polymarket culture feed. ScreenOdds highlights the film markets with real search interest and meaningful volume.",
    heroImage: "/images/movies-hero.png",
    heroAlt: "Editorial movie casting board with cinema reels and probability charts",
  },
  "box-office": {
    slug: "box-office",
    category: "Box Office",
    eyebrow: "Weekend grosses",
    title: "Box Office Prediction Markets",
    description:
      "Opening weekend, highest-grossing film, and domestic box office markets collected in one place.",
    primaryKeyword: "polymarket box office",
    intro:
      "Box office markets are small in count but useful for long-tail search: each release can become a focused page with probability, liquidity, and resolution context.",
    heroImage: "/images/box-office-hero.png",
    heroAlt: "Editorial box office counter with ticket stacks and market chart lighting",
  },
  awards: {
    slug: "awards",
    category: "Awards",
    eyebrow: "Oscars and awards",
    title: "Awards Prediction Markets",
    description:
      "Oscars, Grammys, Tonys, and culture-award markets with DataForSEO-backed page targets.",
    primaryKeyword: "polymarket oscars",
    intro:
      "Awards are the strongest launch wedge for ScreenOdds. DataForSEO shows low-difficulty demand around Best Picture odds, Polymarket Oscars, Grammy odds, and Tony Awards odds.",
    heroImage: "/images/awards-hero.png",
    heroAlt: "Editorial awards-season envelopes and trophy silhouettes with probability charts",
  },
  tv: {
    slug: "tv",
    category: "TV & Streaming",
    eyebrow: "Streaming signals",
    title: "TV and Streaming Prediction Markets",
    description:
      "Netflix, streaming chart, release timing, and TV outcome markets filtered for screen-entertainment users.",
    primaryKeyword: "polymarket netflix",
    intro:
      "Streaming markets can move quickly around release calendars and weekly chart outcomes. This hub keeps TV and Netflix-style markets separate from broader culture noise.",
    heroImage: "/images/tv-hero.png",
    heroAlt: "Editorial streaming dashboard with TV screens and abstract market signals",
  },
  "reality-tv": {
    slug: "reality-tv",
    category: "Reality TV",
    eyebrow: "Reality TV odds",
    title: "Reality TV Prediction Markets",
    description:
      "Reality competition and dating-show market pages for Love Island, Big Brother, Top Chef, and similar franchises.",
    primaryKeyword: "love island odds",
    intro:
      "Reality TV is not the deepest current Polymarket category, but DataForSEO shows rankable search demand for Love Island odds, Big Brother odds, and celebrity competition markets.",
    heroImage: "/images/reality-tv-hero.png",
    heroAlt: "Editorial reality TV studio control room with voting lights and market charts",
  },
} satisfies Record<string, HubPage>;

export const keywordTargets: Record<string, KeywordTarget> = {
  "polymarket-oscars": {
    keyword: "polymarket oscars",
    volume: 720,
    difficulty: 0,
    intent: "informational",
  },
  "best-picture-odds": {
    keyword: "best picture odds",
    volume: 1600,
    difficulty: 7,
    intent: "informational",
  },
  "love-island-odds": {
    keyword: "love island odds",
    volume: 390,
    difficulty: 2,
    intent: "informational",
  },
  "big-brother-odds": {
    keyword: "big brother odds",
    volume: 140,
    difficulty: 0,
    intent: "informational",
  },
  "next-james-bond-actor-odds": {
    keyword: "next james bond actor odds",
    volume: 170,
    difficulty: 6,
    intent: "informational",
  },
  "grammy-odds": {
    keyword: "grammy odds",
    volume: 320,
    difficulty: 0,
    intent: "informational",
  },
  "tony-awards-odds": {
    keyword: "tony awards odds",
    volume: 90,
    difficulty: 0,
    intent: "informational",
  },
};

export function getFallbackMarkets(): Market[] {
  return fallbackMarkets;
}

export function getHomeStats(markets: Market[] = fallbackMarkets) {
  const ranked = rankMarketsByOpportunity(markets);
  const summary = calculateMarketSummary(markets);

  return {
    ranked,
    summary,
  };
}

export function getHubMarkets(category: MarketCategory, markets: Market[]): Market[] {
  return rankMarketsByOpportunity(filterMarkets(markets, { category }));
}

export function getRelatedMarkets(market: Market, markets: Market[] = fallbackMarkets): Market[] {
  return markets
    .filter((entry) => entry.slug !== market.slug)
    .filter(
      (entry) =>
        entry.category === market.category ||
        entry.tags.some((tag) => market.tags.includes(tag)),
    )
    .slice(0, 3);
}

export function getSeededMarket(slug: string): Market | null {
  return getMarketBySlug(fallbackMarkets, slug);
}

export function getLaunchMarkets(): Market[] {
  return fallbackMarkets;
}

export function getCategoryCounts(markets: Market[] = fallbackMarkets) {
  return categoryOrder
    .map((category) => ({
      category,
      count: markets.filter((market) => market.category === category).length,
    }))
    .filter((entry) => entry.count > 0);
}
