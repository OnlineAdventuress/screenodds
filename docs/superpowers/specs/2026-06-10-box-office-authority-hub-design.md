# Box Office Authority Hub Design

## Goal

Upgrade `/box-office` from a generic category hub into a source-backed authority page for box office prediction markets. The page should help a reader connect market prices to the real-world signals that matter: release calendars, comparable titles, source reliability, weekend-reporting cadence, and related ScreenOdds markets.

## Scope

This slice builds the first reusable authority-page pattern for ScreenOdds. It focuses on box office because that is the clearest commercial SEO wedge and has a natural data story.

In scope:
- A custom `/box-office` page, not the generic `HubPageTemplate`.
- A typed box office data module with deterministic fallbacks.
- TMDb-powered upcoming movie metadata when `TMDB_API_READ_TOKEN` or `TMDB_API_KEY` is available.
- A source stack that explains which external sources ScreenOdds should use for box office pages.
- Market mapping that highlights box office and year-end movie-gross markets.
- Tests proving fallback behavior, provider credential handling, and market filtering.

Out of scope:
- Scraping Box Office Mojo, The Numbers, or Comscore during page render.
- Claiming current weekend grosses unless a source-backed data provider is added.
- Adding affiliate CTAs or trading instructions.
- Random image search downloads or unlicensed stills.

## Architecture

Add `src/lib/box-office.ts` as the single data boundary for box office authority content. It will expose functions to build the page model from existing market data and optional TMDb upcoming-release results. The page component will call that boundary and render stable sections.

Add `src/components/box-office-authority-hub.tsx` for the visual page body. It will reuse existing `MarketCard`, `MetricCard`, `LatestNews`, and `RelatedLinks` patterns where appropriate, while adding dense tables/lists for sources, watchlist titles, and methodology.

Update `src/app/box-office/page.tsx` to use the new component and preserve SEO metadata.

## Data Flow

1. `/box-office` calls `fetchEntertainmentMarkets()`.
2. `getBoxOfficeHubData(markets)` filters relevant prediction markets and builds the authority model.
3. If TMDb credentials exist, `fetchTmdbUpcomingMovies()` fetches upcoming US movie metadata with a 6-hour revalidation window.
4. If TMDb is missing or unavailable, the page renders deterministic fallback watchlist entries.
5. The UI shows source provenance and fallback/live state visibly.

## Error Handling

The page must render even if every external provider fails. TMDb errors are swallowed at the data boundary and replaced by fallback watchlist entries. Returned public page data must never serialize API keys or bearer tokens.

## SEO

The page targets terms around `polymarket box office`, `box office prediction markets`, `opening weekend odds`, and `highest grossing movie odds`. It should include useful visible text, source links, crawlable market links, and internal links to news/blog pages.

## Testing

Tests should cover:
- Box office market filtering includes Box Office and highest-grossing movie markets.
- Missing TMDb credentials do not call fetch and still return useful fallback data.
- TMDb request construction keeps bearer tokens out of public URLs.
- Mock TMDb responses become public upcoming-release entries without serializing credentials.
- The final page model includes source stack, methodology entries, market links, and watchlist entries.
