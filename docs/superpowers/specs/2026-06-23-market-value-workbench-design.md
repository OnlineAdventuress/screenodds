# ScreenOdds Market Value Workbench Design

## Goal

Upgrade the existing Signal Lab into a Market Value Workbench that helps readers decide whether an entertainment prediction-market price is useful, noisy, or worth deeper research.

The workbench should make ScreenOdds market pages more valuable than a raw Polymarket mirror by combining probability math, market-depth warnings, source freshness, sentiment context, and next-step research links in one crawlable, practical tool.

## User Problem

Entertainment-market readers usually land with one of four questions:

- What does this market price imply?
- Is the price supported by enough volume, liquidity, and source context?
- How different is the market from my own estimate?
- What should I check before treating the market as a useful signal?

The current Signal Lab answers part of this by comparing market probability with the reader's estimate. It does not yet turn that comparison into a fuller workflow with fair-price math, evidence weighting, source freshness, and natural next links.

## Product Approaches Considered

### Approach A: Standalone Tools Center

Create a new `/tools` area with prediction-market calculators and glossary content.

Trade-off: This can rank for calculator keywords later, but it is less valuable to readers who arrive on Oscars, box office, or reality TV market pages. It also risks becoming a thin tools page unless it is connected to live examples.

### Approach B: Market-Page Workbench

Upgrade the current Signal Lab on every market page into a richer workbench. Keep the user estimate client-side, but add fair-price math, evidence breakdowns, checklist prompts, and internal research links from the existing server model.

Trade-off: This touches existing market-page logic and the Signal Lab model, so tests must protect against compliance and build regressions. It is the strongest near-term value because every market page becomes more useful.

### Approach C: Account-Based Saved Views

Let users save estimates, monitor price changes, and build watchlists.

Trade-off: This could improve retention, but it introduces auth, persistence, notification logic, privacy considerations, and stronger compliance copy before the informational product is proven.

Recommendation: Build Approach B now. Add the standalone tools center after the market-page workbench is live and can be reused as the canonical calculator model.

## Scope

In scope:

- Extend `src/lib/signal-lab.ts` with deterministic value-workbench fields.
- Keep the existing `SignalLab` component as the integration point to avoid unnecessary file churn.
- Add implied-price and fair-price helper math.
- Add an evidence breakdown for market depth, source coverage, sentiment freshness, and catalyst clarity.
- Add a reader checklist that turns signals into practical research steps.
- Add natural internal links to the category hub and related research pages where available.
- Keep all user-entered estimates browser-local.
- Add focused tests for the new math, model fields, rendering, and compliance copy.

Out of scope:

- Trading recommendations, staking advice, or action CTAs.
- User accounts, saved estimates, alerts, or notifications.
- Client-side API calls to Polymarket, Parlay, Kalshi, xAI, TMDb, or TVmaze.
- New paid data dependencies.
- Renaming or refactoring unrelated market-page components.

## Architecture

Use the existing Signal Lab boundary:

- `src/lib/signal-lab.ts` remains the server-safe model builder.
- `src/components/signal-lab.tsx` remains the client component for the interactive estimate control.
- `src/app/markets/[slug]/page.tsx` continues to build the model from the seeded market, external signals, and sentiment pulse.
- `src/app/markets/[slug]/page.tsx` should pass the already-computed related markets into the model builder so research links can be generated without a second lookup.

The implementation should extend the model rather than replacing it. That keeps existing market pages, source tests, and rendered copy stable while adding richer sections.

## Data Model Additions

Add the following fields to `SignalLabModel`:

```ts
valueMath: {
  marketYesPriceCents: number;
  marketNoPriceCents: number;
  defaultReaderYesPriceCents: number;
  breakEvenProbabilityLabel: string;
  priceSummary: string;
};
evidenceBreakdown: Array<{
  label: string;
  score: number;
  status: "positive" | "neutral" | "warning";
  detail: string;
}>;
readerChecklist: Array<{
  label: string;
  detail: string;
}>;
researchLinks: Array<{
  label: string;
  href: string;
  detail: string;
}>;
```

Helper functions should remain deterministic and separately testable:

- `probabilityToCents(probability: number): number`
- `comparePriceToReaderEstimate(marketProbability: number, readerProbabilityPercent: number)`
- `buildEvidenceBreakdown(...)`
- `buildReaderChecklist(...)`
- `buildResearchLinks(...)`

`BuildSignalLabInput` should add an optional `relatedMarkets` field. When this field is missing, the workbench still renders with category and guide links only.

## Calculator Behavior

The user still enters a 1-99 percent probability estimate.

The upgraded calculator should show:

- Market-implied yes price in cents.
- Reader-implied fair yes price in cents.
- Difference in percentage points.
- Plain-English interpretation:
  - `Market is above your estimate`
  - `Market is below your estimate`
  - `Market is close to your estimate`
- A neutral caveat that the comparison is informational and depends on market rules, liquidity, fees, and source confidence.

Avoid copy such as `bet`, `buy`, `sell`, `wager`, `lock`, `free money`, or `guaranteed value`.

## Evidence Breakdown

The workbench should show four compact evidence rows:

- Market depth: volume and liquidity.
- Source coverage: external signals and whether at least one is live.
- Sentiment freshness: cached 30-day sentiment and confidence when present.
- Catalyst clarity: whether the category has clear upcoming resolution drivers.

Each row gets a 0-100 score, a status label, and visible reasoning. The score is explanatory only and must not imply a trade recommendation.

## Reader Checklist

The checklist should be category-aware:

- Awards: check nominations, guild results, critic/festival context, ceremony timing, and resolution rules.
- Box Office: check weekend estimates, final grosses, release calendar, theater count, and comparable titles.
- Reality TV: check episode timing, public vote windows, contestant field, spoiler risk, and finale format.
- TV/Streaming: check release calendar, platform chart signals, renewal/cancellation sources, and TVmaze/TMDb metadata.
- Movies/Culture: check official announcements, trade reporting, release timing, and market rules.

The checklist is a user-aid, not advice. It should use verbs like `Check`, `Compare`, `Confirm`, and `Watch`.

## Research Links

Each market workbench should expose natural internal links:

- The matching category hub.
- One related market when available.
- One evergreen guide or useful research page when a deterministic mapping exists.

This is both a user feature and an SEO improvement. Links must be crawlable, contextual, and not stuffed into a generic sitewide block.

## UI

Keep the existing ScreenOdds dark, dense, data-desk style.

The panel should remain one `screen-panel`, not nested cards inside cards. Use bordered sub-sections inside the panel only where they clarify calculator, evidence, checklist, and research link groups.

Layout:

- Header: `Market Value Workbench`, plus reliability score. The component can remain named `SignalLab` in code to keep the existing integration stable.
- Calculator: market probability, reader probability, market price, fair price, difference.
- Evidence breakdown: 4 compact rows or grid cells.
- Research checklist: 4-6 category-specific checks.
- Research links: 2-3 natural next links.
- Methodology: short, crawlable, neutral copy.

Mobile:

- Stack controls vertically.
- Keep numeric values readable.
- Prevent horizontal overflow from labels and currency strings.

## SEO

This supports market-page intent around:

- `polymarket probability calculator`
- `prediction market value calculator`
- `polymarket implied probability`
- `polymarket analytics`
- `prediction market signals`
- Entertainment long tails such as Oscars, box office, Love Island, Big Brother, and awards prediction searches.

Visible text should explain the feature in natural language. Do not hide all value inside JavaScript-only state.

## Error Handling

The workbench must render with fallbacks:

- Missing external signals lowers source coverage but does not hide the panel.
- Missing sentiment lowers sentiment freshness but does not fail the page.
- Invalid reader input clamps to 1-99 percent.
- Missing related links simply reduces the number of research links.
- Static builds must not call paid APIs from the client.

## Testing

Add or update tests for:

- Probability-to-cents conversion and clamping.
- Market-vs-reader comparison labels.
- Evidence breakdown scoring for strong and thin markets.
- Checklist generation by category.
- Research link generation without duplicate or invalid links.
- `SignalLab` rendering for calculator, evidence, checklist, research links, and methodology.
- Visible copy does not include prohibited trading-action words.
- Market page still imports and renders `ExternalSignals`, `SentimentPulse`, and `SignalLab`.

Verification after implementation:

- `npm run lint`
- `npm run test`
- `npm run build`
- Production deploy through the established Netlify two-step flow.
- Check at least one market page on production for rendered workbench content.

## Rollout

Phase 1:

- Upgrade the existing Signal Lab model and component.
- Add tests and ship on seeded market pages.

Phase 2:

- Reuse the same math in a future `/tools` page if keyword research supports it.
- Add article embeds for evergreen guides that need calculator context.

Phase 3:

- Consider watchlists or alerts only after the informational workflow proves useful in search and engagement data.

## Success Criteria

- A reader can understand market probability, their fair estimate, evidence strength, and next checks within one market page visit.
- The feature adds original utility beyond raw Polymarket data.
- Market pages gain more crawlable, useful content without creating compliance risk.
- Existing external-signal, sentiment, and related-market sections remain intact.
- Lint, tests, and build pass before deployment.
