const PARLAY_API_BASE = "https://parlay-api.com/v1";

export type ParlaySource = "polymarket" | "kalshi" | "novig" | string;

export type ParlayPrices = {
  bestBid?: number;
  bestAsk?: number;
  yesBid?: number;
  yesAsk?: number;
  noBid?: number;
  noAsk?: number;
  last?: number;
  spread?: number;
  outcomes?: unknown[];
};

export type ParlayMarket = {
  source: ParlaySource;
  id: string;
  eventTitle: string;
  title: string;
  outcome: string | null;
  volume: number;
  matchConfidence: number;
  prices: ParlayPrices | null;
  url: string;
};

export type ParlaySearchResponse = {
  markets: ParlayMarket[];
  sourceSummary: Record<string, ParlaySourceSummary>;
};

export type ParlaySourceSummary = {
  count: number;
  maxVolume: number;
  topMatchConfidence: number;
};

export type ParlayMarketSummary = {
  totalMarkets: number;
  sourceCounts: Record<string, number>;
  topMarket: ParlayMarket | null;
};

type ParlaySearchUrlOptions = {
  query: string;
  sources?: ParlaySource[];
  minConfidence?: number;
  sort?: "match" | "volume";
  limit?: number;
};

type ParlayFetchOptions = ParlaySearchUrlOptions & {
  apiKey: string;
  fetcher?: ParlayFetch;
};

type ParlayFetch = (
  input: string | URL,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

type RawParlayMarket = {
  source?: unknown;
  market_id?: unknown;
  id?: unknown;
  event_title?: unknown;
  title?: unknown;
  outcome?: unknown;
  volume?: unknown;
  match_confidence?: unknown;
  confidence?: unknown;
  prices?: unknown;
  url?: unknown;
};

type RawParlayResponse = {
  markets?: unknown;
  source_summary?: unknown;
};

type RawParlaySourceSummary = {
  count?: unknown;
  max_volume?: unknown;
  top_match_confidence?: unknown;
};

export function buildParlayEventMarketsSearchUrl({
  query,
  sources = ["polymarket", "kalshi", "novig"],
  minConfidence = 0.1,
  sort = "match",
  limit,
}: ParlaySearchUrlOptions): URL {
  const url = new URL(`${PARLAY_API_BASE}/event-markets/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("sources", sources.join(","));
  url.searchParams.set("min_confidence", String(minConfidence));
  url.searchParams.set("sort", sort);
  if (typeof limit === "number") {
    url.searchParams.set("limit", String(limit));
  }
  return url;
}

export async function fetchParlayEventMarkets({
  apiKey,
  fetcher = fetch,
  ...urlOptions
}: ParlayFetchOptions): Promise<ParlaySearchResponse | null> {
  const response = await fetcher(buildParlayEventMarketsSearchUrl(urlOptions), {
    headers: {
      accept: "application/json",
      "X-API-Key": apiKey,
    },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return null;
  }

  return normalizeParlaySearchResponse(await response.json());
}

export function normalizeParlaySearchResponse(raw: unknown): ParlaySearchResponse {
  const response = isRecord(raw) ? (raw as RawParlayResponse) : {};
  const markets = Array.isArray(response.markets)
    ? response.markets.map(normalizeParlayMarket).filter((market): market is ParlayMarket => Boolean(market))
    : [];
  const sourceSummary = normalizeSourceSummary(response.source_summary);

  return { markets, sourceSummary };
}

export function summarizeParlayMarkets(markets: ParlayMarket[]): ParlayMarketSummary {
  const sourceCounts = markets.reduce<Record<string, number>>((counts, market) => {
    counts[market.source] = (counts[market.source] ?? 0) + 1;
    return counts;
  }, {});
  const topMarket =
    [...markets].sort((a, b) => b.volume - a.volume || b.matchConfidence - a.matchConfidence)[0] ??
    null;

  return {
    totalMarkets: markets.length,
    sourceCounts,
    topMarket,
  };
}

function normalizeParlayMarket(raw: unknown): ParlayMarket | null {
  if (!isRecord(raw)) {
    return null;
  }

  const market = raw as RawParlayMarket;
  const id = stringValue(market.market_id ?? market.id);
  const source = stringValue(market.source);
  const title = stringValue(market.title);
  const eventTitle = stringValue(market.event_title) || title;
  const url = stringValue(market.url);

  if (!id || !source || !eventTitle || !url) {
    return null;
  }

  return {
    source,
    id,
    eventTitle,
    title,
    outcome: stringValue(market.outcome) || null,
    volume: numberValue(market.volume),
    matchConfidence: numberValue(market.match_confidence ?? market.confidence),
    prices: normalizePrices(market.prices),
    url,
  };
}

function normalizeSourceSummary(raw: unknown): Record<string, ParlaySourceSummary> {
  if (!isRecord(raw)) {
    return {};
  }

  return Object.entries(raw).reduce<Record<string, ParlaySourceSummary>>((summary, [source, value]) => {
    if (!isRecord(value)) {
      return summary;
    }
    const item = value as RawParlaySourceSummary;
    summary[source] = {
      count: numberValue(item.count),
      maxVolume: numberValue(item.max_volume),
      topMatchConfidence: numberValue(item.top_match_confidence),
    };
    return summary;
  }, {});
}

function normalizePrices(raw: unknown): ParlayPrices | null {
  if (!isRecord(raw)) {
    return null;
  }

  const prices = raw as Record<string, unknown>;
  return {
    bestBid: optionalNumber(prices.best_bid),
    bestAsk: optionalNumber(prices.best_ask),
    yesBid: optionalNumber(prices.yes_bid),
    yesAsk: optionalNumber(prices.yes_ask),
    noBid: optionalNumber(prices.no_bid),
    noAsk: optionalNumber(prices.no_ask),
    last: optionalNumber(prices.last),
    spread: optionalNumber(prices.spread),
    outcomes: Array.isArray(prices.outcomes) ? prices.outcomes : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
