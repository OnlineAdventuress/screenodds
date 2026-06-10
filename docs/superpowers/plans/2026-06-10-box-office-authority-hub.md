# Box Office Authority Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom `/box-office` authority page with source-backed market context, TMDb upcoming-release metadata, deterministic fallbacks, and tests.

**Architecture:** Add a focused `src/lib/box-office.ts` data boundary and a `src/components/box-office-authority-hub.tsx` renderer. Keep external provider calls server-side and fallback-first so builds and Netlify deploys remain stable.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Vitest, TMDb API via existing shared env loader.

---

## File Structure

- Create `src/lib/box-office.ts`: types, source stack, market filtering, TMDb upcoming movies fetcher, page-model builder.
- Create `src/lib/box-office.test.ts`: unit tests for filtering, fallbacks, request construction, and secret-safe provider mapping.
- Create `src/components/box-office-authority-hub.tsx`: presentational page component for source stack, watchlist, markets, and methodology.
- Modify `src/app/box-office/page.tsx`: replace generic `HubPageTemplate` usage with the new authority component.

## Task 1: Box Office Data Boundary

**Files:**
- Create: `src/lib/box-office.ts`
- Test: `src/lib/box-office.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that define the data boundary:

```ts
import { describe, expect, it, vi } from "vitest";
import { fallbackMarkets } from "./fixtures";
import {
  buildTmdbUpcomingMoviesRequest,
  filterBoxOfficeAuthorityMarkets,
  getBoxOfficeHubData,
} from "./box-office";

const fixedNow = new Date("2026-06-10T00:00:00.000Z");

describe("box office authority data", () => {
  it("includes box office and highest-grossing movie markets", () => {
    const markets = filterBoxOfficeAuthorityMarkets(fallbackMarkets);
    expect(markets.map((market) => market.slug)).toContain(
      "scary-movie-opening-weekend-box-office",
    );
    expect(markets.map((market) => market.slug)).toContain(
      "highest-grossing-movie-in-2026",
    );
    expect(markets.map((market) => market.slug)).not.toContain("big-brother-odds");
  });

  it("returns fallback watchlist data when TMDb credentials are missing", async () => {
    const fetcher = vi.fn();
    const data = await getBoxOfficeHubData(fallbackMarkets, {
      env: {},
      fetcher,
      now: fixedNow,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(data.watchlist.length).toBeGreaterThanOrEqual(3);
    expect(data.watchlist.every((entry) => entry.confidence === "fallback")).toBe(true);
    expect(data.sources.some((source) => source.name === "TMDb")).toBe(true);
    expect(data.methodology.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps TMDb bearer credentials out of request URLs", () => {
    const request = buildTmdbUpcomingMoviesRequest("ey.test-token");
    expect(request.url.toString()).not.toContain("ey.test-token");
    expect(request.headers.Authorization).toBe("Bearer ey.test-token");
  });

  it("maps TMDb upcoming results into public watchlist entries without secrets", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        results: [
          {
            id: 123,
            title: "Example Franchise Movie",
            release_date: "2026-07-17",
            popularity: 52.2,
            overview: "A studio tentpole release.",
          },
        ],
      }),
    );

    const data = await getBoxOfficeHubData(fallbackMarkets, {
      env: { TMDB_API_READ_TOKEN: "ey.secret-token" },
      fetcher,
      now: fixedNow,
    });

    expect(data.watchlist[0]).toMatchObject({
      title: "Example Franchise Movie",
      sourceName: "TMDb",
      confidence: "live",
    });
    expect(JSON.stringify(data)).not.toContain("ey.secret-token");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- src/lib/box-office.test.ts
```

Expected: fail because `src/lib/box-office.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal data module**

Create `src/lib/box-office.ts` with:

```ts
import { getServerEnv } from "./server-env";
import { calculateMarketSummary, rankMarketsByOpportunity, type Market } from "./markets";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export type BoxOfficeSource = {
  name: string;
  url: string;
  role: string;
  cadence: string;
};

export type BoxOfficeWatchlistEntry = {
  id: string;
  title: string;
  releaseDate: string | null;
  signal: string;
  detail: string;
  sourceName: string;
  sourceUrl: string;
  confidence: "live" | "fallback";
};

export type BoxOfficeMethodologyEntry = {
  title: string;
  detail: string;
};

export type BoxOfficeHubData = {
  markets: Market[];
  summary: ReturnType<typeof calculateMarketSummary>;
  sources: BoxOfficeSource[];
  watchlist: BoxOfficeWatchlistEntry[];
  methodology: BoxOfficeMethodologyEntry[];
  checkedAt: string;
};

type HubOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  now?: Date;
};

type TmdbUpcomingMovie = {
  id?: number;
  title?: string;
  release_date?: string;
  overview?: string;
  popularity?: number;
};

export async function getBoxOfficeHubData(
  markets: Market[],
  options: HubOptions = {},
): Promise<BoxOfficeHubData> {
  const relevantMarkets = filterBoxOfficeAuthorityMarkets(markets);
  const checkedAt = (options.now ?? new Date()).toISOString();
  const watchlist = await fetchTmdbUpcomingMovies(options);

  return {
    markets: relevantMarkets,
    summary: calculateMarketSummary(relevantMarkets),
    sources: boxOfficeSources,
    watchlist,
    methodology: boxOfficeMethodology,
    checkedAt,
  };
}

export function filterBoxOfficeAuthorityMarkets(markets: Market[]): Market[] {
  return rankMarketsByOpportunity(
    markets.filter((market) => {
      const text = `${market.title} ${market.description} ${market.tags.join(" ")}`.toLowerCase();
      return (
        market.category === "Box Office" ||
        text.includes("box office") ||
        text.includes("opening weekend") ||
        text.includes("highest grossing")
      );
    }),
  );
}

export function buildTmdbUpcomingMoviesRequest(credential: string): {
  url: URL;
  headers: Record<string, string>;
} {
  const url = new URL(`${TMDB_API_BASE}/movie/upcoming`);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("region", "US");
  url.searchParams.set("page", "1");

  const headers: Record<string, string> = { accept: "application/json" };
  if (credential.startsWith("ey")) {
    headers.Authorization = `Bearer ${credential}`;
  } else {
    url.searchParams.set("api_key", credential);
  }

  return { url, headers };
}

async function fetchTmdbUpcomingMovies(
  options: HubOptions,
): Promise<BoxOfficeWatchlistEntry[]> {
  const credentials = [
    readEnv("TMDB_API_READ_TOKEN", options.env),
    readEnv("TMDB_API_KEY", options.env),
  ].filter((value): value is string => Boolean(value));

  if (credentials.length === 0) {
    return fallbackWatchlist;
  }

  for (const credential of [...new Set(credentials)]) {
    const request = buildTmdbUpcomingMoviesRequest(credential);
    try {
      const response = await (options.fetcher ?? fetch)(request.url, {
        headers: request.headers,
        next: { revalidate: 21600 },
      } as RequestInit & { next: { revalidate: number } });
      if (!response.ok) {
        continue;
      }

      const json = (await response.json()) as { results?: TmdbUpcomingMovie[] };
      const entries = (json.results ?? [])
        .filter((movie) => movie.id && movie.title)
        .slice(0, 6)
        .map((movie) => ({
          id: `tmdb-upcoming-${movie.id}`,
          title: movie.title ?? "Untitled upcoming movie",
          releaseDate: movie.release_date ?? null,
          signal: typeof movie.popularity === "number" ? `TMDb popularity ${movie.popularity.toFixed(1)}` : "Upcoming theatrical release",
          detail: movie.overview?.slice(0, 180) || "TMDb upcoming movie metadata for box office market context.",
          sourceName: "TMDb",
          sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
          confidence: "live" as const,
        }));

      if (entries.length > 0) {
        return entries;
      }
    } catch {
      continue;
    }
  }

  return fallbackWatchlist;
}

function readEnv(name: string, overrides?: Record<string, string | undefined>): string | undefined {
  if (overrides) {
    return overrides[name];
  }

  return getServerEnv(name);
}

export const boxOfficeSources: BoxOfficeSource[] = [
  {
    name: "TMDb",
    url: "https://www.themoviedb.org/",
    role: "Release calendar, title metadata, posters, and franchise context.",
    cadence: "Queried at build time with a six-hour revalidation window.",
  },
  {
    name: "The Numbers",
    url: "https://www.the-numbers.com/box-office",
    role: "Public box office tables and historical comps for editorial research.",
    cadence: "Manual/source-check layer until a licensed data feed is added.",
  },
  {
    name: "Box Office Mojo",
    url: "https://www.boxofficemojo.com/",
    role: "Weekend estimates, final grosses, and title-level box office pages.",
    cadence: "Manual/source-check layer until a licensed data feed is added.",
  },
  {
    name: "Polymarket",
    url: "https://polymarket.com/",
    role: "Market-implied probabilities, liquidity, and recent volume.",
    cadence: "ScreenOdds market pages refresh from Polymarket with fallbacks.",
  },
];

const fallbackWatchlist: BoxOfficeWatchlistEntry[] = [
  {
    id: "fallback-opening-weekend",
    title: "Opening weekend markets",
    releaseDate: null,
    signal: "Opening range, previews, comps, and theater count",
    detail: "Opening-weekend markets usually move when preview numbers, comparable releases, or distribution footprint become clearer.",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/box-office",
    confidence: "fallback",
  },
  {
    id: "fallback-year-end-grosser",
    title: "Highest-grossing movie markets",
    releaseDate: null,
    signal: "Global total, release slate, and franchise strength",
    detail: "Year-end gross markets depend on release timing, international rollout, audience reception, and the rest of the theatrical slate.",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/markets/highest-grossing-movie-in-2026",
    confidence: "fallback",
  },
  {
    id: "fallback-franchise-comps",
    title: "Franchise sequel watchlist",
    releaseDate: null,
    signal: "Comparable openings and audience retention",
    detail: "Franchise titles need comps from prior installments, genre trends, marketing intensity, and premium-format availability.",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/movies",
    confidence: "fallback",
  },
];

const boxOfficeMethodology: BoxOfficeMethodologyEntry[] = [
  {
    title: "Separate market price from box office fact",
    detail: "Prediction-market prices are crowd-implied probabilities. Box office estimates and final grosses must still be checked against dedicated box office sources.",
  },
  {
    title: "Watch timing catalysts",
    detail: "Opening weekend markets can move around review embargoes, previews, theater count, international openings, and comparable title performance.",
  },
  {
    title: "Prefer source-backed updates",
    detail: "ScreenOdds should publish news automatically only when official, trade, or box office source confidence is high; rumors stay drafts.",
  },
];
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm run test -- src/lib/box-office.test.ts
```

Expected: the new box office test file passes.

- [ ] **Step 5: Commit the data boundary**

Run:

```bash
git add src/lib/box-office.ts src/lib/box-office.test.ts
git commit -m "feat: add box office authority data"
```

## Task 2: Box Office Authority UI

**Files:**
- Create: `src/components/box-office-authority-hub.tsx`
- Modify: `src/app/box-office/page.tsx`

- [ ] **Step 1: Implement the presentational component**

Create `src/components/box-office-authority-hub.tsx` that renders the page model:

```tsx
import Link from "next/link";
import { LatestNews } from "@/components/latest-news";
import { MarketCard } from "@/components/market-card";
import { MetricCard } from "@/components/metric-card";
import { RelatedLinks } from "@/components/related-links";
import type { BoxOfficeHubData } from "@/lib/box-office";
import { formatCompactCurrency } from "@/lib/markets";

type BoxOfficeAuthorityHubProps = {
  data: BoxOfficeHubData;
};

export function BoxOfficeAuthorityHub({ data }: BoxOfficeAuthorityHubProps) {
  return (
    <>
      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <Link href="/" className="screen-link">Home</Link>
          <p className="screen-kicker mt-8">Box office authority</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">Box Office Prediction Markets</h1>
              <p className="mt-5 text-base leading-8 text-zinc-300">Track opening weekend, highest-grossing movie, and release-calendar markets with source-backed context. ScreenOdds separates market-implied probability from box office reporting so each page can be useful beyond the price.</p>
              <p className="mt-4 text-sm leading-6 text-zinc-500">Checked {data.checkedAt.slice(0, 10)}. TMDb is used for release metadata; box office gross figures need dedicated source verification before publication.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Tracked markets" value={String(data.summary.totalMarkets)} detail="Box office and highest-grossing movie markets." />
              <MetricCard label="1M volume" value={formatCompactCurrency(data.summary.totalVolume1mo)} detail="Recent prediction-market volume." />
              <MetricCard label="24H volume" value={formatCompactCurrency(data.summary.totalVolume24hr)} detail="Fresh market activity." />
              <MetricCard label="Liquidity" value={formatCompactCurrency(data.summary.totalLiquidity)} detail="Available market depth." />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="screen-kicker">Release watchlist</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">Upcoming titles and market catalysts</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">These entries are metadata signals, not box office predictions. They tell us which releases may deserve market pages or news coverage.</p>
          </div>
          <div className="divide-y divide-zinc-800 screen-panel p-5">
            {data.watchlist.map((entry) => (
              <div key={entry.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[0.32fr_1fr_0.18fr]">
                <div>
                  <p className="font-semibold text-zinc-50">{entry.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">{entry.releaseDate ?? "Date pending"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-100">{entry.signal}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{entry.detail}</p>
                </div>
                <a href={entry.sourceUrl} className="screen-link md:text-right" rel="nofollow noopener noreferrer" target="_blank">{entry.sourceName}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="screen-kicker">Source stack</p>
        <h2 className="mt-3 text-3xl font-semibold text-zinc-50">Where ScreenOdds checks box office signals</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {data.sources.map((source) => (
            <a key={source.name} href={source.url} className="screen-panel block p-5" rel="nofollow noopener noreferrer" target="_blank">
              <p className="font-semibold text-zinc-50">{source.name}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{source.role}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{source.cadence}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="screen-kicker">Markets</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">Box office markets to watch</h2>
          </div>
          <Link href="/markets/scary-movie-opening-weekend-box-office" className="screen-link">Opening weekend page</Link>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {data.markets.map((market) => <MarketCard key={market.slug} market={market} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="screen-kicker">Methodology</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {data.methodology.map((entry) => (
            <div key={entry.title} className="screen-panel p-5">
              <h3 className="font-semibold text-zinc-50">{entry.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{entry.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <LatestNews title="Latest box office news" category="Box Office" />

      <RelatedLinks
        title="Build the box office research path"
        links={[
          { href: "/markets/highest-grossing-movie-in-2026", label: "Highest-grossing movie odds", description: "Year-end box office market context." },
          { href: "/movies", label: "Movie prediction markets", description: "Casting, franchise, and release-calendar markets." },
          { href: "/blog/best-picture-odds", label: "Best Picture odds", description: "Awards-market guide for film search demand." },
        ]}
      />
    </>
  );
}
```

- [ ] **Step 2: Wire `/box-office` to the authority component**

Replace `src/app/box-office/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { BoxOfficeAuthorityHub } from "@/components/box-office-authority-hub";
import { getBoxOfficeHubData } from "@/lib/box-office";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "Box Office Prediction Markets | ScreenOdds",
  description:
    "Opening weekend odds, highest-grossing movie markets, release watchlists, and source-backed box office prediction-market context.",
  alternates: {
    canonical: "/box-office",
  },
};

export default async function BoxOfficePage() {
  const markets = await fetchEntertainmentMarkets();
  const data = await getBoxOfficeHubData(markets);

  return <BoxOfficeAuthorityHub data={data} />;
}
```

- [ ] **Step 3: Run lint and tests**

Run:

```bash
npm run lint
npm run test
```

Expected: lint exits 0, all tests pass.

- [ ] **Step 4: Commit the UI**

Run:

```bash
git add src/components/box-office-authority-hub.tsx src/app/box-office/page.tsx
git commit -m "feat: build box office authority hub"
```

## Task 3: Verification and Deployment

**Files:**
- Modify: `.Codex/learnings.md` only if a new durable lesson appears.

- [ ] **Step 1: Run final verification**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: all three commands exit 0.

- [ ] **Step 2: Check local generated output**

Run:

```powershell
$content = Get-Content -LiteralPath ".next\server\app\box-office.html" -Raw
$content.Contains("Release watchlist")
$content.Contains("Source stack")
$content.Contains("Box office markets to watch")
```

Expected: all three values print `True`.

- [ ] **Step 3: Push commits**

Run the existing GitHub token push flow from project instructions and confirm `master` reaches `origin/master`.

- [ ] **Step 4: Deploy to Netlify**

Before deploying, stop any ScreenOdds Next process:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object { $_.CommandLine -like '*screenodds*' } |
  Select-Object ProcessId, CommandLine
```

Stop only ScreenOdds-owned preview/start processes, then run:

```bash
netlify deploy --prod --site 5700712b-37ac-4967-b3a4-9231d35efeda
```

Expected: deploy reaches `Deploy is live!`.

- [ ] **Step 5: Public smoke check**

Run:

```powershell
$response = Invoke-WebRequest -Uri "https://screenodds.com/box-office" -UseBasicParsing -TimeoutSec 45
$response.StatusCode
$response.Content.Contains("Release watchlist")
$response.Content.Contains("Source stack")
```

Expected: status `200`, both content checks `True`.
