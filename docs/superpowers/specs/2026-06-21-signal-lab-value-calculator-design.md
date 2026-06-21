# ScreenOdds Signal Lab Design

## Goal

Add a reusable Signal Lab feature that helps ScreenOdds readers judge whether an entertainment prediction-market price is meaningful, noisy, or worth deeper research. The feature should make market probabilities easier for casual movie, awards, box office, streaming, and reality TV readers while still giving experienced prediction-market users useful liquidity, source, and catalyst context.

## Target Reader

The first version is casual-first. A reader may arrive from Google after searching `oscar predictions 2026`, `2026 box office predictions`, `polymarket oscars`, or a reality TV odds query and may not already understand implied probability, volume, liquidity, spreads, or source confidence.

The page should explain the market in plain English first, then expose the deeper signal stack for readers who want to inspect why the score was assigned.

## Product Approaches Considered

### Approach A: Standalone Calculator Page

Create `/tools/prediction-value-calculator` as a single utility where users type a market price and their own probability.

Trade-off: This is easy to build and rank for calculator keywords, but it is disconnected from ScreenOdds article and market pages. It does not strengthen individual Oscars, box office, or reality TV pages unless users leave the article.

### Approach B: Embedded Signal Lab Panels

Add a reusable Signal Lab panel to market pages and high-intent guide pages. It combines implied probability, reader probability, liquidity warnings, signal scorecards, source confidence, and upcoming catalysts.

Trade-off: This requires tighter data modeling and more UI work, but it turns every authority page into a useful tool and creates stronger topical depth.

### Approach C: Full Account-Based Watchlist

Let users save markets, receive alerts, and track their probability estimates over time.

Trade-off: This could become a strong retention feature later, but it introduces auth, storage, email/push rules, and regulatory copy before the core information product is proven.

Recommendation: Build Approach B first, with one lightweight `/tools/value-calculator` landing page later if DataForSEO confirms calculator search demand.

## Scope

In scope:
- A reusable Signal Lab data model in `src/lib/signal-lab.ts`.
- A reusable UI component for the market detail page.
- A guide/article variant that can be embedded in evergreen guides without live market dependencies.
- A client-side value calculator where the reader enters their own probability estimate.
- Liquidity and confidence labels based on available market volume, liquidity, source type, and signal coverage.
- Catalyst lists for awards, box office, reality TV, and streaming market categories.
- Tests for probability math, score labels, fallback behavior, and UI rendering.

Out of scope:
- User accounts, saved watchlists, or email alerts.
- Trading recommendations, bet sizing, or financial advice.
- Calling paid APIs from client components.
- Relying on live third-party data during static page builds.
- Automated claims that a market is mispriced without showing uncertainty and source limits.

## Architecture

Add `src/lib/signal-lab.ts` as the main data boundary. It should accept a seeded market, optional external signals, and optional sentiment pulse data, then return a normalized `SignalLabModel`.

Add `src/components/signal-lab.tsx` as a client component for the interactive calculator and static signal display. It should receive the normalized model from server-rendered pages and keep all user-entered probability state in the browser.

Update `src/app/markets/[slug]/page.tsx` to render Signal Lab below existing external signals and sentiment. The market page already has the core inputs: seeded market probability, volume, liquidity, external signals, and sentiment pulse.

Add a smaller article embed, either through the same component with a `variant="article"` prop or a lightweight wrapper, after the first market-page version is stable.

## Data Model

`SignalLabModel` should include:

```ts
type SignalLabModel = {
  marketSlug: string;
  marketTitle: string;
  category: MarketCategory;
  marketProbability: number;
  probabilityLabel: string;
  defaultReaderProbability: number;
  volumeLabel: string;
  liquidityLabel: string;
  reliability: {
    score: number;
    label: "Strong signal" | "Developing signal" | "Thin signal" | "Needs review";
    summary: string;
    warnings: string[];
  };
  checks: Array<{
    label: string;
    status: "positive" | "neutral" | "warning";
    detail: string;
  }>;
  catalysts: Array<{
    label: string;
    dateLabel: string;
    sourceLabel: string;
  }>;
  methodology: string[];
};
```

The model should be deterministic. Missing external signals or sentiment should lower confidence gently but should not hide the component.

## Calculator Behavior

The reader enters their own probability estimate from 1 to 99 percent. The component compares that estimate with the market-implied probability.

It should show:
- Reader estimate.
- Market estimate.
- Difference in percentage points.
- Plain-English label:
  - `Market higher than your estimate`
  - `Market lower than your estimate`
  - `Close to your estimate`
- A short caveat that the comparison is informational and depends on liquidity, fees, market rules, and source confidence.

No copy should say "bet," "buy," "sell," "lock," "edge," or "guaranteed value." Use neutral wording such as "market is above your estimate."

## Reliability Scoring

The first scoring version should be explainable, not machine-learned.

Inputs:
- Market probability exists and is between 1 and 99 percent.
- One-month volume.
- 24-hour volume.
- Liquidity.
- Category-specific external signals.
- Sentiment snapshot freshness when present.
- Source confidence from official pages, box office data, TV schedules, or market-data providers.

Labels:
- `Strong signal`: meaningful volume/liquidity plus at least two supporting source categories.
- `Developing signal`: some source coverage but thin or uneven market data.
- `Thin signal`: low volume/liquidity or limited source confirmation.
- `Needs review`: missing source coverage, stale snapshot, or high uncertainty.

The UI must show why a label appears. A reader should not have to trust a hidden score.

## Category Signal Rules

Awards:
- Official awards calendar.
- Nomination status.
- Precursor/guild results.
- Critic/festival momentum.
- Market volume and liquidity.

Box Office:
- Latest gross data when available.
- Release calendar and upcoming competition.
- Opening weekend or worldwide-gross pace.
- Franchise comps and audience/critic signals.
- Market volume and liquidity.

Reality TV:
- Episode or finale timing.
- Public vote mechanics.
- Contestant/couple status.
- Social sentiment.
- Spoiler/rumor caution.
- Market volume and liquidity.

Streaming/TV:
- Release dates.
- Platform chart position where available.
- Renewal/cancellation source quality.
- TVmaze/TMDb metadata.
- Market volume and liquidity.

## UI

The Signal Lab panel should feel like a practical analysis tool, not a marketing section. Use the existing dark ScreenOdds visual language, dense rows, compact cards, and restrained color.

Layout:
- Header: `Signal Lab` plus a short label such as `Market price vs. your view`.
- Calculator row: market probability, input/slider for reader probability, difference label.
- Reliability row: score label, summary, warnings.
- Signal checklist: 4-6 compact checks.
- Catalyst list: 2-4 upcoming or evergreen catalysts.
- Methodology footnote: concise, neutral, and crawlable.

Mobile behavior:
- Stack calculator controls vertically.
- Keep numeric values large enough to scan.
- Avoid horizontal overflow and avoid text inside cramped pills.

## SEO

This feature should support keywords around:
- `prediction value calculator`
- `polymarket probability calculator`
- `polymarket implied probability`
- `polymarket analytics`
- `prediction market signals`
- Entertainment-specific long tails such as `oscar predictions 2026`, `box office predictions`, and `reality tv odds`.

The market-page integration should add useful visible explanatory text, not hide the value behind JavaScript-only widgets. Article embeds should link naturally to the relevant market page and to Polymarket analytics, tracker, and volume guides.

## Error Handling

The component must render with deterministic fallback data. Missing sentiment, external signals, Parlay, Kalshi, or live Polymarket data must not break static builds or market pages.

The calculator should clamp invalid user input to 1-99 percent and keep the UI stable. It should never persist or transmit user estimates in the first version.

## Testing

Tests should cover:
- Probability difference math and label thresholds.
- Clamping reader estimates to 1-99 percent.
- Reliability scoring for strong, developing, thin, and review states.
- Category-specific checklist generation.
- Fallback behavior when external signals or sentiment are missing.
- `SignalLab` renders the calculator, warnings, checks, catalysts, and methodology.
- Market pages include the component without removing `ExternalSignals` or `SentimentPulse`.
- Build output still includes all market pages and sitemap entries.

## Rollout

Phase 1:
- Add the model, tests, UI component, and market-page integration for seeded markets.
- Use existing seeded market, external signal, and sentiment data only.

Phase 2:
- Add article embeds for the new prediction guides and the Polymarket analytics/tracker/volume cluster.
- Add internal links from relevant guides to the market pages where Signal Lab appears.

Phase 3:
- Add a standalone `/tools/value-calculator` page only after the embedded version is live and keyword demand is confirmed.

## Success Criteria

- A casual reader can understand whether a market price is strong, thin, or developing within 30 seconds.
- Every seeded market page gains a useful interactive feature without needing account creation.
- The feature reinforces ScreenOdds authority by connecting market prices to source-backed entertainment signals.
- `npm run test`, `npm run lint`, and `npm run build` pass.
