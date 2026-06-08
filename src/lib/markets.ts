export type MarketCategory =
  | "Movies"
  | "Box Office"
  | "Awards"
  | "TV & Streaming"
  | "Reality TV"
  | "Culture";

export type Market = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: MarketCategory;
  vertical: MarketCategory;
  tags: string[];
  probability: number;
  noProbability: number;
  volume1mo: number;
  volume24hr: number;
  volume1wk: number;
  liquidity: number;
  endDate: string | null;
  updatedAt: string;
  source: "polymarket" | "fallback";
};

export type RankedMarket = Market & {
  opportunityScore: number;
};

export type MarketSummary = {
  totalMarkets: number;
  totalVolume1mo: number;
  totalVolume24hr: number;
  totalVolume1wk: number;
  totalLiquidity: number;
  topMarket: Market | null;
  averageProbability: number;
};

export type MarketFilters = {
  category?: MarketCategory | "All";
  query?: string;
};

type GammaTag = {
  label?: string;
  slug?: string;
};

type GammaMarket = {
  outcomePrices?: string | string[];
};

export type GammaEvent = {
  id?: string | number;
  title?: string;
  slug?: string;
  description?: string;
  volume1mo?: string | number;
  volume24hr?: string | number;
  volume1wk?: string | number;
  liquidity?: string | number;
  endDate?: string | null;
  updatedAt?: string;
  tags?: GammaTag[];
  markets?: GammaMarket[];
};

export const categoryOrder: MarketCategory[] = [
  "Movies",
  "Box Office",
  "Awards",
  "TV & Streaming",
  "Reality TV",
  "Culture",
];

export function normalizeGammaEvent(event: GammaEvent): Market {
  const title = event.title ?? "Untitled entertainment market";
  const tags = (event.tags ?? [])
    .map((tag) => tag.label ?? tag.slug)
    .filter((tag): tag is string => Boolean(tag));
  const prices = parseList(event.markets?.[0]?.outcomePrices);
  const probability = clampProbability(Number(prices[0] ?? 0));

  return {
    id: String(event.id ?? event.slug ?? title),
    title,
    slug: slugify(event.slug ?? title),
    description: event.description ?? "",
    category: inferCategory(title, tags),
    vertical: inferCategory(title, tags),
    tags,
    probability,
    noProbability: clampProbability(Number(prices[1] ?? 1 - probability)),
    volume1mo: toNumber(event.volume1mo),
    volume24hr: toNumber(event.volume24hr),
    volume1wk: toNumber(event.volume1wk),
    liquidity: toNumber(event.liquidity),
    endDate: event.endDate ?? null,
    updatedAt: event.updatedAt ?? new Date(0).toISOString(),
    source: "polymarket",
  };
}

export function calculateMarketSummary(markets: Market[]): MarketSummary {
  const totalVolume1mo = sum(markets.map((market) => market.volume1mo));
  const totalVolume24hr = sum(markets.map((market) => market.volume24hr));
  const totalVolume1wk = sum(markets.map((market) => market.volume1wk));
  const totalLiquidity = sum(markets.map((market) => market.liquidity));
  const topMarket =
    [...markets].sort((a, b) => b.volume1mo - a.volume1mo)[0] ?? null;
  const averageProbability =
    markets.length === 0
      ? 0
      : sum(markets.map((market) => market.probability)) / markets.length;

  return {
    totalMarkets: markets.length,
    totalVolume1mo,
    totalVolume24hr,
    totalVolume1wk,
    totalLiquidity,
    topMarket,
    averageProbability,
  };
}

export function filterMarkets(markets: Market[], filters: MarketFilters): Market[] {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return markets.filter((market) => {
    const matchesCategory =
      !filters.category ||
      filters.category === "All" ||
      market.category === filters.category;
    const matchesQuery =
      query.length === 0 ||
      [market.title, market.description, market.slug, ...market.tags]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesCategory && matchesQuery;
  });
}

export function getMarketsByCategory(
  markets: Market[],
): Partial<Record<MarketCategory, Market[]>> {
  return categoryOrder.reduce<Partial<Record<MarketCategory, Market[]>>>(
    (grouped, category) => {
      const matches = markets.filter((market) => market.category === category);
      if (matches.length > 0) {
        grouped[category] = matches;
      }
      return grouped;
    },
    {},
  );
}

export function rankMarketsByOpportunity(markets: Market[]): RankedMarket[] {
  return markets
    .map((market) => ({
      ...market,
      opportunityScore: calculateOpportunityScore(market),
    }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatProbability(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function getMarketBySlug(markets: Market[], slug: string): Market | null {
  return markets.find((market) => market.slug === slug) ?? null;
}

function calculateOpportunityScore(market: Market): number {
  const volumeScore = Math.log10(market.volume1mo + 10) * 28;
  const liquidityScore = Math.log10(market.liquidity + 10) * 16;
  const probabilityTension = 1 - Math.abs(0.5 - market.probability) * 2;
  const categoryBoost = getCategoryBoost(market);
  const seoBoost = getSeoBoost(market);

  return Math.round(
    volumeScore + liquidityScore + probabilityTension * 24 + categoryBoost + seoBoost,
  );
}

function getCategoryBoost(market: Market): number {
  if (market.category === "Awards") {
    return 24;
  }
  if (market.category === "Reality TV" || market.category === "Box Office") {
    return 20;
  }
  if (market.category === "Movies" || market.category === "TV & Streaming") {
    return 16;
  }
  return 8;
}

function getSeoBoost(market: Market): number {
  const text = `${market.title} ${market.tags.join(" ")}`.toLowerCase();
  const terms = [
    "polymarket",
    "oscars",
    "best picture",
    "love island",
    "big brother",
    "james bond",
    "box office",
    "grammy",
    "tony awards",
  ];

  return terms.some((term) => text.includes(term)) ? 18 : 0;
}

function inferCategory(title: string, tags: string[]): MarketCategory {
  const haystack = `${title} ${tags.join(" ")}`.toLowerCase();

  if (haystack.includes("box office") || haystack.includes("opening weekend")) {
    return "Box Office";
  }
  if (
    haystack.includes("oscar") ||
    haystack.includes("academy awards") ||
    haystack.includes("grammy") ||
    haystack.includes("tony awards") ||
    haystack.includes("best picture") ||
    haystack.includes("awards")
  ) {
    return "Awards";
  }
  if (
    haystack.includes("reality tv") ||
    haystack.includes("love island") ||
    haystack.includes("big brother") ||
    haystack.includes("bachelorette") ||
    haystack.includes("top chef") ||
    haystack.includes("survivor")
  ) {
    return "Reality TV";
  }
  if (
    haystack.includes("netflix") ||
    haystack.includes("tv") ||
    haystack.includes("streaming") ||
    haystack.includes("stranger things")
  ) {
    return "TV & Streaming";
  }
  if (
    haystack.includes("movie") ||
    haystack.includes("film") ||
    haystack.includes("james bond")
  ) {
    return "Movies";
  }

  return "Culture";
}

function parseList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampProbability(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function toNumber(value: string | number | undefined): number {
  if (value === undefined || value === "") {
    return 0;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
