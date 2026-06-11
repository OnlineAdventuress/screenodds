import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketCard } from "./market-card";
import type { Market } from "@/lib/markets";

function makeMarket(partial: Partial<Market>): Market {
  return {
    id: "love-island-odds",
    title: "Who will win Love Island USA Season 8?",
    slug: "love-island-odds",
    description: "Reality TV prediction market.",
    category: "Reality TV",
    vertical: "Reality TV",
    tags: ["Reality TV", "Love Island"],
    probability: 0.16,
    noProbability: 0.84,
    volume1mo: 244,
    volume24hr: 0,
    volume1wk: 244,
    liquidity: 4200,
    endDate: null,
    updatedAt: "2026-06-08T00:00:00Z",
    source: "fallback",
    ...partial,
  };
}

describe("MarketCard", () => {
  it("links seeded ScreenOdds markets to internal detail pages", () => {
    const html = renderToStaticMarkup(<MarketCard market={makeMarket({})} />);

    expect(html).toContain('href="/markets/love-island-odds"');
    expect(html).not.toContain('target="_blank"');
  });

  it("links live Polymarket markets to their source URL instead of missing local pages", () => {
    const html = renderToStaticMarkup(
      <MarketCard
        market={makeMarket({
          id: "2382065",
          slug: "who-will-win-love-island-usa-season-8-women",
          source: "polymarket",
          sourceUrl:
            "https://polymarket.com/event/who-will-win-love-island-usa-season-8-women",
        })}
      />,
    );

    expect(html).toContain(
      'href="https://polymarket.com/event/who-will-win-love-island-usa-season-8-women"',
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
    expect(html).not.toContain('/markets/who-will-win-love-island-usa-season-8-women');
  });
});
