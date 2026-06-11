# Parlay and xAI Signal Layers

ScreenOdds uses Parlay as an optional server-side discovery layer for related prediction markets. The current integration reads `PARLAY_API_KEY`, calls Parlay with the `X-API-Key` header, and never serializes the key into URLs, page props, logs, or client code.

The live page path is deliberately conservative:

- Existing Polymarket Gamma and fallback fixtures remain the primary market data path.
- Parlay adds a "Related prediction markets" external signal when matching markets are available.
- Failed or missing Parlay responses fall back to existing ScreenOdds context.

xAI/Grok is stored as `XAI_API_KEY` for a later social sentiment scanner. xAI's X Search tool can search real-time X posts, but it is billed per tool invocation, so it should run in explicit scripts or scheduled jobs, not during Next.js page builds.

Recommended next script shape:

```bash
npm run scan:social-sentiment -- --query "Love Island USA Season 8" --from 2026-06-01
```

That script does not exist yet. When added, it should save cited sentiment summaries to `reports/social-sentiment/` before any article or market page consumes them.
