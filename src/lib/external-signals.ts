import { getServerEnv } from "./server-env";
import type { Market, MarketCategory } from "./markets";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const SITE_URL = "https://screenodds.com";

export type ExternalSignalKind =
  | "box-office"
  | "movie-metadata"
  | "tv-metadata"
  | "awards-context"
  | "market-context";

export type ExternalSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  kind: ExternalSignalKind;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  confidence: "live" | "fallback";
};

type SearchType = "movie" | "tv";

type SignalOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: SignalFetch;
  now?: Date;
};

type SignalFetch = (
  input: string | URL,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

type SignalConfig = {
  tmdb?: {
    type: SearchType;
    query: string;
  };
  omdbTitle?: string;
  tvmazeTitle?: string;
};

type TmdbSearchResult = {
  id?: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
};

type OmdbTitleResult = {
  Response?: string;
  Title?: string;
  Year?: string;
  Released?: string;
  BoxOffice?: string;
  imdbID?: string;
  Ratings?: Array<{ Source?: string; Value?: string }>;
};

type TvmazeShowResult = {
  id?: number;
  name?: string;
  url?: string;
  premiered?: string;
  status?: string;
  rating?: { average?: number | null };
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
  schedule?: { days?: string[]; time?: string };
};

export async function getExternalSignalsForMarket(
  market: Market,
  options: SignalOptions = {},
): Promise<ExternalSignal[]> {
  const checkedAt = (options.now ?? new Date()).toISOString();
  const fallback = getFallbackExternalSignals(market, checkedAt);
  const config = getSignalConfig(market);
  const fetcher = options.fetcher ?? fetch;

  if (!config) {
    return fallback;
  }

  const jobs: Array<Promise<ExternalSignal | null>> = [];
  const tmdbCredentials = uniqueValues([
    readEnv("TMDB_API_READ_TOKEN", options.env),
    readEnv("TMDB_API_KEY", options.env),
  ]);
  const omdbKey = readEnv("OMDB_API_KEY", options.env);
  const tvmazeKey = readEnv("TVMAZE_API_KEY", options.env);

  if (config.tmdb && tmdbCredentials.length > 0) {
    jobs.push(fetchTmdbSignalWithCredentials(config.tmdb, tmdbCredentials, fetcher, checkedAt));
  }
  if (config.omdbTitle && omdbKey) {
    jobs.push(fetchOmdbSignal(config.omdbTitle, omdbKey, fetcher, checkedAt));
  }
  if (config.tvmazeTitle && tvmazeKey) {
    jobs.push(fetchTvmazeSignal(config.tvmazeTitle, fetcher, checkedAt));
  }

  if (jobs.length === 0) {
    return fallback;
  }

  const results = await Promise.allSettled(jobs);
  const liveSignals = results
    .filter((result): result is PromiseFulfilledResult<ExternalSignal | null> => {
      return result.status === "fulfilled";
    })
    .map((result) => result.value)
    .filter((signal): signal is ExternalSignal => Boolean(signal));

  return liveSignals.length > 0 ? [...liveSignals, fallback[0]] : fallback;
}

async function fetchTmdbSignalWithCredentials(
  config: NonNullable<SignalConfig["tmdb"]>,
  credentials: string[],
  fetcher: SignalFetch,
  checkedAt: string,
): Promise<ExternalSignal | null> {
  for (const credential of credentials) {
    const signal = await fetchTmdbSignal(config, credential, fetcher, checkedAt);
    if (signal) {
      return signal;
    }
  }

  return null;
}

export function getFallbackExternalSignals(
  market: Market,
  checkedAt = new Date().toISOString(),
): ExternalSignal[] {
  const context = fallbackContextByCategory[market.category];

  return [
    {
      id: `${market.slug}-screenodds-context`,
      label: context.label,
      value: context.value,
      detail: `${context.detail} ScreenOdds keeps this deterministic fallback when external entertainment data providers are unavailable.`,
      kind: context.kind,
      sourceName: "ScreenOdds research",
      sourceUrl: `${SITE_URL}${context.path}`,
      checkedAt,
      confidence: "fallback",
    },
  ];
}

export function buildTmdbSearchRequest({
  type,
  query,
  credential,
}: {
  type: SearchType;
  query: string;
  credential: string;
}): { url: URL; headers: Record<string, string> } {
  const url = new URL(`${TMDB_API_BASE}/search/${type}`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const headers: Record<string, string> = { accept: "application/json" };
  if (credential.startsWith("ey")) {
    headers.Authorization = `Bearer ${credential}`;
  } else {
    url.searchParams.set("api_key", credential);
  }

  return { url, headers };
}

export function buildOmdbTitleUrl(title: string, apiKey: string): URL {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("t", title);
  url.searchParams.set("apikey", apiKey);
  return url;
}

export function buildTvmazeShowUrl(title: string): URL {
  const url = new URL("https://api.tvmaze.com/singlesearch/shows");
  url.searchParams.set("q", title);
  return url;
}

async function fetchTmdbSignal(
  config: NonNullable<SignalConfig["tmdb"]>,
  credential: string,
  fetcher: SignalFetch,
  checkedAt: string,
): Promise<ExternalSignal | null> {
  const request = buildTmdbSearchRequest({
    type: config.type,
    query: config.query,
    credential,
  });
  const response = await fetcher(request.url, {
    headers: request.headers,
    next: { revalidate: 21600 },
  });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { results?: TmdbSearchResult[] };
  const result = json.results?.[0];
  if (!result?.id) {
    return null;
  }

  const title = result.title ?? result.name ?? config.query;
  const date = result.release_date ?? result.first_air_date;
  const year = date?.slice(0, 4) ?? "unknown year";
  const popularity =
    typeof result.popularity === "number" ? ` TMDb popularity ${result.popularity.toFixed(1)}.` : "";

  return {
    id: `tmdb-${config.type}-${result.id}`,
    label: "TMDb title metadata",
    value: `${title} (${year})`,
    detail: `Top TMDb match for "${config.query}".${popularity} Use this as title metadata context, not a market resolution source.`,
    kind: config.type === "movie" ? "movie-metadata" : "tv-metadata",
    sourceName: "TMDb",
    sourceUrl: `https://www.themoviedb.org/${config.type}/${result.id}`,
    checkedAt,
    confidence: "live",
  };
}

async function fetchOmdbSignal(
  title: string,
  apiKey: string,
  fetcher: SignalFetch,
  checkedAt: string,
): Promise<ExternalSignal | null> {
  const response = await fetcher(buildOmdbTitleUrl(title, apiKey), {
    headers: { accept: "application/json" },
    next: { revalidate: 21600 },
  });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as OmdbTitleResult;
  if (json.Response !== "True") {
    return null;
  }

  const boxOffice = usableValue(json.BoxOffice);
  const imdbRating = json.Ratings?.find((rating) => rating.Source === "Internet Movie Database");
  const releaseDetail = usableValue(json.Released) ? `Released ${json.Released}.` : "";
  const ratingDetail = imdbRating?.Value ? ` IMDb user rating ${imdbRating.Value}.` : "";

  return {
    id: `omdb-${json.imdbID ?? slugSegment(title)}`,
    label: boxOffice ? "OMDb box office reference" : "OMDb title record",
    value: boxOffice ?? `${json.Title ?? title} (${json.Year ?? "year unknown"})`,
    detail: `${releaseDetail}${ratingDetail} OMDb supplies title metadata that can support box office and movie-market context.`,
    kind: boxOffice ? "box-office" : "movie-metadata",
    sourceName: "OMDb",
    sourceUrl: json.imdbID ? `https://www.imdb.com/title/${json.imdbID}/` : "https://www.omdbapi.com/",
    checkedAt,
    confidence: "live",
  };
}

async function fetchTvmazeSignal(
  title: string,
  fetcher: SignalFetch,
  checkedAt: string,
): Promise<ExternalSignal | null> {
  const response = await fetcher(buildTvmazeShowUrl(title), {
    headers: { accept: "application/json" },
    next: { revalidate: 21600 },
  });
  if (!response.ok) {
    return null;
  }

  const show = (await response.json()) as TvmazeShowResult;
  if (!show?.id) {
    return null;
  }

  const channel = show.network?.name ?? show.webChannel?.name;
  const schedule = formatSchedule(show.schedule);
  const rating =
    typeof show.rating?.average === "number"
      ? ` TVmaze audience rating ${show.rating.average.toFixed(1)}.`
      : "";
  const details = [
    channel ? `Listed network/platform: ${channel}.` : "",
    schedule ? ` Schedule: ${schedule}.` : "",
    rating,
  ]
    .filter(Boolean)
    .join("");

  return {
    id: `tvmaze-${show.id}`,
    label: "TVmaze show metadata",
    value: `${show.status ?? "Status unknown"}${show.premiered ? `, premiered ${show.premiered.slice(0, 4)}` : ""}`,
    detail: `${details || `TVmaze show record for ${show.name ?? title}.`} Use this as scheduling and franchise context, not as vote-count data.`,
    kind: "tv-metadata",
    sourceName: "TVmaze",
    sourceUrl: show.url ?? `https://www.tvmaze.com/search?q=${encodeURIComponent(title)}`,
    checkedAt,
    confidence: "live",
  };
}

function getSignalConfig(market: Market): SignalConfig | null {
  switch (market.slug) {
    case "scary-movie-opening-weekend-box-office":
      return {
        tmdb: { type: "movie", query: "Scary Movie" },
        omdbTitle: "Scary Movie",
      };
    case "love-island-odds":
      return { tvmazeTitle: "Love Island" };
    case "big-brother-odds":
      return { tvmazeTitle: "Big Brother" };
    default:
      return null;
  }
}

function readEnv(name: string, overrides?: Record<string, string | undefined>): string | undefined {
  if (overrides) {
    return overrides[name];
  }

  return getServerEnv(name);
}

function usableValue(value: string | undefined): string | null {
  if (!value || value === "N/A") {
    return null;
  }

  return value;
}

function formatSchedule(schedule: TvmazeShowResult["schedule"]): string | null {
  const days = schedule?.days?.filter(Boolean).join(", ");
  if (days && schedule?.time) {
    return `${days} at ${schedule.time}`;
  }
  return days || schedule?.time || null;
}

function slugSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueValues(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

const fallbackContextByCategory: Record<
  MarketCategory,
  {
    label: string;
    value: string;
    detail: string;
    kind: ExternalSignalKind;
    path: string;
  }
> = {
  Movies: {
    label: "Movie-market context",
    value: "Casting, release calendar, and franchise news",
    detail:
      "Movie prediction markets should be read alongside official studio announcements, reputable trade reporting, and release-calendar changes.",
    kind: "movie-metadata",
    path: "/movies",
  },
  "Box Office": {
    label: "Box office context",
    value: "Weekend grosses, theater count, and comps",
    detail:
      "Box office markets depend on official weekend estimates, final grosses, comparable releases, and distribution changes.",
    kind: "box-office",
    path: "/box-office",
  },
  Awards: {
    label: "Awards-season context",
    value: "Festivals, nominations, guilds, and critics",
    detail:
      "Awards markets usually move around festival reactions, nominations, critics groups, guild results, and official ceremony outcomes.",
    kind: "awards-context",
    path: "/awards",
  },
  "TV & Streaming": {
    label: "TV and streaming context",
    value: "Release timing, platform charts, and season status",
    detail:
      "TV and streaming markets should be paired with official release calendars, platform charts, and show-status metadata.",
    kind: "tv-metadata",
    path: "/tv",
  },
  "Reality TV": {
    label: "Reality TV context",
    value: "Episode schedule, contestant field, and vote window",
    detail:
      "Reality TV markets can move around episode edits, elimination order, public voting windows, and finale timing.",
    kind: "tv-metadata",
    path: "/reality-tv",
  },
  Culture: {
    label: "Entertainment context",
    value: "Official sources and market-liquidity checks",
    detail:
      "Culture markets need source checks because social rumor, thin liquidity, and ambiguous resolution rules can distort prices.",
    kind: "market-context",
    path: "/",
  },
};
