import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scanJinaNews } from "./jina-news-scan.mjs";

const NETLIFY_SITE_ID = "5700712b-37ac-4967-b3a4-9231d35efeda";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const publish = process.argv.includes("--publish");
  const verify = process.argv.includes("--verify");
  const deploy = process.argv.includes("--deploy");
  const force = process.argv.includes("--force");

  const scan = await scanJinaNews();
  const candidate = buildNewsCandidate(scan, { publish });
  const outPath = resolve("content", "news", `${candidate.slug}.json`);

  if (existsSync(outPath) && !force) {
    console.log(`Skipped existing news file: ${outPath}`);
  } else if (dryRun) {
    console.log(JSON.stringify(candidate, null, 2));
  } else {
    await writeJson(outPath, candidate);
    console.log(`Wrote ${candidate.status} news post: ${outPath}`);
  }

  if (verify || deploy) {
    await run("npm", ["run", "test"]);
    await run("npm", ["run", "build"]);
  }

  if (deploy && !dryRun) {
    await run("git", ["add", "content/news", "reports/news-research"]);
    await run("git", ["commit", "-m", `content: add daily ScreenOdds news ${candidate.publishedAt}`], {
      allowFailure: true,
    });
    await run("git", ["push", "origin", "master"]);
    await run("netlify", ["deploy", "--prod", "--site", NETLIFY_SITE_ID]);
  }
}

function buildNewsCandidate(scan, { publish }) {
  const result = [...scan.results].sort((a, b) => b.sourceConfidence - a.sourceConfidence)[0];
  const date = new Date(scan.checkedAt).toISOString().slice(0, 10);
  const trustedSources = result.sources.filter(isAllowedNewsSource);
  const riskFlags = getRiskFlags(result, trustedSources);
  const canPublish =
    publish &&
    result.sourceConfidence >= 0.75 &&
    riskFlags.length === 0 &&
    trustedSources.length >= 2;
  const categorySlug = slugify(result.category);

  return {
    kind: "news",
    slug: `${categorySlug}-market-watch-${date}`,
    title: `${result.category} Market Watch: Source Signals for ${date}`,
    description:
      `A source-backed ScreenOdds market watch for ${result.category.toLowerCase()} prediction-market readers, generated from the daily Jina research scan.`,
    category: result.category,
    status: canPublish ? "published" : "draft",
    publishedAt: date,
    updatedAt: date,
    newsType: inferNewsType(result.category),
    riskLevel: canPublish ? "low" : "review",
    sourceConfidence: result.sourceConfidence,
    riskFlags,
    heroImage: heroImageForCategory(result.category),
    heroAlt: `${result.category} prediction-market editorial dashboard`,
    heroMedia: {
      kind: "generated",
      url: heroImageForCategory(result.category),
      alt: `${result.category} prediction-market editorial dashboard`,
      provider: "Kie.ai",
      sourceUrl: heroImageForCategory(result.category),
      credit: "ScreenOdds editorial image generated with Kie.ai / ChatGPT Image 2.",
      usageNote:
        "AI-generated editorial placeholder. Replace with TMDb/official real media when source metadata is available.",
    },
    sections: [
      {
        heading: "What the scan found",
        paragraphs: [
          `Jina returned ${result.sources.length} candidate sources for the ${result.category.toLowerCase()} watchlist with ${trustedSources.length} trusted sources and a source-confidence score of ${Math.round(result.sourceConfidence * 100)}%.`,
          "This routine only publishes when source confidence is high, the story type is low risk, and image attribution metadata is present. Otherwise the item remains a draft for editorial review.",
        ],
      },
      {
        heading: "Market context",
        paragraphs: [
          "ScreenOdds treats these updates as informational context for prediction-market readers. The goal is to explain public signals, market movement, and upcoming catalysts without presenting probabilities as advice.",
          "Official announcements, box office data, market data, nominations, results, and reliable trade reporting are eligible for low-risk publication. Rumors, leaks, allegations, and unclear sourcing are not.",
        ],
      },
    ],
    sources: trustedSources.slice(0, 5).map((source) => ({
      ...source,
      accessedAt: date,
    })),
    marketLinks: marketLinksForCategory(result.category),
    related: relatedLinksForCategory(result.category),
    inlineImages: [],
    infographics: [],
    faqs: [],
  };
}

function getRiskFlags(result, trustedSources) {
  const text = result.sources.map((source) => source.title).join(" ").toLowerCase();
  const flags = [];

  if (text.includes("rumor")) {
    flags.push("rumor");
  }
  if (text.includes("allegation") || text.includes("lawsuit")) {
    flags.push("allegation");
  }
  if (text.includes("leak")) {
    flags.push("leak");
  }
  if (result.sourceConfidence < 0.75 || trustedSources.length < 2) {
    flags.push("unclear-sourcing");
  }

  return [...new Set(flags)];
}

function isAllowedNewsSource(source) {
  return ["official", "market-data", "box-office-data", "trade-reporting"].includes(
    source.sourceType,
  );
}

function inferNewsType(category) {
  if (category === "Box Office") {
    return "box-office-update";
  }
  if (category === "Awards") {
    return "awards-signal";
  }
  if (category === "Reality TV") {
    return "reality-tv-signal";
  }
  if (category === "TV & Streaming") {
    return "streaming-signal";
  }
  return "market-move";
}

function heroImageForCategory(category) {
  const map = {
    Awards: "/images/awards-hero.png",
    "Box Office": "/images/box-office-hero.png",
    Movies: "/images/movies-hero.png",
    "TV & Streaming": "/images/tv-hero.png",
    "Reality TV": "/images/reality-tv-hero.png",
  };

  return map[category] ?? "/images/screenodds-og.png";
}

function marketLinksForCategory(category) {
  const map = {
    Awards: [
      { href: "/awards", label: "Awards Prediction Markets", description: "Live awards market context." },
      { href: "/oscars", label: "Oscars Odds", description: "The focused Oscars authority page." },
    ],
    "Box Office": [
      { href: "/box-office", label: "Box Office Prediction Markets", description: "Opening weekend and gross markets." },
      { href: "/markets/highest-grossing-movie-in-2026", label: "Highest-grossing movie market", description: "A seeded year-end market page." },
    ],
    Movies: [
      { href: "/movies", label: "Movie Prediction Markets", description: "Casting and release-market coverage." },
      { href: "/blog/next-james-bond-actor-odds", label: "Next James Bond actor odds", description: "Movie casting market guide." },
    ],
    "TV & Streaming": [
      { href: "/tv", label: "TV and Streaming Markets", description: "Streaming and television market context." },
      { href: "/news", label: "Streaming market notes", description: "Source-backed TV and streaming updates." },
    ],
    "Reality TV": [
      { href: "/reality-tv", label: "Reality TV Prediction Markets", description: "Reality-show market hub." },
      { href: "/blog/love-island-odds", label: "Love Island odds", description: "Evergreen reality TV guide." },
    ],
  };

  return map[category] ?? [{ href: "/news", label: "ScreenOdds News", description: "Entertainment market notes." }];
}

function relatedLinksForCategory(category) {
  const hubPaths = {
    Awards: "/awards",
    "Box Office": "/box-office",
    Movies: "/movies",
    "TV & Streaming": "/tv",
    "Reality TV": "/reality-tv",
  };

  return [
    { href: "/news", label: "ScreenOdds News", description: "All source-backed market notes." },
    {
      href: hubPaths[category] ?? "/",
      label: `${category} hub`,
      description: `ScreenOdds ${category.toLowerCase()} coverage.`,
    },
  ];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function writeJson(outPath, payload) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function run(command, args, options = {}) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { shell: true, stdio: "inherit" });

    child.on("exit", (code) => {
      if (code === 0 || options.allowFailure) {
        resolveRun();
      } else {
        rejectRun(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
