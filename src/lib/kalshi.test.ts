import { describe, expect, it, vi } from "vitest";
import {
  buildKalshiMarketsUrl,
  buildKalshiSeriesUrl,
  fetchKalshiEntertainmentSeries,
  fetchKalshiSeriesMarkets,
  normalizeKalshiMarketsResponse,
  normalizeKalshiSeriesResponse,
} from "./kalshi";

describe("Kalshi public entertainment client", () => {
  it("builds unauthenticated public series URLs", () => {
    const url = buildKalshiSeriesUrl({ category: "Entertainment" });

    expect(url.toString()).toBe(
      "https://external-api.kalshi.com/trade-api/v2/series?category=Entertainment&include_volume=true",
    );
    expect(url.toString()).not.toContain("apiKey");
  });

  it("builds unauthenticated public market URLs", () => {
    const url = buildKalshiMarketsUrl({ seriesTicker: "KXOSCARPIC", limit: 20 });

    expect(url.toString()).toContain(
      "https://external-api.kalshi.com/trade-api/v2/markets?",
    );
    expect(url.searchParams.get("series_ticker")).toBe("KXOSCARPIC");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("mve_filter")).toBe("exclude");
    expect(url.toString()).not.toContain("apiKey");
  });

  it("normalizes entertainment series into display-safe fields", () => {
    const series = normalizeKalshiSeriesResponse({
      series: [
        {
          ticker: "KXLIUSAELIMINATION",
          title: "who will be eliminated",
          category: "Entertainment",
          tags: ["Love Island USA", "Reality TV"],
          volume_fp: "6544452.00",
          last_updated_ts: "2026-06-10T15:03:06.205915Z",
          private_field: "secret",
        },
      ],
    });

    expect(series).toEqual([
      {
        ticker: "KXLIUSAELIMINATION",
        title: "who will be eliminated",
        category: "Entertainment",
        tags: ["Love Island USA", "Reality TV"],
        volume: 65444.52,
        volumeLabel: "$65.4K volume",
        updatedAt: "2026-06-10T15:03:06.205915Z",
        url: "https://kalshi.com/markets/KXLIUSAELIMINATION",
      },
    ]);
    expect(JSON.stringify(series)).not.toContain("secret");
  });

  it("normalizes Kalshi markets into price and volume labels", () => {
    const markets = normalizeKalshiMarketsResponse({
      markets: [
        {
          ticker: "KXOSCARDIR-27-PHI",
          event_ticker: "KXOSCARDIR-27",
          title: "Will Phil Lord & Christopher Miller win Best Director at the Oscars?",
          subtitle: "Phil Lord & Christopher Miller:: Project Hail Mary",
          status: "active",
          yes_bid_dollars: "0.0700",
          yes_ask_dollars: "0.0800",
          last_price_dollars: "0.1000",
          volume_fp: "3698.91",
          volume_24h_fp: "0.00",
          liquidity_dollars: "0.0000",
          rules_primary:
            "If Phil Lord & Christopher Miller has won Best Director at the 99th Academy Awards, then the market resolves to Yes.",
        },
      ],
    });

    expect(markets).toEqual([
      {
        ticker: "KXOSCARDIR-27-PHI",
        eventTicker: "KXOSCARDIR-27",
        title: "Will Phil Lord & Christopher Miller win Best Director at the Oscars?",
        subtitle: "Phil Lord & Christopher Miller:: Project Hail Mary",
        status: "active",
        yesBid: 0.07,
        yesAsk: 0.08,
        lastPrice: 0.1,
        volume: 36.9891,
        volume24h: 0,
        liquidity: 0,
        priceLabel: "Last 10%",
        volumeLabel: "$37 volume",
        rules: "If Phil Lord & Christopher Miller has won Best Director at the 99th Academy Awards, then the market resolves to Yes.",
        url: "https://kalshi.com/markets/KXOSCARDIR-27-PHI",
      },
    ]);
  });

  it("fetches series and markets without auth headers", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/series")) {
        return Response.json({
          series: [
            {
              ticker: "KXOSCARPIC",
              title: "Oscar for Best Picture",
              category: "Entertainment",
              tags: ["Oscars", "Awards"],
              volume_fp: "33027775.00",
              last_updated_ts: "2026-06-11T18:13:18.505291Z",
            },
          ],
        });
      }

      return Response.json({
        markets: [
          {
            ticker: "KXOSCARPIC-27-EXAMPLE",
            title: "Will Example win Best Picture at the Oscars?",
            yes_ask_dollars: "0.1200",
            volume_fp: "10000.00",
          },
        ],
      });
    });

    const series = await fetchKalshiEntertainmentSeries({ fetcher });
    const markets = await fetchKalshiSeriesMarkets("KXOSCARPIC", { fetcher });

    expect(series[0]?.ticker).toBe("KXOSCARPIC");
    expect(markets[0]?.priceLabel).toBe("Best ask 12%");
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { accept: "application/json" },
      }),
    );
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("Authorization");
  });
});
