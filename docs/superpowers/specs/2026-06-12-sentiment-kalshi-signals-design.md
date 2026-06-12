# Sentiment and Kalshi Signals Design

## Goal

Add a cached sentiment and comparison-market signal layer to ScreenOdds market pages. The first slice should help readers see what X/social discussion, Polymarket activity, and Kalshi entertainment markets are signaling without making page builds depend on paid social APIs or live third-party availability.

## Scope

This slice targets seeded ScreenOdds market detail pages, starting with Love Island, Oscars Best Picture, and highest-grossing movie coverage. It adds a reusable cached signal model, a server-side scan script, a Kalshi public market client, and a compact market-page UI card.

In scope:
- Cached JSON sentiment snapshots read by the app at build/render time.
- xAI/Grok X Search as the first direct social source.
- Optional `last30days` compatibility for local research runs and report generation.
- Public unauthenticated Kalshi market data as comparison-market context.
- Deterministic fallback snapshots so pages build without xAI, Kalshi, or local research tooling.
- Tests proving secret-safe requests, cache reading, fallback behavior, and UI rendering.

Out of scope:
- Calling xAI, Grok, or `last30days` from Next.js page components.
- Treating social sentiment as trading advice.
- Kalshi affiliate CTAs or sponsored links.
- Live Reddit, TikTok, YouTube, or Instagram ingestion in this first slice.
- Automated news publishing based only on sentiment.

## Architecture

Add a focused sentiment boundary under `src/lib/sentiment.ts`. It reads normalized JSON snapshots from `reports/social-sentiment/`, falls back to local deterministic fixtures, and exposes a compact `SentimentPulse` model for market pages.

Add `src/lib/kalshi.ts` as a public market-data client. It will call Kalshi's unauthenticated production API for Entertainment series and markets, normalize only safe display fields, and never require user auth or affiliate credentials.

Add `scripts/social-sentiment-scan.mjs` as the explicit paid/API entry point. It loads keys from shared env, runs xAI X Search for configured ScreenOdds topics, optionally notes local `last30days` status, enriches with Kalshi public market context, and writes normalized snapshots to `reports/social-sentiment/`.

Add `src/components/sentiment-pulse.tsx` to render the cached data on market pages below existing external data signals. The component should be informational, compact, and visibly dated.

## Data Model

Each snapshot is a JSON object:

```json
{
  "marketSlug": "love-island-odds",
  "query": "Love Island Polymarket",
  "checkedAt": "2026-06-12T00:00:00.000Z",
  "windowDays": 30,
  "sentimentLabel": "mixed",
  "summary": "X discussion is focused on new Love Island markets and Polymarket/Kalshi competition.",
  "topNarratives": [
    "Polymarket added Love Island USA markets",
    "Kalshi is also active around Love Island outcomes",
    "Audience discussion treats reality TV markets as a culture-market test"
  ],
  "sourceCounts": {
    "x": 10,
    "reddit": 0,
    "polymarket": 2,
    "kalshi": 3
  },
  "citedPosts": [
    {
      "source": "x",
      "author": "PredictionNews_",
      "url": "https://x.com/PredictionNews_/status/2062231921791541519",
      "date": "2026-06-03",
      "engagementLabel": "4 likes",
      "text": "Polymarket is continuing to expand its U.S. app, with new culture markets now appearing for users."
    }
  ],
  "relatedMarkets": [
    {
      "source": "kalshi",
      "title": "who will be eliminated",
      "url": "https://kalshi.com/markets/KXLIUSAELIMINATION",
      "priceLabel": "Best ask 36%",
      "volumeLabel": "$65.4K volume"
    }
  ],
  "confidence": "live"
}
```

Public app code should tolerate missing, partial, or invalid snapshots by returning fallback content.

## Data Flow

1. A human or scheduled job runs `npm run sentiment:scan -- --market love-island-odds`.
2. The script loads `XAI_API_KEY` from `process.env` or `C:\Users\longl\Desktop\Shared-Sync\.env`.
3. The script calls xAI X Search for the configured query and date window.
4. The script calls Kalshi public endpoints for Entertainment series and matching markets.
5. The script normalizes counts, narratives, cited posts, and related markets into `reports/social-sentiment/{marketSlug}.json`.
6. `getSentimentPulseForMarket()` reads the cached snapshot during page render.
7. If the snapshot is absent or invalid, deterministic fallback copy is returned.
8. `SentimentPulse` renders below `ExternalSignals` on market detail pages.

## Error Handling

No page render may call paid APIs. Missing files, invalid JSON, failed Kalshi responses, or missing xAI credentials must not fail `npm run build`. The scan script should exit non-zero only when explicitly asked to scan with missing required credentials; the app itself should continue with fallback data.

The scan script must never write API keys, bearer tokens, request headers, or raw full xAI payloads into committed reports. Cited social posts should be short excerpts with source URLs, authors, dates, and engagement labels.

## Kalshi Policy

Kalshi data is used only as public comparison-market context. Links should use `rel="nofollow noopener noreferrer"` and neutral labels such as "Kalshi market context." No affiliate disclosure is required until an affiliate or sponsored relationship exists, and no copy should imply that ScreenOdds is recommending a trade.

## UI

The market detail page should show a compact panel titled "Sentiment pulse." It should include:
- Last checked date and lookback window.
- Sentiment label and one-paragraph summary.
- Three to five narrative bullets.
- Source counts for X, Reddit, Polymarket, and Kalshi when present.
- One to three cited posts or market links.

The design should match the existing dark, dense ScreenOdds panels. It should not add a landing-page style hero or promotional CTA.

## Testing

Tests should cover:
- `getSentimentPulseForMarket()` returns deterministic fallback content when no snapshot exists.
- Valid snapshots are parsed and exposed without leaking secrets.
- Invalid snapshots fall back instead of throwing.
- Kalshi request builders produce unauthenticated public URLs.
- Kalshi normalizers map series and market responses into display-safe fields.
- `SentimentPulse` renders labels, source counts, cited links, and related market links.
- Market pages include the component while preserving existing external-signal behavior.

## Operations

The first operational targets are:
- `love-island-odds` with query `Love Island Polymarket`.
- `polymarket-oscars-best-picture` with query `Polymarket Oscars Best Picture Kalshi`.
- `highest-grossing-movie-in-2026` with query `highest grossing movie Polymarket Kalshi`.

The script should include a `--dry-run` mode that prints the normalized snapshot without writing files. Windows runs of local `last30days` should set `PYTHONUTF8=1` and `PYTHONIOENCODING=utf-8` to avoid Unicode write failures.
