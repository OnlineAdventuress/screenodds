import { calculateMarketSummary, rankMarketsByOpportunity, type Market } from "./markets";
import { getServerEnv } from "./server-env";

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

type BoxOfficeFetch = (
  input: string | URL,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

type HubOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: BoxOfficeFetch;
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
  const credentials = uniqueValues([
    readEnv("TMDB_API_READ_TOKEN", options.env),
    readEnv("TMDB_API_KEY", options.env),
  ]);

  if (credentials.length === 0) {
    return fallbackWatchlist;
  }

  for (const credential of credentials) {
    const request = buildTmdbUpcomingMoviesRequest(credential);
    try {
      const response = await (options.fetcher ?? fetch)(request.url, {
        headers: request.headers,
        next: { revalidate: 21600 },
      });
      if (!response.ok) {
        continue;
      }

      const json = (await response.json()) as { results?: TmdbUpcomingMovie[] };
      const entries = (json.results ?? [])
        .filter((movie) => movie.id && movie.title)
        .slice(0, 6)
        .map((movie) => mapTmdbUpcomingMovie(movie));

      if (entries.length > 0) {
        return entries;
      }
    } catch {
      continue;
    }
  }

  return fallbackWatchlist;
}

function mapTmdbUpcomingMovie(movie: TmdbUpcomingMovie): BoxOfficeWatchlistEntry {
  return {
    id: `tmdb-upcoming-${movie.id}`,
    title: movie.title ?? "Untitled upcoming movie",
    releaseDate: movie.release_date ?? null,
    signal:
      typeof movie.popularity === "number"
        ? `TMDb popularity ${movie.popularity.toFixed(1)}`
        : "Upcoming theatrical release",
    detail:
      movie.overview?.slice(0, 180) ||
      "TMDb upcoming movie metadata for box office market context.",
    sourceName: "TMDb",
    sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    confidence: "live",
  };
}

function readEnv(name: string, overrides?: Record<string, string | undefined>): string | undefined {
  if (overrides) {
    return overrides[name];
  }

  return getServerEnv(name);
}

function uniqueValues(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
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
    detail:
      "Opening-weekend markets usually move when preview numbers, comparable releases, or distribution footprint become clearer.",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/box-office",
    confidence: "fallback",
  },
  {
    id: "fallback-year-end-grosser",
    title: "Highest-grossing movie markets",
    releaseDate: null,
    signal: "Global total, release slate, and franchise strength",
    detail:
      "Year-end gross markets depend on release timing, international rollout, audience reception, and the rest of the theatrical slate.",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/markets/highest-grossing-movie-in-2026",
    confidence: "fallback",
  },
  {
    id: "fallback-franchise-comps",
    title: "Franchise sequel watchlist",
    releaseDate: null,
    signal: "Comparable openings and audience retention",
    detail:
      "Franchise titles need comps from prior installments, genre trends, marketing intensity, and premium-format availability.",
    sourceName: "ScreenOdds research",
    sourceUrl: "https://screenodds.com/movies",
    confidence: "fallback",
  },
];

const boxOfficeMethodology: BoxOfficeMethodologyEntry[] = [
  {
    title: "Separate market price from box office fact",
    detail:
      "Prediction-market prices are crowd-implied probabilities. Box office estimates and final grosses must still be checked against dedicated box office sources.",
  },
  {
    title: "Watch timing catalysts",
    detail:
      "Opening weekend markets can move around review embargoes, previews, theater count, international openings, and comparable title performance.",
  },
  {
    title: "Prefer source-backed updates",
    detail:
      "ScreenOdds should publish news automatically only when official, trade, or box office source confidence is high; rumors stay drafts.",
  },
];
