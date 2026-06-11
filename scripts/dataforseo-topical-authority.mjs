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
  "polymarket oscars",
  "polymarket best picture",
  "polymarket box office",
  "polymarket movies",
  "polymarket movie markets",
  "polymarket awards",
  "polymarket grammys",
  "polymarket emmys",
  "polymarket golden globes",
  "polymarket tv",
  "polymarket netflix",
  "polymarket reality tv",
  "polymarket love island",
  "polymarket big brother",
  "polymarket survivor",
  "pollymarket oscars",
  "pollymarket box office",
  "best picture odds",
  "oscars odds",
  "academy awards odds",
  "best actor odds",
  "best actress odds",
  "best director odds",
  "oscar nomination odds",
  "emmy odds",
  "golden globes odds",
  "grammy odds",
  "tony awards odds",
  "bafta odds",
  "sag awards odds",
  "box office odds",
  "opening weekend odds",
  "movie box office predictions",
  "weekend box office predictions",
  "highest grossing movie odds",
  "box office prediction market",
  "movie prediction market",
  "next james bond actor odds",
  "james bond odds",
  "netflix odds",
  "top netflix odds",
  "streaming odds",
  "love island odds",
  "big brother odds",
  "survivor odds",
  "americas got talent odds",
  "america's got talent odds",
  "the voice odds",
  "dancing with the stars odds",
  "bachelor odds",
  "bachelorette odds",
  "the traitors odds",
  "masterchef odds",
  "britains got talent odds",
  "i'm a celebrity odds",
  "reality tv odds",
  "tv betting odds",
];

const existingTargets = new Map([
  ["polymarket oscars", "/blog/polymarket-oscars-odds"],
  ["best picture odds", "/blog/best-picture-odds"],
  ["polymarket best picture", "/markets/polymarket-oscars-best-picture"],
  ["polymarket box office", "/box-office"],
  ["highest grossing movie odds", "/markets/highest-grossing-movie-in-2026"],
  ["next james bond actor odds", "/blog/next-james-bond-actor-odds"],
  ["love island odds", "/blog/love-island-odds"],
  ["big brother odds", "/blog/big-brother-odds"],
  ["polymarket reality tv", "/reality-tv"],
  ["polymarket netflix", "/tv"],
]);

async function main() {
  const env = await loadEnv();
  const auth = buildAuthHeader(env);
  const suggestions = await fetchKeywordSuggestions(auth);
  const overview = await fetchKeywordOverview(auth, seedKeywords);
  const mergedMetrics = [...suggestions, ...overview];
  const candidates = [...new Map(mergedMetrics.map((item) => [item.keyword, item])).values()]
    .filter((item) => item.keyword && item.searchVolume > 0)
    .filter((item) => isRelevantKeyword(item.keyword))
    .map(scoreCandidate)
    .sort((a, b) => b.rankabilityScore - a.rankabilityScore || b.searchVolume - a.searchVolume);

  const clusters = buildClusters(candidates);
  const quickWins = candidates
    .filter((item) => item.action === "build" || item.action === "strengthen")
    .slice(0, 50);
  const report = {
    checkedAt,
    locationCode: 2840,
    languageCode: "en",
    seedKeywords,
    totalCandidates: candidates.length,
    quickWins,
    clusters,
    competitorsSeenInSerpSpotChecks: [
      "DeFi Rate and Oddpool have current Oscars/prediction-market pages.",
      "PolymarketAnalytics and PolyInsider appear for market-specific Polymarket box office pages.",
      "Sportsbook and betting affiliates appear in reality TV odds SERPs, so ScreenOdds should keep an informational prediction-market angle.",
    ],
    notes: [
      "Avoid generic 'movie odds' targeting because prior project research found it polluted by the film title Against All Odds.",
      "Prioritize low-KD Polymarket + awards/reality terms before broader sportsbook-intent keywords.",
      "Box office search volume is thinner by exact keyword, but market-specific pages can rank because SERPs are sparse and topical freshness matters.",
    ],
  };

  await writeJson(`reports/keyword-research/topical-authority-screenodds-${checkedAt}.json`, report);
  await writeMarkdown(
    `reports/keyword-research/topical-authority-screenodds-${checkedAt}.md`,
    buildMarkdownReport(report),
  );

  console.log(
    `Wrote ${quickWins.length} prioritized keyword opportunities across ${clusters.length} clusters.`,
  );
}

async function fetchKeywordSuggestions(auth) {
  const payload = seedKeywords.map((keyword) => ({
    keyword,
    location_code: 2840,
    language_code: "en",
    include_seed_keyword: true,
    include_serp_info: false,
    limit: 100,
  }));

  const response = await postDataForSeo(KEYWORD_SUGGESTIONS_URL, payload, auth);
  return extractKeywordItems(response);
}

async function fetchKeywordOverview(auth, keywords) {
  const payload = [
    {
      keywords: [...new Set(keywords.map(normalizeKeyword))],
      location_code: 2840,
      language_code: "en",
      include_serp_info: false,
      include_clickstream_data: false,
    },
  ];

  const response = await postDataForSeo(KEYWORD_OVERVIEW_URL, payload, auth);
  return extractKeywordItems(response);
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
      const seed = normalizeMetricItem(result.seed_keyword_data?.[0] ?? result);
      if (seed.keyword) {
        items.push(seed);
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

function scoreCandidate(item) {
  const cluster = inferCluster(item.keyword);
  const action = inferAction(item.keyword);
  const targetUrl = existingTargets.get(item.keyword) ?? plannedUrl(item.keyword, cluster);
  const kd = item.keywordDifficulty;
  const lowDifficultyBoost = kd === null ? 8 : Math.max(0, 35 - kd);
  const volumeScore = Math.min(45, Math.log10(item.searchVolume + 10) * 16);
  const specificityBoost = hasSpecificIntent(item.keyword) ? 18 : 4;
  const polymarketBoost = item.keyword.includes("polymarket") ? 14 : 0;
  const riskPenalty = action === "avoid" ? 80 : action === "monitor" ? 18 : 0;
  const rankabilityScore = Math.round(
    volumeScore + lowDifficultyBoost + specificityBoost + polymarketBoost - riskPenalty,
  );

  return {
    ...item,
    cluster,
    action,
    targetUrl,
    pageType: inferPageType(item.keyword, action),
    rankabilityScore,
    rationale: buildRationale(item.keyword, cluster, action, kd),
  };
}

function buildClusters(candidates) {
  return ["Awards", "Box Office", "Movies", "TV & Streaming", "Reality TV", "Polymarket"].map(
    (cluster) => {
      const items = candidates.filter((item) => item.cluster === cluster).slice(0, 20);
      const buildCount = items.filter((item) => item.action === "build").length;
      return {
        cluster,
        opportunityCount: items.length,
        buildCount,
        topKeywords: items,
      };
    },
  );
}

function inferCluster(keyword) {
  if (keyword.includes("polymarket") || keyword.includes("pollymarket")) {
    if (keyword.includes("james bond")) return "Movies";
    if (keyword.includes("oscar") || keyword.includes("best picture") || keyword.includes("grammy") || keyword.includes("emmy") || keyword.includes("golden globe")) return "Awards";
    if (keyword.includes("box office")) return "Box Office";
    if (keyword.includes("love island") || keyword.includes("big brother") || keyword.includes("survivor") || keyword.includes("reality")) return "Reality TV";
    if (keyword.includes("netflix") || keyword.includes("tv")) return "TV & Streaming";
    return "Polymarket";
  }
  if (keyword.includes("james bond")) return "Movies";
  if (keyword.includes("oscar") || keyword.includes("award") || keyword.includes("picture") || keyword.includes("actor") || keyword.includes("actress") || keyword.includes("director") || keyword.includes("emmy") || keyword.includes("grammy") || keyword.includes("tony") || keyword.includes("globes") || keyword.includes("bafta") || keyword.includes("sag")) return "Awards";
  if (keyword.includes("box office") || keyword.includes("opening weekend") || keyword.includes("grossing")) return "Box Office";
  if (keyword.includes("netflix") || keyword.includes("streaming")) return "TV & Streaming";
  if (keyword.includes("love island") || keyword.includes("big brother") || keyword.includes("survivor") || keyword.includes("got talent") || keyword.includes("voice") || keyword.includes("dancing with the stars") || keyword.includes("bachelor") || keyword.includes("traitors") || keyword.includes("masterchef") || keyword.includes("celebrity") || keyword.includes("reality")) return "Reality TV";
  return "Movies";
}

function inferAction(keyword) {
  if (keyword.includes("pollymarket")) {
    return "monitor";
  }
  if (keyword === "movie odds" || keyword.includes("betting sites") || keyword.includes("vpn")) {
    return "avoid";
  }
  if (existingTargets.has(keyword)) {
    return "strengthen";
  }
  return "build";
}

function inferPageType(keyword, action) {
  if (action === "avoid") return "none";
  if (action === "monitor") return "supporting mention";
  if (keyword.includes("polymarket")) return "hub or market guide";
  if (keyword.includes("odds") || keyword.includes("prediction")) return "evergreen guide";
  return "supporting article";
}

function plannedUrl(keyword, cluster) {
  const slug = keyword
    .replace(/'/g, "")
    .replace(/&/g, "and")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (cluster === "Box Office") return `/blog/${slug}`;
  if (cluster === "Reality TV") return `/blog/${slug}`;
  if (cluster === "Awards") return `/blog/${slug}`;
  if (cluster === "TV & Streaming") return `/blog/${slug}`;
  return `/blog/${slug}`;
}

function buildRationale(keyword, cluster, action, kd) {
  if (action === "avoid") {
    return "Do not target as a primary page; intent is polluted, risky, or unrelated to ScreenOdds authority.";
  }
  if (action === "monitor") {
    return "Typo/navigational demand. Mention naturally if needed, but keep correct Polymarket spelling as the canonical target.";
  }
  const difficulty = kd === null ? "unknown KD" : `KD ${kd}`;
  if (action === "strengthen") {
    return `Existing ${cluster} page should receive more internal links and fresher source-backed sections; ${difficulty}.`;
  }
  return `Build as a ${cluster} cluster page because intent is specific enough for ScreenOdds and ${difficulty}.`;
}

function hasSpecificIntent(keyword) {
  return [
    "polymarket",
    "odds",
    "prediction",
    "best picture",
    "box office",
    "opening weekend",
    "love island",
    "big brother",
    "survivor",
    "james bond",
    "netflix",
  ].some((term) => keyword.includes(term));
}

function isRelevantKeyword(keyword) {
  if (!keyword || keyword.length < 3) {
    return false;
  }
  if (keyword.includes("football") || keyword.includes("horse") || keyword.includes("stock")) {
    return false;
  }
  return [
    "polymarket",
    "pollymarket",
    "oscar",
    "academy awards",
    "best picture",
    "actor",
    "actress",
    "director",
    "emmy",
    "golden globe",
    "grammy",
    "tony",
    "bafta",
    "sag awards",
    "box office",
    "opening weekend",
    "grossing",
    "movie",
    "james bond",
    "netflix",
    "streaming",
    "love island",
    "big brother",
    "survivor",
    "got talent",
    "the voice",
    "dancing with the stars",
    "bachelor",
    "bachelorette",
    "traitors",
    "masterchef",
    "celebrity",
    "reality tv",
    "tv odds",
  ].some((term) => keyword.includes(term));
}

function normalizeKeyword(keyword) {
  return typeof keyword === "string" ? keyword.toLowerCase().trim() : "";
}

function buildMarkdownReport(report) {
  const lines = [
    `# ScreenOdds Topical Authority Keyword Map - ${report.checkedAt}`,
    "",
    "## Summary",
    "",
    `DataForSEO returned ${report.totalCandidates} relevant candidates from ${report.seedKeywords.length} seed terms. The list below prioritizes keywords with specific entertainment/prediction-market intent, visible search volume, and manageable keyword difficulty.`,
    "",
    "## Immediate Priorities",
    "",
    "| Priority | Keyword | Cluster | Volume | KD | Action | Target |",
    "|---:|---|---|---:|---:|---|---|",
    ...report.quickWins.slice(0, 25).map((item, index) =>
      `| ${index + 1} | ${item.keyword} | ${item.cluster} | ${item.searchVolume} | ${item.keywordDifficulty ?? "n/a"} | ${item.action} | ${item.targetUrl} |`,
    ),
    "",
    "## Cluster Plan",
    "",
  ];

  for (const cluster of report.clusters) {
    lines.push(`### ${cluster.cluster}`, "");
    if (cluster.topKeywords.length === 0) {
      lines.push("No relevant DataForSEO candidates returned in this refresh.", "");
      continue;
    }
    lines.push("| Keyword | Volume | KD | Score | Action | Page Type |");
    lines.push("|---|---:|---:|---:|---|---|");
    for (const item of cluster.topKeywords.slice(0, 12)) {
      lines.push(
        `| ${item.keyword} | ${item.searchVolume} | ${item.keywordDifficulty ?? "n/a"} | ${item.rankabilityScore} | ${item.action} | ${item.pageType} |`,
      );
    }
    lines.push("");
  }

  lines.push("## SERP Notes", "");
  for (const note of report.competitorsSeenInSerpSpotChecks) {
    lines.push(`- ${note}`);
  }
  lines.push("", "## Operating Notes", "");
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function writeJson(outPath, payload) {
  const resolved = resolve(outPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeMarkdown(outPath, contents) {
  const resolved = resolve(outPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, contents);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
