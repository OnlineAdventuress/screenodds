# Parlay and xAI Signal Layers

ScreenOdds uses Parlay as an optional server-side discovery layer for related prediction markets. The current integration reads `PARLAY_API_KEY`, calls Parlay with the `X-API-Key` header, and never serializes the key into URLs, page props, logs, or client code.

The live page path is deliberately conservative:

- Existing Polymarket Gamma and fallback fixtures remain the primary market data path.
- Parlay adds a "Related prediction markets" external signal when matching markets are available.
- Failed or missing Parlay responses fall back to existing ScreenOdds context.

xAI/Grok is stored as `XAI_API_KEY` for the social sentiment scanner. xAI's X Search tool can search real-time X posts, but it is billed per tool invocation, so it runs in explicit scripts or scheduled jobs, not during Next.js page builds.

Current scan command:

```bash
npm run sentiment:scan -- --market love-island-odds --dry-run
npm run sentiment:scan -- --market love-island-odds
npm run sentiment:scan -- --all
```

The script saves cited summaries and scored stance items to `reports/social-sentiment/` before any article or market page consumes them. `--dry-run` is deterministic and does not require `XAI_API_KEY`.

## Social-Implied Probability

ScreenOdds now maps cached scored sentiment items into a social-implied probability with `src/lib/sentiment-signal.ts`.

The scoring model is intentionally staged:

- `relevance`: whether the item is actually about the market question.
- `stance`: whether the item leans toward the market's YES/current direction, not whether the post sounds positive or negative.
- `confidence`: scorer confidence in that relevance and stance.
- `recency`: items outside the trailing 30-day window are dropped, and older items receive decay.
- `engagement`: discussion with more engagement receives more weight, capped by config.

The weighted stance index is mapped to probability with a documented logistic placeholder. This is not a calibrated trading edge. It is a ScreenOdds divergence signal that should be backtested against resolved outcomes before being presented as a stronger forecast.

Important guardrails:

- A signal only appears when divergence clears the configured threshold and sample size is high enough.
- Low-sample snapshots are shown as context only.
- Paid API calls stay server-side in scripts.
- Cached reports must never include API keys, raw bearer tokens, or full unreviewed xAI payloads.
