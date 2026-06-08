# ScreenOdds Design Spec

## Goal

Build ScreenOdds as an SEO-first entertainment prediction-market website for `screenodds.com`. The site turns live Polymarket entertainment markets into indexable hubs, market detail pages, and SEO articles for movies, box office, awards, TV/streaming, and reality TV.

## Approved Direction

Create a new project at `C:\Users\longl\Documents\Codex\antigravity\screenodds`. Do not repurpose `aimodelodds`; reuse its proven architectural patterns only.

## Audience

The primary users are search visitors looking for Oscar odds, Polymarket Oscars, box office markets, next James Bond actor odds, reality TV winner odds, and market-implied entertainment probabilities. The site should be readable for casual pop-culture searchers while credible for prediction-market users.

## Market Evidence

Live Polymarket tags checked on June 7-8, 2026:

- Movies tag `53`: about 70 active events and roughly `$34.8M` 30-day volume.
- Culture tag `596`: about 263 active events and roughly `$60.1M` 30-day volume, but noisy.
- Box office tag `51`: about 7 active events and roughly `$610K` 30-day volume, with fresh weekend market intent.
- Awards tag `18`: about 55 active events and roughly `$5.0M` 30-day volume.
- Reality TV tag `100339`: about 13 active events and low current 30-day volume, but useful SEO demand.
- Top Netflix tag `102952`: about 8 active events and roughly `$74K` 30-day volume.

DataForSEO evidence from US Google Ads and Labs:

| Keyword | US Search Volume | KD | Decision |
|---|---:|---:|---|
| `best picture odds` variants | 1,600 | 7-32 | Launch awards hub and article. |
| `polymarket oscars` | 720 | 0 | Launch direct-intent page. |
| `love island odds` | 390 | 0-2 | Launch reality TV page. |
| `grammy odds` | 320 | 0-5 | Add seasonal awards page. |
| `next james bond actor odds` | 170 | 6 | Launch movie/culture page. |
| `big brother odds` | 140 | 0-8 | Launch reality TV page. |
| `tony awards odds` | 90 | 0 | Launch awards page. |
| `polymarket box office` | 30 | 1 | Launch box office hub despite low measured volume. |

Avoid generic `movie odds` because Google treats it as the 1984 film *Against All Odds*.

## Information Architecture

- `/`: homepage and live ScreenOdds desk.
- `/movies`: movie-market hub.
- `/box-office`: opening weekend, domestic gross, and highest-grossing markets.
- `/awards`: Oscars, Grammys, Tonys, and other culture awards.
- `/tv`: TV and streaming markets, including Netflix Top 10 style pages.
- `/reality-tv`: reality competition and dating-show markets.
- `/markets/[slug]`: individual Polymarket market detail pages.
- `/blog`: SEO article index.
- `/blog/[slug]`: gold-standard SEO articles.
- `/api/markets`: JSON endpoint for normalized live/fallback markets.

Launch SEO pages:

- `/awards/polymarket-oscars`
- `/awards/best-picture-odds`
- `/awards/grammy-odds`
- `/awards/tony-awards-odds`
- `/reality-tv/love-island-odds`
- `/reality-tv/big-brother-odds`
- `/movies/next-james-bond-actor-odds`

## Data Sources

- Polymarket Gamma API for events, tags, markets, prices, volume, liquidity, slugs, and descriptions.
- Polymarket CLOB API later for richer order-book detail if needed.
- DataForSEO for keyword volume, keyword difficulty, and SERP-backed content prioritization.
- TMDb and OMDb adapters later for movie metadata, posters, releases, and ratings.
- Licensed box office data later if The Numbers/OpusData data is needed beyond public page context.

## Data Model

Normalize all live and fallback markets into:

- `id`
- `title`
- `slug`
- `description`
- `category`
- `vertical`
- `tags`
- `probability`
- `noProbability`
- `volume1mo`
- `volume24hr`
- `volume1wk`
- `liquidity`
- `endDate`
- `updatedAt`
- `source`

Categories:

- `Movies`
- `Box Office`
- `Awards`
- `TV & Streaming`
- `Reality TV`
- `Culture`

## Product Behavior

- Fetch live Polymarket events for approved entertainment tags.
- Normalize events into stable market records.
- Fall back to curated fixtures if a live API request fails or returns no useful markets.
- Compute summary metrics: total events, one-month volume, 24-hour volume, liquidity, top market, and category counts.
- Rank markets with an opportunity heuristic based on search relevance, volume, liquidity, market freshness, and category priority.
- Render SEO pages as server components so content is indexable.
- Add client-side filters only on dashboard-style components where they do not hide core crawlable content.

## Content Strategy

Launch articles are Type B SEO articles adapted from the gold-standard content process:

- `Polymarket Oscars Odds: How Prediction Markets Price Best Picture`
- `Best Picture Odds: What Prediction Markets Are Saying`
- `Love Island Odds: How Reality TV Prediction Markets Work`
- `Big Brother Odds: Winner Markets and Reality TV Signals`
- `Next James Bond Actor Odds: Market-Implied Favorites`

Each article must include:

- One DataForSEO-backed primary keyword.
- 2-5 internal links to relevant hubs/markets.
- Live market cards when applicable.
- FAQ schema when accurate.
- Helpful disclaimers that market probabilities are not financial advice.

## Image Strategy

Use Kie.ai ChatGPT Image 2 via `KIE_API_KEY` from `C:\Users\longl\Desktop\Shared-Sync\.env`.

Initial generated assets:

- Homepage OG image: cinematic prediction-market control room with film reels, award envelopes, and market charts.
- Awards article hero image.
- Reality TV article hero image.
- Box office hub hero image.

Image prompts must request editorial-style, non-infringing visuals. Avoid real logos, actor likenesses, copyrighted show stills, or fake official Polymarket UI.

## Design Direction

The UI should feel like an entertainment trading desk, not a casino page:

- Dark cinema-black base.
- Signal colors: teal, amber, ruby, and off-white.
- Compact data cards, live market strips, probability bars, and editorial article blocks.
- No purple-blue gradient SaaS look.
- Use posters/hero artwork only where licensed or generated safely.
- Mobile first, with dense but readable market cards.

## Compliance

- Show market data and outbound links as informational content.
- Do not call prediction markets “risk-free,” “guaranteed,” or “bets to place.”
- Add affiliate disclosure near outbound CTAs.
- Add geoblock-aware CTA behavior before any direct trading route.
- Use `rel="sponsored nofollow"` for referral links once enabled.

## Autoresearch Loop

Apply Karpathy’s autoresearch pattern to SEO:

1. Pick a measurable metric: impressions, clicks, average position, CTR, or index coverage.
2. Make one scoped content/internal-linking change.
3. Wait for measurable data from GSC/DataForSEO.
4. Keep changes that improve the metric.
5. Revert or revise patterns that do not improve.

Record each experiment in `.Codex/learnings.md` and future `docs/seo-experiments/`.

## Verification

Before claiming completion:

- `npm run test`
- `npm run build`
- Review generated page metadata and sitemap output.
- Open the local site and inspect desktop/mobile layouts.
- Verify any generated images render and have useful alt text.

## Deployment

Target deployment: Vercel with `screenodds.com`.

The first deploy requires:

- GitHub repo `OnlineAdventuress/screenodds`.
- Vercel project ID recorded in this `AGENTS.md` after project creation.
- Domain `screenodds.com` attached to the Vercel project.
