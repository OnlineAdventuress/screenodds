import type { MarketCategory } from "./markets";

export type NetworkDomain =
  | "odsage.com"
  | "riftodds.lol"
  | "gridodds.com"
  | "macroodds.com"
  | "geoodds.com"
  | "refstats.app";

export type NetworkSite = {
  domain: NetworkDomain;
  name: string;
  href: string;
  label: string;
  description: string;
  terms: string[];
  priority: number;
};

export type SiteNetworkContext = {
  pageType: "home" | "hub" | "market" | "article" | "news";
  category?: MarketCategory;
  tags?: string[];
  maxLinks?: number;
};

export type SiteNetworkLink = {
  domain: NetworkDomain;
  href: string;
  label: string;
  description: string;
};

export const ownedNetworkDomains: NetworkDomain[] = [
  "odsage.com",
  "riftodds.lol",
  "gridodds.com",
  "macroodds.com",
  "geoodds.com",
  "refstats.app",
];

const networkSites: NetworkSite[] = [
  {
    domain: "odsage.com",
    name: "Odsage",
    href: "https://odsage.com/",
    label: "Odsage prediction-market explainers",
    description:
      "Plain-English odds, probability, and prediction-market education for readers who want the mechanics behind the markets.",
    terms: [
      "odds",
      "prediction-markets",
      "market-education",
      "entertainment",
      "box-office",
      "awards",
      "reality-tv",
      "culture",
    ],
    priority: 90,
  },
  {
    domain: "riftodds.lol",
    name: "RiftOdds",
    href: "https://riftodds.lol/",
    label: "RiftOdds esports market research",
    description:
      "League of Legends, gaming, and esports market context for readers moving from screen entertainment into competitive gaming.",
    terms: ["esports", "gaming", "league of legends", "lol", "twitch", "culture"],
    priority: 50,
  },
  {
    domain: "gridodds.com",
    name: "GridOdds",
    href: "https://gridodds.com/",
    label: "GridOdds sports and schedule odds",
    description:
      "Sports, fixture, and schedule-driven odds research for readers comparing entertainment markets with live competition markets.",
    terms: ["sports", "football", "basketball", "schedule", "fixture", "competition"],
    priority: 55,
  },
  {
    domain: "macroodds.com",
    name: "MacroOdds",
    href: "https://macroodds.com/",
    label: "MacroOdds macro prediction markets",
    description:
      "Economic, political, and broad market signal coverage for stories where entertainment outcomes intersect with wider forecasts.",
    terms: ["macro", "economy", "finance", "politics", "forecast", "markets", "volume"],
    priority: 70,
  },
  {
    domain: "geoodds.com",
    name: "GeoOdds",
    href: "https://geoodds.com/",
    label: "GeoOdds country and geography markets",
    description:
      "Geography, country, geopolitical, and map-based odds research for location-driven prediction-market questions.",
    terms: ["geo", "geography", "country", "geopolitics", "map", "location", "region"],
    priority: 65,
  },
  {
    domain: "refstats.app",
    name: "RefStats",
    href: "https://refstats.app/",
    label: "RefStats source-backed data checks",
    description:
      "Reference statistics, source checks, and data-methodology support for box office, ratings, awards, and market research.",
    terms: [
      "data",
      "stats",
      "statistics",
      "sources",
      "methodology",
      "ratings",
      "tv-ratings",
      "box-office",
      "movie revenue",
      "revenue",
      "forecast",
      "awards",
    ],
    priority: 100,
  },
];

const categoryTerms = {
  Movies: ["movies", "entertainment", "odds", "prediction-markets", "data"],
  "Box Office": [
    "box-office",
    "movie revenue",
    "revenue",
    "data",
    "stats",
    "forecast",
    "odds",
    "prediction-markets",
    "macro",
  ],
  Awards: ["awards", "entertainment", "sources", "data", "odds", "prediction-markets"],
  "TV & Streaming": [
    "tv",
    "streaming",
    "ratings",
    "tv-ratings",
    "data",
    "odds",
    "prediction-markets",
  ],
  "Reality TV": [
    "reality-tv",
    "ratings",
    "tv-ratings",
    "data",
    "stats",
    "odds",
    "prediction-markets",
    "entertainment",
  ],
  Culture: ["culture", "entertainment", "prediction-markets", "data", "odds"],
} satisfies Record<MarketCategory, string[]>;

export function getAllNetworkSites(): NetworkSite[] {
  return [...networkSites];
}

export function getSiteNetworkLinks(context: SiteNetworkContext): SiteNetworkLink[] {
  const maxLinks = context.maxLinks ?? 3;
  const contextTerms = new Set(
    [
      ...(context.category ? categoryTerms[context.category] : []),
      ...(context.tags ?? []),
      context.pageType,
    ].map(normalizeTerm),
  );

  return networkSites
    .map((site) => ({
      site,
      score: site.terms.filter((term) => contextTerms.has(normalizeTerm(term))).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.site.priority - a.site.priority)
    .slice(0, maxLinks)
    .map(({ site }) => ({
      domain: site.domain,
      href: site.href,
      label: site.label,
      description: site.description,
    }));
}

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}
