import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./kie-image.mjs";

const KEYWORD_SUGGESTIONS_URL =
  "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live";
const KEYWORD_OVERVIEW_URL =
  "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live";

const checkedAt = new Date().toISOString().slice(0, 10);

const seedKeywords = [
  "polymarket",
  "polymarket oscars",
  "polymarket best picture",
  "polymarket box office",
  "polymarket movie",
  "polymarket awards",
  "polymarket tv",
  "polymarket reality tv",
  "pollymarket",
  "best picture odds",
  "oscar odds",
  "opening weekend odds",
  "highest grossing movie odds",
  "next james bond actor odds",
  "love island odds",
  "big brother odds",
  "survivor odds",
  "americas got talent odds",
  "i'm a celebrity odds",
  "emmy odds",
  "grammy odds",
  "tony awards odds",
];

const coveragePlan = [
  target("polymarket oscars", "Awards", "polymarket", "covered", "/blog/polymarket-oscars-odds", 98),
  target("best picture odds", "Awards", "awards", "covered", "/blog/best-picture-odds", 96),
  target("polymarket best picture", "Awards", "polymarket", "covered", "/markets/polymarket-oscars-best-picture", 92),
  target("polymarket box office", "Box Office", "polymarket", "covered", "/box-office", 90),
  target("highest grossing movie odds", "Box Office", "box-office", "covered", "/markets/highest-grossing-movie-in-2026", 88),
  target("opening weekend odds", "Box Office", "box-office", "planned", "/blog/opening-weekend-box-office-odds", 86),
  target("next james bond actor odds", "Movies", "movies", "covered", "/blog/next-james-bond-actor-odds", 84),
  target("polymarket movie", "Movies", "polymarket", "covered", "/movies", 82),
  target("polymarket tv", "TV & Streaming", "polymarket", "covered", "/tv", 78),
  target("polymarket netflix", "TV & Streaming", "polymarket", "planned", "/blog/netflix-prediction-market-odds", 76),
  target("love island odds", "Reality TV", "reality-tv", "covered", "/blog/love-island-odds", 74),
  target("big brother odds", "Reality TV", "reality-tv", "covered", "/blog/big-brother-odds", 72),
  target("polymarket reality tv", "Reality TV", "polymarket", "covered", "/reality-tv", 70),
  target("survivor odds", "Reality TV", "reality-tv", "planned", "/blog/survivor-odds", 68),
  target("americas got talent odds", "Reality TV", "reality-tv", "planned", "/blog/americas-got-talent-odds", 66),
  target("i'm a celebrity odds", "Reality TV", "reality-tv", "planned", "/blog/im-a-celebrity-odds", 64),
  target("best actor odds", "Awards", "awards", "planned", "/blog/best-actor-odds", 62),
  target("best actress odds", "Awards", "awards", "planned", "/blog/best-actress-odds", 60),
  target("best director odds", "Awards", "awards", "planned", "/blog/best-director-odds", 58),
  target("oscar nomination odds", "Awards", "awards", "planned", "/blog/oscar-nomination-odds", 56),
  target("emmy odds", "Awards", "awards", "planned", "/blog/emmy-awards-odds", 54),
  target("golden globes odds", "Awards", "awards", "planned", "/blog/golden-globes-odds", 52),
  target("grammy odds", "Awards", "awards", "planned", "/blog/grammy-awards-odds", 50),
  target("tony awards odds", "Awards", "awards", "planned", "/blog/tony-awards-odds", 48),
  target("pollymarket oscars", "Awards", "polymarket", "monitor", "/oscars", 20),
  target("pollymarket box office", "Box Office", "polymarket", "monitor", "/box-office", 18),
];

function target(keyword, category, cluster, status, targetUrl, priority) {
  return {
    keyword,
    category,
    cluster,
    status,
    targetUrl,
    priority,
  };
}

async function main() {
  const env = await loadEnv();
  const auth = buildAuthHeader(env);

  const suggestionsPayload = seedKeywords.map((keyword) => ({
    keyword,
    location_code: 2840,
    language_code: "en",
    include_seed_keyword: true,
    include_serp_info: false,
    limit: 50,
  }));

  const overviewPayload = [
    {
      keywords: [...new Set(coveragePlan.map((item) => item.keyword))],
      location_code: 2840,
      language_code: "en",
      include_serp_info: false,
      include_clickstream_data: false,
    },
  ];

  const [suggestionsResponse, overviewResponse] = await Promise.all([
    postDataForSeo(KEYWORD_SUGGESTIONS_URL, suggestionsPayload, auth),
    postDataForSeo(KEYWORD_OVERVIEW_URL, overviewPayload, auth),
  ]);

  const keywordMetrics = new Map();
  for (const item of extractKeywordItems(suggestionsResponse)) {
    keywordMetrics.set(item.keyword, item);
  }
  for (const item of extractKeywordItems(overviewResponse)) {
    keywordMetrics.set(item.keyword, item);
  }

  const coverage = coveragePlan.map((item) => {
    const metrics = keywordMetrics.get(item.keyword);

    return {
      ...item,
      searchVolume: metrics?.searchVolume ?? 0,
      keywordDifficulty: metrics?.keywordDifficulty ?? null,
      cpc: metrics?.cpc ?? null,
      intent: inferIntent(item.keyword, item.status),
      dataSource: "DataForSEO",
      checkedAt,
      notes: buildNotes(item, metrics),
    };
  });

  const entertainmentSuggestions = [...keywordMetrics.values()]
    .filter((item) => item.searchVolume > 0)
    .filter((item) => isEntertainmentKeyword(item.keyword))
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 200);

  const report = {
    checkedAt,
    locationCode: 2840,
    languageCode: "en",
    docs: [
      "https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_suggestions-live/",
      "https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_overview-live/",
    ],
    seedKeywords,
    coverage,
    allSuggestionCount: keywordMetrics.size,
    entertainmentSuggestions,
  };

  await writeJson("content/keyword-coverage.json", coverage);
  await writeJson(`reports/keyword-research/dataforseo-screenodds-${checkedAt}.json`, report);

  console.log(
    `Wrote ${coverage.length} coverage targets and ${entertainmentSuggestions.length} entertainment suggestions.`,
  );
}

function buildAuthHeader(env) {
  if (env.DATAFORSEO_BASE64) {
    return `Basic ${env.DATAFORSEO_BASE64}`;
  }
  if (env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD) {
    return `Basic ${Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString("base64")}`;
  }
  throw new Error("DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD or DATAFORSEO_BASE64 is required.");
}

async function postDataForSeo(url, payload, auth) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`DataForSEO returned non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!response.ok || json.status_code !== 20000) {
    throw new Error(`DataForSEO request failed: ${JSON.stringify(json).slice(0, 500)}`);
  }

  return json;
}

function extractKeywordItems(response) {
  const items = [];

  for (const task of response.tasks ?? []) {
    for (const result of task.result ?? []) {
      const seed = normalizeKeyword(result.seed_keyword_data?.[0] ?? result.keyword);
      if (seed) {
        items.push(normalizeMetricItem(seed));
      }

      for (const item of result.items ?? []) {
        const normalized = normalizeMetricItem(item);
        if (normalized.keyword) {
          items.push(normalized);
        }
      }
    }
  }

  return items;
}

function normalizeMetricItem(item) {
  const keyword = normalizeKeyword(item?.keyword);
  const keywordInfo = item?.keyword_info ?? {};
  const keywordProperties = item?.keyword_properties ?? {};

  return {
    keyword,
    searchVolume: keywordInfo.search_volume ?? 0,
    keywordDifficulty: keywordProperties.keyword_difficulty ?? null,
    cpc: keywordInfo.cpc ?? null,
  };
}

function normalizeKeyword(keyword) {
  return typeof keyword === "string" ? keyword.toLowerCase().trim() : "";
}

function inferIntent(keyword, status) {
  if (status === "monitor") {
    return "navigational";
  }
  if (keyword.includes("polymarket")) {
    return "mixed";
  }
  if (keyword.includes("odds")) {
    return "informational";
  }
  return "mixed";
}

function buildNotes(item, metrics) {
  if (item.status === "monitor") {
    return "Monitor typo demand only. Use correct Polymarket spelling in public copy unless search data proves a dedicated typo page is justified.";
  }
  if (!metrics) {
    if (item.status === "covered") {
      return "Covered by a ScreenOdds hub or market page; exact keyword was not returned by DataForSEO Keyword Overview in this refresh.";
    }
    return "Not returned by DataForSEO Keyword Overview; keep as planned until a refresh confirms search volume.";
  }
  if (item.status === "planned") {
    return "DataForSEO-tracked opportunity that should become an evergreen guide or dedicated hub module.";
  }
  return "Covered by an existing ScreenOdds page and should receive internal links from news and hubs.";
}

function isEntertainmentKeyword(keyword) {
  const terms = [
    "actor",
    "actress",
    "award",
    "best director",
    "best picture",
    "big brother",
    "box office",
    "celebrity",
    "emmy",
    "film",
    "golden globe",
    "grammy",
    "got talent",
    "highest grossing",
    "i'm a celebrity",
    "james bond",
    "love island",
    "movie",
    "netflix",
    "nomination",
    "opening weekend",
    "oscar",
    "reality",
    "streaming",
    "survivor",
    "tony",
    "tv",
  ];

  return terms.some((term) => keyword.includes(term));
}

async function writeJson(outPath, payload) {
  const resolved = resolve(outPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
