import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const XAI_API_BASE = "https://api.x.ai/v1";
const REPORT_DIR = path.resolve("reports", "social-sentiment");

const scanTargets = [
  {
    marketSlug: "love-island-odds",
    query: "Love Island Polymarket",
    kalshiSeriesHint: "KXLIUSAELIMINATION",
    outcomePrompt:
      "whether public discussion supports the active Love Island winner market moving higher",
    fallbackSummary:
      "Dry run snapshot for Love Island prediction-market sentiment. Run without --dry-run to refresh xAI X Search and Kalshi context.",
  },
  {
    marketSlug: "polymarket-oscars-best-picture",
    query: "Polymarket Oscars Best Picture Kalshi",
    kalshiSeriesHint: "KXOSCARPIC",
    outcomePrompt:
      "whether public discussion supports the active Best Picture market moving higher",
    fallbackSummary:
      "Dry run snapshot for Oscars Best Picture sentiment. Run without --dry-run to refresh awards-market chatter and Kalshi Oscars context.",
  },
  {
    marketSlug: "highest-grossing-movie-in-2026",
    query: "highest grossing movie Polymarket Kalshi",
    kalshiSeriesHint: "KXNETFLIXRANKMOVIE",
    outcomePrompt:
      "whether public discussion supports the active highest-grossing movie market moving higher",
    fallbackSummary:
      "Dry run snapshot for highest-grossing movie market sentiment. Run without --dry-run to refresh movie chart and comparison-market context.",
  },
];

export function getScanTargets() {
  return scanTargets.map((target) => ({ ...target }));
}

export function parseArgs(args) {
  const parsed = {
    all: false,
    dryRun: false,
    marketSlug: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--all") {
      parsed.all = true;
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--market") {
      parsed.marketSlug = args[index + 1] ?? null;
      index += 1;
    }
  }

  return parsed;
}

export function parseEnvText(text) {
  return text.split(/\r?\n/).reduce((env, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      return env;
    }
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      return env;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = stripEnvQuotes(line.slice(equalsIndex + 1).trim());
    env[key] = value;
    return env;
  }, {});
}

export function buildDryRunSnapshot(target, { now = new Date() } = {}) {
  return {
    marketSlug: target.marketSlug,
    query: target.query,
    checkedAt: now.toISOString(),
    windowDays: 30,
    sentimentLabel: "neutral",
    summary: `${target.fallbackSummary} Dry run output is deterministic and does not call xAI.`,
    topNarratives: [
      "Dry run mode verifies configuration and output shape.",
      "Live scans should be reviewed before publishing snapshots.",
      "ScreenOdds treats sentiment as context, not advice.",
    ],
    sourceCounts: {
      x: 0,
      reddit: 0,
      polymarket: 0,
      kalshi: 0,
    },
    citedPosts: [],
    relatedMarkets: [],
    scoredItems: buildDryRunScoredItems(target, { now }),
    confidence: "fallback",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = selectTargets(args);
  const env = await loadEnv();

  if (!args.dryRun && !env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is required for live sentiment scans");
  }

  for (const target of targets) {
    const snapshot = args.dryRun
      ? buildDryRunSnapshot(target)
      : await buildLiveSnapshot(target, env);

    if (args.dryRun) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      await writeSnapshot(target.marketSlug, snapshot);
      console.log(`Wrote sentiment snapshot: ${path.join(REPORT_DIR, `${target.marketSlug}.json`)}`);
    }
  }
}

function selectTargets(args) {
  if (args.all) {
    return getScanTargets();
  }

  const marketSlug = args.marketSlug ?? "love-island-odds";
  const target = getScanTargets().find((item) => item.marketSlug === marketSlug);
  if (!target) {
    throw new Error(`Unknown sentiment target: ${marketSlug}`);
  }
  return [target];
}

async function buildLiveSnapshot(target, env) {
  const now = new Date();
  const [xSummary, kalshiMarkets] = await Promise.all([
    fetchXaiSentimentSummary(target, env),
    fetchKalshiRelatedMarkets(target),
  ]);

  return {
    marketSlug: target.marketSlug,
    query: target.query,
    checkedAt: now.toISOString(),
    windowDays: 30,
    sentimentLabel: xSummary.sentimentLabel,
    summary: xSummary.summary,
    topNarratives: xSummary.topNarratives,
    sourceCounts: {
      x: xSummary.citedPosts.length,
      reddit: 0,
      polymarket: countPolymarketMentions(xSummary),
      kalshi: kalshiMarkets.length,
    },
    citedPosts: xSummary.citedPosts,
    relatedMarkets: kalshiMarkets,
    scoredItems: xSummary.scoredItems,
    confidence: "live",
  };
}

async function fetchXaiSentimentSummary(target, env) {
  const response = await fetch(`${XAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.XAI_MODEL || "grok-4-1-fast-non-reasoning",
      messages: [
        {
          role: "system",
          content:
            "Return compact JSON only. Do not include API keys. Summarize recent public X posts as entertainment-market sentiment context, not advice.",
        },
        {
          role: "user",
          content: `Search X for the last 30 days for: ${target.query}. Return JSON with sentimentLabel, summary, topNarratives, citedPosts, and scoredItems. citedPosts must include source, author, url, date, engagementLabel, and text. scoredItems must include source, url, author, text, publishedAt, engagement, relevance, stance, and confidence. Score stance for this outcome only: ${target.outcomePrompt}. Stance is not generic tone: -1 strongly implies NO/lower, +1 strongly implies YES/higher, 0 neutral.`,
        },
      ],
      tools: [
        {
          type: "x_search",
          x_search_parameters: {
            query: target.query,
            limit: 10,
            mode: "on",
          },
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI sentiment scan failed with HTTP ${response.status}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  return normalizeXaiSummary(content);
}

function normalizeXaiSummary(content) {
  const parsed = parseJsonFromText(content);
  const citedPosts = Array.isArray(parsed.citedPosts)
    ? parsed.citedPosts
        .map((post) => ({
          source: "x",
          author: stringValue(post.author).replace(/^@/, ""),
          url: safeHttpsUrl(post.url),
          date: stringValue(post.date),
          engagementLabel: stringValue(post.engagementLabel),
          text: stringValue(post.text).slice(0, 240),
        }))
        .filter((post) => post.author && post.url && post.date && post.text)
        .slice(0, 3)
    : [];

  return {
    sentimentLabel: normalizeSentimentLabel(parsed.sentimentLabel),
    summary: stringValue(parsed.summary) || "xAI returned no summary for this scan.",
    topNarratives: Array.isArray(parsed.topNarratives)
      ? parsed.topNarratives.map(stringValue).filter(Boolean).slice(0, 5)
      : ["No dominant X narrative was returned."],
    citedPosts,
    scoredItems: normalizeScoredItems(parsed.scoredItems, citedPosts),
  };
}

function buildDryRunScoredItems(target, { now }) {
  const dayMs = 24 * 60 * 60 * 1000;
  const rows = [
    {
      source: "x",
      daysAgo: 1,
      engagement: 14,
      relevance: 0.75,
      stance: 0.22,
      confidence: 0.65,
      text: `${target.query} dry-run item: public discussion is directionally relevant but not decisive.`,
    },
    {
      source: "web",
      daysAgo: 4,
      engagement: 6,
      relevance: 0.68,
      stance: 0.12,
      confidence: 0.58,
      text: `${target.query} dry-run item: coverage adds context without confirming a market edge.`,
    },
    {
      source: "reddit",
      daysAgo: 9,
      engagement: 22,
      relevance: 0.61,
      stance: -0.04,
      confidence: 0.52,
      text: `${target.query} dry-run item: discussion is mixed and should remain low confidence.`,
    },
  ];

  return rows.map((row) => ({
    source: row.source,
    text: row.text,
    publishedAt: new Date(now.getTime() - row.daysAgo * dayMs).toISOString(),
    engagement: row.engagement,
    relevance: row.relevance,
    stance: row.stance,
    confidence: row.confidence,
  }));
}

function normalizeScoredItems(value, citedPosts) {
  const scoredItems = Array.isArray(value)
    ? value.map(normalizeScoredItem).filter(Boolean).slice(0, 25)
    : [];

  if (scoredItems.length > 0) {
    return scoredItems;
  }

  return citedPosts
    .map((post) =>
      normalizeScoredItem({
        source: post.source,
        author: post.author,
        url: post.url,
        text: post.text,
        publishedAt: post.date,
        engagement: parseEngagement(post.engagementLabel),
        relevance: 0.65,
        stance: 0.08,
        confidence: 0.45,
      }),
    )
    .filter(Boolean)
    .slice(0, 10);
}

function normalizeScoredItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const source = normalizeScoredItemSource(item.source);
  const text = stringValue(item.text).slice(0, 280);
  const publishedAt = normalizeDate(item.publishedAt);
  const url = item.url === undefined ? undefined : safeHttpsUrl(item.url);
  const relevance = unitNumber(item.relevance);
  const stance = boundedNumber(item.stance, -1, 1);
  const confidence = unitNumber(item.confidence);

  if (!source || !text || !publishedAt || relevance === null || stance === null || confidence === null) {
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
    engagement: optionalPositiveNumber(item.engagement) ?? 0,
    relevance,
    stance,
    confidence,
  };
}

async function fetchKalshiRelatedMarkets(target) {
  const url = new URL("https://external-api.kalshi.com/trade-api/v2/markets");
  url.searchParams.set("series_ticker", target.kalshiSeriesHint);
  url.searchParams.set("limit", "8");
  url.searchParams.set("mve_filter", "exclude");

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    return [];
  }

  const json = await response.json();
  const markets = Array.isArray(json.markets) ? json.markets : [];

  return markets
    .map((market) => {
      const ticker = stringValue(market.ticker);
      const title = stringValue(market.title);
      if (!ticker || !title) {
        return null;
      }

      const last = optionalNumber(market.last_price_dollars);
      const ask = optionalNumber(market.yes_ask_dollars);
      return {
        source: "kalshi",
        title,
        url: `https://kalshi.com/markets/${ticker}`,
        priceLabel:
          typeof last === "number"
            ? `Last ${formatProbability(last)}`
            : typeof ask === "number"
              ? `Best ask ${formatProbability(ask)}`
              : "No current price",
        volumeLabel: `${formatCompactCurrency(fixedPointDollarValue(market.volume_fp))} volume`,
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function countPolymarketMentions(summary) {
  const text = [summary.summary, ...summary.topNarratives, ...summary.citedPosts.map((post) => post.text)]
    .join(" ")
    .toLowerCase();
  return text.includes("polymarket") ? 1 : 0;
}

async function loadEnv() {
  const envPath = path.join(homedir(), "Desktop", "Shared-Sync", ".env");
  const sharedEnv = existsSync(envPath) ? parseEnvText(await readFile(envPath, "utf8")) : {};
  return { ...sharedEnv, ...process.env };
}

async function writeSnapshot(marketSlug, snapshot) {
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(
    path.join(REPORT_DIR, `${marketSlug}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
}

function parseJsonFromText(value) {
  if (typeof value !== "string") {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return {};
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function normalizeSentimentLabel(value) {
  return ["positive", "mixed", "negative", "neutral"].includes(value)
    ? value
    : "neutral";
}

function normalizeScoredItemSource(value) {
  return ["x", "reddit", "tiktok", "web", "news", "polymarket"].includes(value)
    ? value
    : null;
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function safeHttpsUrl(value) {
  const candidate = stringValue(value);
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeDate(value) {
  const candidate = stringValue(value);
  if (!candidate) {
    return "";
  }
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function parseEngagement(value) {
  const match = stringValue(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatProbability(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "USD",
  }).format(value);
}

function fixedPointDollarValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

function optionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function unitNumber(value) {
  return boundedNumber(value, 0, 1);
}

function boundedNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(max, Math.max(min, parsed));
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
