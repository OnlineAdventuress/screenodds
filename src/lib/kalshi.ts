const KALSHI_API_BASE = "https://external-api.kalshi.com/trade-api/v2";
const KALSHI_MARKET_BASE = "https://kalshi.com/markets";

export type KalshiSeries = {
  ticker: string;
  title: string;
  category: string;
  tags: string[];
  volume: number;
  volumeLabel: string;
  updatedAt: string | null;
  url: string;
};

export type KalshiMarket = {
  ticker: string;
  eventTicker: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  yesBid: number | null;
  yesAsk: number | null;
  lastPrice: number | null;
  volume: number;
  volume24h: number;
  liquidity: number;
  priceLabel: string;
  volumeLabel: string;
  rules: string | null;
  url: string;
};

type KalshiSeriesUrlOptions = {
  category?: string;
};

type KalshiMarketsUrlOptions = {
  seriesTicker?: string;
  limit?: number;
};

type KalshiFetchOptions = {
  fetcher?: KalshiFetch;
};

type KalshiFetch = (
  input: string | URL,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

type RawKalshiSeries = {
  ticker?: unknown;
  title?: unknown;
  category?: unknown;
  tags?: unknown;
  volume_fp?: unknown;
  last_updated_ts?: unknown;
};

type RawKalshiMarket = {
  ticker?: unknown;
  event_ticker?: unknown;
  title?: unknown;
  subtitle?: unknown;
  status?: unknown;
  yes_bid_dollars?: unknown;
  yes_ask_dollars?: unknown;
  last_price_dollars?: unknown;
  volume_fp?: unknown;
  volume_24h_fp?: unknown;
  liquidity_dollars?: unknown;
  rules_primary?: unknown;
};

export function buildKalshiSeriesUrl({
  category = "Entertainment",
}: KalshiSeriesUrlOptions = {}): URL {
  const url = new URL(`${KALSHI_API_BASE}/series`);
  url.searchParams.set("category", category);
  url.searchParams.set("include_volume", "true");
  return url;
}

export function buildKalshiMarketsUrl({
  seriesTicker,
  limit = 20,
}: KalshiMarketsUrlOptions = {}): URL {
  const url = new URL(`${KALSHI_API_BASE}/markets`);
  if (seriesTicker) {
    url.searchParams.set("series_ticker", seriesTicker);
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("mve_filter", "exclude");
  return url;
}

export async function fetchKalshiEntertainmentSeries({
  fetcher = fetch,
}: KalshiFetchOptions = {}): Promise<KalshiSeries[]> {
  const response = await fetcher(buildKalshiSeriesUrl({ category: "Entertainment" }), {
    headers: { accept: "application/json" },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return [];
  }

  return normalizeKalshiSeriesResponse(await response.json());
}

export async function fetchKalshiSeriesMarkets(
  seriesTicker: string,
  { fetcher = fetch }: KalshiFetchOptions = {},
): Promise<KalshiMarket[]> {
  const response = await fetcher(buildKalshiMarketsUrl({ seriesTicker, limit: 20 }), {
    headers: { accept: "application/json" },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return [];
  }

  return normalizeKalshiMarketsResponse(await response.json());
}

export function normalizeKalshiSeriesResponse(raw: unknown): KalshiSeries[] {
  const series = isRecord(raw) && Array.isArray(raw.series) ? raw.series : [];

  return series
    .map((item): KalshiSeries | null => {
      if (!isRecord(item)) {
        return null;
      }
      const rawSeries = item as RawKalshiSeries;
      const ticker = stringValue(rawSeries.ticker);
      const title = stringValue(rawSeries.title);
      const category = stringValue(rawSeries.category);
      if (!ticker || !title || !category) {
        return null;
      }

      const volume = fixedPointDollarValue(rawSeries.volume_fp);
      return {
        ticker,
        title,
        category,
        tags: Array.isArray(rawSeries.tags)
          ? rawSeries.tags.map(String).filter(Boolean)
          : [],
        volume,
        volumeLabel: `${formatCompactCurrency(volume)} volume`,
        updatedAt: stringValue(rawSeries.last_updated_ts) || null,
        url: `${KALSHI_MARKET_BASE}/${ticker}`,
      };
    })
    .filter((item): item is KalshiSeries => Boolean(item));
}

export function normalizeKalshiMarketsResponse(raw: unknown): KalshiMarket[] {
  const markets = isRecord(raw) && Array.isArray(raw.markets) ? raw.markets : [];

  return markets
    .map((item): KalshiMarket | null => {
      if (!isRecord(item)) {
        return null;
      }
      const rawMarket = item as RawKalshiMarket;
      const ticker = stringValue(rawMarket.ticker);
      const title = stringValue(rawMarket.title);
      if (!ticker || !title) {
        return null;
      }

      const yesBid = optionalNumber(rawMarket.yes_bid_dollars);
      const yesAsk = optionalNumber(rawMarket.yes_ask_dollars);
      const lastPrice = optionalNumber(rawMarket.last_price_dollars);
      const volume = fixedPointDollarValue(rawMarket.volume_fp);

      return {
        ticker,
        eventTicker: stringValue(rawMarket.event_ticker) || null,
        title,
        subtitle: stringValue(rawMarket.subtitle) || null,
        status: stringValue(rawMarket.status) || null,
        yesBid,
        yesAsk,
        lastPrice,
        volume,
        volume24h: fixedPointDollarValue(rawMarket.volume_24h_fp),
        liquidity: optionalNumber(rawMarket.liquidity_dollars) ?? 0,
        priceLabel: formatKalshiPriceLabel({ lastPrice, yesBid, yesAsk }),
        volumeLabel: `${formatCompactCurrency(volume)} volume`,
        rules: stringValue(rawMarket.rules_primary) || null,
        url: `${KALSHI_MARKET_BASE}/${ticker}`,
      };
    })
    .filter((item): item is KalshiMarket => Boolean(item));
}

function formatKalshiPriceLabel({
  lastPrice,
  yesBid,
  yesAsk,
}: {
  lastPrice: number | null;
  yesBid: number | null;
  yesAsk: number | null;
}): string {
  if (typeof lastPrice === "number") {
    return `Last ${formatProbability(lastPrice)}`;
  }
  if (typeof yesAsk === "number") {
    return `Best ask ${formatProbability(yesAsk)}`;
  }
  if (typeof yesBid === "number") {
    return `Best bid ${formatProbability(yesBid)}`;
  }
  return "No current price";
}

function formatProbability(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    style: "currency",
    currency: "USD",
  }).format(value);
}

function fixedPointDollarValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

function optionalNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
