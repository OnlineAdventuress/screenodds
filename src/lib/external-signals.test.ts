import { describe, expect, it, vi } from "vitest";
import { fallbackMarkets } from "./fixtures";
import {
  buildOmdbTitleUrl,
  buildTmdbSearchRequest,
  buildTvmazeShowUrl,
  getExternalSignalsForMarket,
} from "./external-signals";
import { buildParlayEventMarketsSearchUrl } from "./parlay";

const fixedNow = new Date("2026-06-10T00:00:00.000Z");

function market(slug: string) {
  const entry = fallbackMarkets.find((item) => item.slug === slug);
  if (!entry) {
    throw new Error(`Missing seeded market ${slug}`);
  }
  return entry;
}

describe("external entertainment signals", () => {
  it("returns deterministic fallback signals for every seeded market without provider keys", async () => {
    const fetcher = vi.fn();

    for (const entry of fallbackMarkets) {
      const signals = await getExternalSignalsForMarket(entry, {
        env: {},
        fetcher,
        now: fixedNow,
      });

      expect(signals.length).toBeGreaterThan(0);
      expect(signals.every((signal) => signal.confidence === "fallback")).toBe(true);
      expect(signals.every((signal) => signal.sourceUrl.startsWith("https://"))).toBe(true);
    }

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("builds provider requests with credentials kept out of public source URLs", () => {
    const tokenRequest = buildTmdbSearchRequest({
      type: "movie",
      query: "Scary Movie",
      credential: "ey.test-token",
    });
    const keyRequest = buildTmdbSearchRequest({
      type: "tv",
      query: "Big Brother",
      credential: "tmdb-key",
    });
    const omdbUrl = buildOmdbTitleUrl("Scary Movie", "omdb-secret");
    const tvmazeUrl = buildTvmazeShowUrl("Love Island");

    expect(tokenRequest.url.toString()).not.toContain("ey.test-token");
    expect(tokenRequest.headers.Authorization).toBe("Bearer ey.test-token");
    expect(keyRequest.url.searchParams.get("api_key")).toBe("tmdb-key");
    expect(omdbUrl.searchParams.get("apikey")).toBe("omdb-secret");
    expect(tvmazeUrl.toString()).toBe(
      "https://api.tvmaze.com/singlesearch/shows?q=Love+Island",
    );
  });

  it("uses TMDb and OMDb for box office market signals without serializing secrets", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("themoviedb.org/3/search/movie")) {
        return Response.json({
          results: [
            {
              id: 4247,
              title: "Scary Movie",
              release_date: "2000-07-07",
              popularity: 42.5,
            },
          ],
        });
      }
      if (url.includes("omdbapi.com")) {
        return Response.json({
          Response: "True",
          Title: "Scary Movie",
          Year: "2000",
          Released: "07 Jul 2000",
          BoxOffice: "$157,019,771",
          imdbID: "tt0175142",
          Ratings: [{ Source: "Internet Movie Database", Value: "6.2/10" }],
        });
      }
      throw new Error(`Unexpected request ${url}`);
    });

    const signals = await getExternalSignalsForMarket(
      market("scary-movie-opening-weekend-box-office"),
      {
        env: {
          TMDB_API_KEY: "tmdb-secret",
          OMDB_API_KEY: "omdb-secret",
        },
        fetcher,
        now: fixedNow,
      },
    );

    expect(signals.some((signal) => signal.sourceName === "TMDb")).toBe(true);
    expect(
      signals.some(
        (signal) => signal.sourceName === "OMDb" && signal.value.includes("$157"),
      ),
    ).toBe(true);
    expect(JSON.stringify(signals)).not.toContain("tmdb-secret");
    expect(JSON.stringify(signals)).not.toContain("omdb-secret");
    expect(JSON.stringify(signals)).not.toContain("apikey");
  });

  it("tries the TMDb API key when the read token request fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status_message: "Invalid token" }, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          results: [
            {
              id: 4247,
              title: "Scary Movie",
              release_date: "2000-07-07",
              popularity: 42.5,
            },
          ],
        }),
      );

    const signals = await getExternalSignalsForMarket(
      market("scary-movie-opening-weekend-box-office"),
      {
        env: {
          TMDB_API_READ_TOKEN: "ey.bad-token",
          TMDB_API_KEY: "tmdb-key",
        },
        fetcher,
        now: fixedNow,
      },
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(signals.some((signal) => signal.sourceName === "TMDb")).toBe(true);
    expect(JSON.stringify(signals)).not.toContain("ey.bad-token");
    expect(JSON.stringify(signals)).not.toContain("tmdb-key");
  });

  it("uses TVmaze for reality TV signals only when the TVmaze key is present", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        id: 305,
        name: "Big Brother",
        url: "https://www.tvmaze.com/shows/305/big-brother",
        premiered: "2000-07-05",
        status: "Running",
        rating: { average: 5.6 },
        network: { name: "CBS" },
        schedule: { days: ["Sunday", "Wednesday", "Thursday"], time: "20:00" },
      }),
    );

    const signals = await getExternalSignalsForMarket(market("big-brother-odds"), {
      env: { TVMAZE_API_KEY: "tvmaze-secret" },
      fetcher,
      now: fixedNow,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(signals.some((signal) => signal.sourceName === "TVmaze")).toBe(true);
    expect(JSON.stringify(signals)).not.toContain("tvmaze-secret");
  });

  it("adds Parlay prediction-market discovery signals without serializing secrets", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      expect(url).toContain("parlay-api.com/v1/event-markets/search");
      expect(url).toContain("q=love+island");
      expect(url).not.toContain("parlay-secret");
      expect(init?.headers).toMatchObject({ "X-API-Key": "parlay-secret" });

      return Response.json({
        markets: [
          {
            source: "polymarket",
            market_id: "2382065",
            event_title: "Who will win Love Island USA Season 8? (Women)",
            title: "Will Kayda Bosse win Love Island USA Season 8?",
            volume: 980.9812,
            match_confidence: 0.99,
            prices: { best_bid: 0.2, best_ask: 0.3, last: 0.25 },
            url: "https://polymarket.com/event/who-will-win-love-island-usa-season-8",
          },
        ],
      });
    });

    const signals = await getExternalSignalsForMarket(market("love-island-odds"), {
      env: { PARLAY_API_KEY: "parlay-secret" },
      fetcher,
      now: fixedNow,
    });

    expect(buildParlayEventMarketsSearchUrl({ query: "love island" }).toString()).not.toContain(
      "parlay-secret",
    );
    expect(signals.some((signal) => signal.sourceName === "Parlay API")).toBe(true);
    expect(signals.some((signal) => signal.kind === "prediction-market")).toBe(true);
    expect(JSON.stringify(signals)).not.toContain("parlay-secret");
  });
});
