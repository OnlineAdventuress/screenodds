import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./kie-image.mjs";

const JINA_SEARCH_BASE = "https://s.jina.ai";

const watchlist = [
  {
    category: "Awards",
    query: "Oscars Best Picture prediction market Polymarket awards news",
  },
  {
    category: "Box Office",
    query: "box office opening weekend prediction market Polymarket movie news",
  },
  {
    category: "Movies",
    query: "movie casting prediction market Polymarket film news",
  },
  {
    category: "TV & Streaming",
    query: "Netflix streaming prediction market Polymarket TV news",
  },
  {
    category: "Reality TV",
    query: "reality TV winner odds prediction market Big Brother Love Island Survivor news",
  },
];

export async function scanJinaNews({ limit = 5 } = {}) {
  const env = await loadEnv();
  if (!env.JINA_API_KEY) {
    throw new Error("JINA_API_KEY is not set in process env or Shared-Sync .env.");
  }

  const results = await Promise.all(
    watchlist.map((item) => scanWatchlistItem(item, env.JINA_API_KEY, limit)),
  );

  return {
    checkedAt: new Date().toISOString(),
    docs: ["https://jina.ai/en-US/reader/"],
    results,
  };
}

async function scanWatchlistItem(item, apiKey, limit) {
  try {
    const markdown = await jinaSearch(item.query, apiKey);
    const sources = parseJinaSearchResults(markdown).slice(0, limit);
    return {
      ...item,
      sourceConfidence: scoreSources(sources),
      sources,
    };
  } catch (error) {
    return {
      ...item,
      sourceConfidence: 0,
      sources: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const out =
    readArg("--out") ??
    `reports/news-research/jina-screenodds-${new Date().toISOString().slice(0, 10)}.json`;
  const scan = await scanJinaNews();

  await writeJson(out, scan);
  console.log(`Wrote Jina scan with ${scan.results.length} watchlist clusters to ${out}`);
}

async function jinaSearch(query, apiKey) {
  const url = `${JINA_SEARCH_BASE}/${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/plain",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Jina search failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return text;
}

export function parseJinaSearchResults(markdown) {
  const seen = new Set();
  const results = [];
  const blockPattern =
    /\[(\d+)\]\s*Title:\s*([^\n]+)\s*\n\[\1\]\s*URL Source:\s*(https?:\/\/[^\s\n]+)/g;
  let blockMatch;

  while ((blockMatch = blockPattern.exec(markdown)) !== null) {
    const title = cleanTitle(blockMatch[2]);
    const url = cleanUrl(blockMatch[3]);
    if (!title || !url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    results.push({
      title,
      url,
      publisher: inferPublisher(url),
      sourceType: inferSourceType(url),
    });
  }

  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(markdown)) !== null) {
    const title = cleanTitle(match[1]);
    const url = cleanUrl(match[2]);
    if (!title || !url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    results.push({
      title,
      url,
      publisher: inferPublisher(url),
      sourceType: inferSourceType(url),
    });
  }

  return results;
}

function scoreSources(sources) {
  if (sources.length === 0) {
    return 0;
  }

  const trusted = sources.filter((source) =>
    ["official", "trade-reporting", "box-office-data", "market-data"].includes(source.sourceType),
  ).length;

  return Math.min(1, 0.35 + trusted * 0.2 + Math.min(sources.length, 5) * 0.07);
}

function inferSourceType(url) {
  const hostname = safeHostname(url);
  if (
    [
      "polymarket.com",
      "gamma-api.polymarket.com",
      "www.oscars.org",
      "oscars.org",
      "www.emmys.com",
      "emmys.com",
      "www.the-numbers.com",
      "www.boxofficemojo.com",
    ].includes(hostname)
  ) {
    if (hostname.includes("polymarket")) {
      return "market-data";
    }
    if (hostname.includes("numbers") || hostname.includes("boxofficemojo")) {
      return "box-office-data";
    }
    return "official";
  }

  if (
    [
      "deadline.com",
      "variety.com",
      "www.hollywoodreporter.com",
      "www.thewrap.com",
      "www.indiewire.com",
    ].includes(hostname)
  ) {
    return "trade-reporting";
  }

  return "reference";
}

function inferPublisher(url) {
  const hostname = safeHostname(url).replace(/^www\./, "");
  if (!hostname) {
    return "Unknown";
  }

  return hostname
    .split(".")
    .slice(0, -1)
    .join(" ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function cleanTitle(title) {
  return title.replace(/\s+/g, " ").trim();
}

function cleanUrl(url) {
  return url.replace(/[)\].,]+$/g, "").trim();
}

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function writeJson(outPath, payload) {
  const resolved = resolve(outPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
