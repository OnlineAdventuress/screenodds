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
