import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizePublishedAt } from "./last30days";
import type { ScoredSentimentItem, SentimentItemSource } from "./sentiment-signal";

export type SentimentLabel = "positive" | "mixed" | "negative" | "neutral";

export type SentimentConfidence = "live" | "fallback";

export type SentimentSourceCounts = {
  x: number;
  reddit: number;
  polymarket: number;
  kalshi: number;
};

export type CitedSentimentPost = {
  source: "x" | "reddit" | "tiktok" | "web";
  author: string;
  url: string;
  date: string;
  engagementLabel: string;
  text: string;
};

export type RelatedSentimentMarket = {
  source: "polymarket" | "kalshi" | "parlay";
  title: string;
  url: string;
  priceLabel: string;
  volumeLabel: string;
};

export type SentimentPulse = {
  marketSlug: string;
  query: string;
  checkedAt: string;
  windowDays: number;
  sentimentLabel: SentimentLabel;
  summary: string;
  topNarratives: string[];
  sourceCounts: SentimentSourceCounts;
  citedPosts: CitedSentimentPost[];
  relatedMarkets: RelatedSentimentMarket[];
  scoredItems: ScoredSentimentItem[];
  confidence: SentimentConfidence;
};

export type SentimentTopic = {
  marketSlug: string;
  query: string;
  fallbackSummary: string;
  fallbackNarratives: string[];
};

type SentimentOptions = {
  baseDir?: string;
};

const defaultSourceCounts: SentimentSourceCounts = {
  x: 0,
  reddit: 0,
  polymarket: 0,
  kalshi: 0,
};

export const sentimentTopics: SentimentTopic[] = [
  {
    marketSlug: "love-island-odds",
    query: "Love Island Polymarket",
    fallbackSummary:
      "ScreenOdds has not found a fresh cached sentiment scan for this Love Island market yet. Treat social discussion as unverified context until the next xAI scan runs.",
    fallbackNarratives: [
      "Episode edits and public voting windows can change reality TV market discussion quickly.",
      "Polymarket and Kalshi activity should be checked beside official show outcomes.",
      "Thin market liquidity can make social chatter look more important than it is.",
    ],
  },
  {
    marketSlug: "polymarket-oscars-best-picture",
    query: "Polymarket Oscars Best Picture Kalshi",
    fallbackSummary:
      "ScreenOdds has not found a fresh cached sentiment scan for this Best Picture market yet. Awards chatter should be read beside festival, guild, critic, and market-liquidity signals.",
    fallbackNarratives: [
      "Best Picture narratives often move around festival reactions and guild overlap.",
      "Kalshi and Polymarket can list adjacent Oscars markets with different liquidity.",
      "Social confidence is weaker before nominations narrow the field.",
    ],
  },
  {
    marketSlug: "highest-grossing-movie-in-2026",
    query: "highest grossing movie Polymarket Kalshi",
    fallbackSummary:
      "ScreenOdds has not found a fresh cached sentiment scan for this box office market yet. Movie-chart sentiment should be paired with release calendars, franchise comps, and verified gross data.",
    fallbackNarratives: [
      "Highest-grossing movie markets depend on the full release slate, not one trailer reaction.",
      "Social buzz can identify attention spikes, but box office data confirms durability.",
      "Comparable franchise openings are usually stronger signals than isolated viral posts.",
    ],
  },
];

export async function getSentimentPulseForMarket(
  marketSlug: string,
  options: SentimentOptions = {},
): Promise<SentimentPulse> {
  const baseDir = options.baseDir ?? path.join(process.cwd(), "reports", "social-sentiment");
  const snapshotPath = path.join(baseDir, `${marketSlug}.json`);

  try {
    const raw = await readFile(snapshotPath, "utf8");
    return normalizeSentimentSnapshot(JSON.parse(raw)) ?? getFallbackSentimentPulse(marketSlug);
  } catch {
    return getFallbackSentimentPulse(marketSlug);
  }
}

export function getSentimentTopicForMarket(marketSlug: string): SentimentTopic | null {
  return sentimentTopics.find((topic) => topic.marketSlug === marketSlug) ?? null;
}

export function getFallbackSentimentPulse(marketSlug: string): SentimentPulse {
  const topic = getSentimentTopicForMarket(marketSlug);
  const checkedAt = new Date(0).toISOString();

  return {
    marketSlug,
    query: topic?.query ?? marketSlug.replace(/-/g, " "),
    checkedAt,
    windowDays: 30,
    sentimentLabel: "neutral",
    summary:
      topic?.fallbackSummary ??
      "ScreenOdds has not configured a cached sentiment scan for this market yet. Use the market price, liquidity, and source rules as the primary context.",
    topNarratives:
      topic?.fallbackNarratives ??
      [
        "No cached social scan is available for this market.",
        "Market liquidity and official resolution rules remain the primary checks.",
      ],
    sourceCounts: { ...defaultSourceCounts },
    citedPosts: [],
    relatedMarkets: [],
    scoredItems: [],
    confidence: "fallback",
  };
}

export function normalizeSentimentSnapshot(raw: unknown): SentimentPulse | null {
  if (!isRecord(raw)) {
    return null;
  }

  const marketSlug = stringValue(raw.marketSlug);
  const query = stringValue(raw.query);
  const checkedAt = stringValue(raw.checkedAt);
  const summary = stringValue(raw.summary);

  if (!marketSlug || !query || !checkedAt || !summary) {
    return null;
  }

  return {
    marketSlug,
    query,
    checkedAt,
    windowDays: positiveNumber(raw.windowDays) ?? 30,
    sentimentLabel: normalizeSentimentLabel(raw.sentimentLabel),
    summary,
    topNarratives: normalizeNarratives(raw.topNarratives),
    sourceCounts: normalizeSourceCounts(raw.sourceCounts),
    citedPosts: normalizeCitedPosts(raw.citedPosts),
    relatedMarkets: normalizeRelatedMarkets(raw.relatedMarkets),
    scoredItems: normalizeScoredItems(raw.scoredItems),
    confidence: raw.confidence === "live" ? "live" : "fallback",
  };
}

function normalizeSentimentLabel(value: unknown): SentimentLabel {
  return value === "positive" ||
    value === "mixed" ||
    value === "negative" ||
    value === "neutral"
    ? value
    : "neutral";
}

function normalizeNarratives(value: unknown): string[] {
  const narratives = Array.isArray(value)
    ? value.map(stringValue).filter(Boolean).slice(0, 5)
    : [];

  return narratives.length > 0 ? narratives : ["No dominant narrative has been cached yet."];
}

function normalizeSourceCounts(value: unknown): SentimentSourceCounts {
  if (!isRecord(value)) {
    return { ...defaultSourceCounts };
  }

  return {
    x: positiveNumber(value.x) ?? 0,
    reddit: positiveNumber(value.reddit) ?? 0,
    polymarket: positiveNumber(value.polymarket) ?? 0,
    kalshi: positiveNumber(value.kalshi) ?? 0,
  };
}

function normalizeCitedPosts(value: unknown): CitedSentimentPost[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): CitedSentimentPost | null => {
      if (!isRecord(item)) {
        return null;
      }
      const source = normalizePostSource(item.source);
      const author = stringValue(item.author);
      const url = safeHttpsUrl(item.url);
      const date = stringValue(item.date);
      const engagementLabel = stringValue(item.engagementLabel);
      const text = stringValue(item.text);

      if (!source || !author || !url || !date || !text) {
        return null;
      }

      return {
        source,
        author,
        url,
        date,
        engagementLabel,
        text,
      };
    })
    .filter((item): item is CitedSentimentPost => Boolean(item))
    .slice(0, 3);
}

function normalizeRelatedMarkets(value: unknown): RelatedSentimentMarket[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): RelatedSentimentMarket | null => {
      if (!isRecord(item)) {
        return null;
      }
      const source = normalizeMarketSource(item.source);
      const title = stringValue(item.title);
      const url = safeHttpsUrl(item.url);
      const priceLabel = stringValue(item.priceLabel);
      const volumeLabel = stringValue(item.volumeLabel);

      if (!source || !title || !url) {
        return null;
      }

      return {
        source,
        title,
        url,
        priceLabel,
        volumeLabel,
      };
    })
    .filter((item): item is RelatedSentimentMarket => Boolean(item))
    .slice(0, 4);
}

function normalizeScoredItems(value: unknown): ScoredSentimentItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ScoredSentimentItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      const source = normalizeScoredItemSource(item.source);
      const text = stringValue(item.text);
      const publishedAt = normalizePublishedAt(item.publishedAt);
      const relevance = unitNumber(item.relevance);
      const stance = boundedNumber(item.stance, -1, 1);
      const confidence = unitNumber(item.confidence);
      const url = item.url === undefined ? undefined : safeHttpsUrl(item.url);

      if (
        !source ||
        !text ||
        !publishedAt ||
        relevance === null ||
        stance === null ||
        confidence === null
      ) {
        return null;
      }

      if (item.url !== undefined && !url) {
        return null;
      }

      return {
        source,
        url,
        author: stringValue(item.author) || undefined,
        text,
        publishedAt,
        engagement: positiveNumber(item.engagement) ?? 0,
        relevance,
        stance,
        confidence,
      };
    })
    .filter((item): item is ScoredSentimentItem => Boolean(item))
    .slice(0, 50);
}

function normalizePostSource(value: unknown): CitedSentimentPost["source"] | null {
  return value === "x" || value === "reddit" || value === "tiktok" || value === "web"
    ? value
    : null;
}

function normalizeMarketSource(value: unknown): RelatedSentimentMarket["source"] | null {
  return value === "polymarket" || value === "kalshi" || value === "parlay"
    ? value
    : null;
}

function normalizeScoredItemSource(value: unknown): SentimentItemSource | null {
  return value === "x" ||
    value === "reddit" ||
    value === "tiktok" ||
    value === "web" ||
    value === "news" ||
    value === "polymarket"
    ? value
    : null;
}

function safeHttpsUrl(value: unknown): string {
  const candidate = stringValue(value);
  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function unitNumber(value: unknown): number | null {
  return boundedNumber(value, 0, 1);
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Math.min(max, Math.max(min, number));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
