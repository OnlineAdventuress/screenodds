# Market Value Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing Signal Lab into a Market Value Workbench that adds fair-price math, evidence scoring, category checklists, and crawlable research links to ScreenOdds market pages.

**Architecture:** Extend the existing `src/lib/signal-lab.ts` model builder and `src/components/signal-lab.tsx` component instead of creating a new feature stack. The market page already gathers the required server-side inputs, so it should pass related markets into `buildSignalLabModel` and keep all reader-entered estimates local to the client component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Vitest, `react-dom/server` component rendering tests.

## Global Constraints

- Do not hardcode API keys.
- Do not add client-side API calls to Polymarket, Parlay, Kalshi, xAI, TMDb, or TVmaze.
- Polymarket data must render deterministic fallback fixtures when upstream APIs fail.
- Do not present trading recommendations, staking advice, or action CTAs.
- Avoid copy such as `bet`, `buy`, `sell`, `wager`, `lock`, `free money`, or `guaranteed value`.
- Keep user-entered estimates browser-local.
- Keep existing `ExternalSignals`, `SentimentPulse`, and `SignalLab` market-page integrations intact.
- Use the established Netlify verification path after implementation: `npm run lint`, `npm run test`, `npm run build`, then Netlify two-step deploy.

---

### Task 1: Extend Signal Lab Model With Value Math

**Files:**
- Modify: `src/lib/signal-lab.test.ts`
- Modify: `src/lib/signal-lab.ts`

**Interfaces:**
- Consumes: `Market`, `ExternalSignal`, `SentimentPulse`
- Produces:
  - `probabilityToCents(probability: number): number`
  - `comparePriceToReaderEstimate(marketProbability: number, readerProbabilityPercent: number): PriceComparison`
  - `SignalLabModel.valueMath`
  - `SignalLabModel.evidenceBreakdown`
  - `SignalLabModel.readerChecklist`
  - `SignalLabModel.researchLinks`
  - Optional `BuildSignalLabInput.relatedMarkets?: Market[]`

- [ ] **Step 1: Write failing tests for value math**

Add these cases to `src/lib/signal-lab.test.ts`:

```ts
import {
  buildSignalLabModel,
  clampReaderProbability,
  comparePriceToReaderEstimate,
  compareProbabilityEstimate,
  probabilityToCents,
} from "./signal-lab";

it("converts market probability into yes/no cents", () => {
  expect(probabilityToCents(0.224)).toBe(22);
  expect(probabilityToCents(0)).toBe(0);
  expect(probabilityToCents(1)).toBe(100);
  expect(probabilityToCents(Number.NaN)).toBe(0);
});

it("compares market price to the reader fair price using neutral labels", () => {
  expect(comparePriceToReaderEstimate(0.62, 50)).toMatchObject({
    marketYesPriceCents: 62,
    readerYesPriceCents: 50,
    differenceCents: 12,
    label: "Market is above your estimate",
  });
  expect(comparePriceToReaderEstimate(0.22, 35)).toMatchObject({
    marketYesPriceCents: 22,
    readerYesPriceCents: 35,
    differenceCents: -13,
    label: "Market is below your estimate",
  });
  expect(comparePriceToReaderEstimate(0.51, 50)).toMatchObject({
    label: "Market is close to your estimate",
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm run test -- src/lib/signal-lab.test.ts
```

Expected: FAIL because `probabilityToCents` and `comparePriceToReaderEstimate` are not exported yet.

- [ ] **Step 3: Implement value math and model fields**

In `src/lib/signal-lab.ts`, add:

```ts
export type PriceComparisonLabel =
  | "Market is above your estimate"
  | "Market is below your estimate"
  | "Market is close to your estimate";

export type PriceComparison = {
  marketYesPriceCents: number;
  readerYesPriceCents: number;
  differenceCents: number;
  label: PriceComparisonLabel;
  summary: string;
};

export function probabilityToCents(probability: number): number {
  if (!Number.isFinite(probability)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(probability * 100)));
}

export function comparePriceToReaderEstimate(
  marketProbability: number,
  readerProbabilityPercent: number,
): PriceComparison {
  const marketYesPriceCents = probabilityToCents(marketProbability);
  const readerYesPriceCents = clampReaderProbability(readerProbabilityPercent);
  const differenceCents = marketYesPriceCents - readerYesPriceCents;
  const label =
    Math.abs(differenceCents) <= 3
      ? "Market is close to your estimate"
      : differenceCents > 0
        ? "Market is above your estimate"
        : "Market is below your estimate";

  return {
    marketYesPriceCents,
    readerYesPriceCents,
    differenceCents,
    label,
    summary: `${label}. Difference: ${Math.abs(differenceCents)} cents on a $1-style probability scale.`,
  };
}
```

Extend `SignalLabModel` and `BuildSignalLabInput` with the fields named in the interfaces section. Populate `valueMath` in `buildSignalLabModel` using `probabilityToCents(market.probability)`, `100 - probabilityToCents(market.probability)`, and the clamped default reader estimate.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test -- src/lib/signal-lab.test.ts
```

Expected: PASS for the value-math tests and existing Signal Lab tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/signal-lab.ts src/lib/signal-lab.test.ts
git commit -m "feat: add market value math"
```

---

### Task 2: Add Evidence, Checklist, and Research Link Generation

**Files:**
- Modify: `src/lib/signal-lab.test.ts`
- Modify: `src/lib/signal-lab.ts`

**Interfaces:**
- Consumes:
  - `BuildSignalLabInput.relatedMarkets?: Market[]`
  - `ExternalSignal[]`
  - `SentimentPulse | null`
- Produces:
  - `buildEvidenceBreakdown(market, externalSignals, sentimentPulse, catalysts)`
  - `buildReaderChecklist(market)`
  - `buildResearchLinks(market, relatedMarkets)`

- [ ] **Step 1: Write failing model tests**

Add these assertions to the existing strong and thin model tests:

```ts
expect(model.valueMath).toMatchObject({
  marketYesPriceCents: 62,
  marketNoPriceCents: 38,
  defaultReaderYesPriceCents: 62,
});
expect(model.evidenceBreakdown.map((item) => item.label)).toEqual([
  "Market depth",
  "Source coverage",
  "Sentiment freshness",
  "Catalyst clarity",
]);
expect(model.readerChecklist.length).toBeGreaterThanOrEqual(4);
expect(model.readerChecklist[0]?.label).toMatch(/Check|Compare|Confirm|Watch/);
expect(model.researchLinks.some((link) => link.href === "/box-office")).toBe(true);
```

Add a related-market case:

```ts
const model = buildSignalLabModel({
  market: makeMarket({ category: "Awards", vertical: "Awards" }),
  relatedMarkets: [
    makeMarket({
      slug: "grammys-predictions",
      title: "Grammy odds",
      category: "Awards",
      vertical: "Awards",
    }),
  ],
});

expect(model.researchLinks.some((link) => link.href === "/markets/grammys-predictions")).toBe(true);
expect(new Set(model.researchLinks.map((link) => link.href)).size).toBe(model.researchLinks.length);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm run test -- src/lib/signal-lab.test.ts
```

Expected: FAIL because the new model fields are not populated yet.

- [ ] **Step 3: Implement deterministic generation**

Implement helpers in `src/lib/signal-lab.ts`:

```ts
const categoryHubPath: Record<MarketCategory, string> = {
  Movies: "/movies",
  "Box Office": "/box-office",
  Awards: "/awards",
  "TV & Streaming": "/tv",
  "Reality TV": "/reality-tv",
  Culture: "/",
};
```

Evidence scoring rules:

- Market depth score: `90` for volume `>= 250000` and liquidity `>= 50000`, `60` for volume `>= 1000` or liquidity `>= 5000`, else `30`.
- Source coverage score: `85` when any signal is live, `65` when at least two fallback signals exist, `45` when one signal exists, else `25`.
- Sentiment freshness score: `80` when sentiment confidence is `live`, `50` when a fallback pulse exists, else `25`.
- Catalyst clarity score: `75` when catalysts length is at least `3`, else `55` for at least `2`, else `35`.

Status mapping:

```ts
function statusFromScore(score: number): SignalCheckStatus {
  if (score >= 75) return "positive";
  if (score >= 45) return "neutral";
  return "warning";
}
```

Research links must include the category hub, the first distinct related market, and one deterministic guide path from this mapping when applicable:

```ts
const guidePathByCategory: Partial<Record<MarketCategory, { label: string; href: string; detail: string }>> = {
  Awards: {
    label: "Awards prediction guide",
    href: "/blog/oscar-predictions-2026",
    detail: "Read the broader awards-market framework before weighing one title.",
  },
  "Box Office": {
    label: "Box office prediction guide",
    href: "/blog/2026-box-office-predictions",
    detail: "Compare market prices with release timing, comps, and weekend data.",
  },
  "Reality TV": {
    label: "Reality TV odds guide",
    href: "/blog/reality-tv-odds",
    detail: "Review the reality TV checklist for votes, edits, and finale timing.",
  },
};
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test -- src/lib/signal-lab.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/signal-lab.ts src/lib/signal-lab.test.ts
git commit -m "feat: score market value evidence"
```

---

### Task 3: Render the Workbench UI

**Files:**
- Modify: `src/components/signal-lab.test.tsx`
- Modify: `src/components/signal-lab.tsx`

**Interfaces:**
- Consumes: extended `SignalLabModel`
- Produces: visible UI sections for `Market Value Workbench`, fair price, evidence breakdown, reader checklist, research links, and methodology.

- [ ] **Step 1: Update component test first**

Extend the fixture model in `src/components/signal-lab.test.tsx`:

```ts
valueMath: {
  marketYesPriceCents: 22,
  marketNoPriceCents: 78,
  defaultReaderYesPriceCents: 22,
  breakEvenProbabilityLabel: "22%",
  priceSummary: "A 22% market probability is roughly 22 cents on a $1-style probability scale.",
},
evidenceBreakdown: [
  {
    label: "Market depth",
    score: 60,
    status: "neutral",
    detail: "$8.7K liquidity and $628 one-month volume.",
  },
  {
    label: "Source coverage",
    score: 45,
    status: "neutral",
    detail: "One external signal is attached to this market page.",
  },
],
readerChecklist: [
  {
    label: "Check nomination timing",
    detail: "Confirm the next official awards calendar event before reading price moves.",
  },
],
researchLinks: [
  {
    label: "Awards hub",
    href: "/awards",
    detail: "Compare this market with the broader ScreenOdds awards page.",
  },
],
```

Then assert:

```ts
expect(html).toContain("Market Value Workbench");
expect(html).toContain("Market yes price");
expect(html).toContain("Fair yes price");
expect(html).toContain("Evidence breakdown");
expect(html).toContain("Reader checklist");
expect(html).toContain("Next research links");
expect(html).toContain("/awards");
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test -- src/components/signal-lab.test.tsx
```

Expected: FAIL because the UI does not render the new headings yet.

- [ ] **Step 3: Implement UI**

Update `src/components/signal-lab.tsx`:

- Change the visible H2 from `Market price vs. your view` to `Market Value Workbench`.
- Use `comparePriceToReaderEstimate` beside `compareProbabilityEstimate`.
- Add calculator metrics for `Market yes price`, `Market no price`, and `Fair yes price`.
- Add an `Evidence breakdown` section that maps `model.evidenceBreakdown`.
- Add a `Reader checklist` section that maps `model.readerChecklist`.
- Add a `Next research links` section that maps `model.researchLinks` with `Link` from `next/link`.

The compliance caveat should remain neutral:

```tsx
This comparison is informational and depends on liquidity, fees, market rules, and source confidence. Your estimate stays in this browser.
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test -- src/components/signal-lab.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/signal-lab.tsx src/components/signal-lab.test.tsx
git commit -m "feat: render market value workbench"
```

---

### Task 4: Wire Related Markets Into Market Pages

**Files:**
- Modify: `src/app/market-page-source.test.ts`
- Modify: `src/app/markets/[slug]/page.tsx`

**Interfaces:**
- Consumes: `const related = getRelatedMarkets(market)`
- Produces: `buildSignalLabModel({ market, externalSignals, sentimentPulse, relatedMarkets: related })`

- [ ] **Step 1: Update source integration test**

In `src/app/market-page-source.test.ts`, add:

```ts
expect(source).toContain("relatedMarkets: related");
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test -- src/app/market-page-source.test.ts
```

Expected: FAIL because the market page has not passed `relatedMarkets` yet.

- [ ] **Step 3: Update market page model call**

In `src/app/markets/[slug]/page.tsx`, change:

```ts
const signalLab = buildSignalLabModel({
  market,
  externalSignals,
  sentimentPulse,
});
```

to:

```ts
const signalLab = buildSignalLabModel({
  market,
  externalSignals,
  sentimentPulse,
  relatedMarkets: related,
});
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test -- src/app/market-page-source.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/market-page-source.test.ts src/app/markets/[slug]/page.tsx
git commit -m "feat: link workbench research paths"
```

---

### Task 5: Full Verification, Learning, Merge, and Deploy

**Files:**
- Modify: `.Codex/learnings.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified, pushed, deployed ScreenOdds feature on `screenodds.com`.

- [ ] **Step 1: Run focused test suite**

Run:

```bash
npm run test -- src/lib/signal-lab.test.ts src/components/signal-lab.test.tsx src/app/market-page-source.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: each command exits `0`.

- [ ] **Step 3: Record project learning**

Append a dated note to `.Codex/learnings.md`:

```md
## 2026-06-24 - Market Value Workbench

- What worked: Extending the existing Signal Lab model kept market-page utility server-safe while adding fair-price math, evidence scoring, category checklists, and internal research links.
- What broke: None if verification remains green.
- Pattern to remember: Reader tools should reuse existing market-page server inputs and avoid client-side provider calls.
```

- [ ] **Step 4: Commit learning**

```bash
git add .Codex/learnings.md
git commit -m "docs: record market value workbench learning"
```

- [ ] **Step 5: Push implementation branch**

Use the stored GitHub token pattern from `AGENTS.md`, then restore the public remote URL:

```powershell
$envPath = "C:\Users\longl\Desktop\Shared-Sync\.env"
$token = (Get-Content $envPath | Where-Object { $_ -match '^GITHUB_TOKEN=' } | Select-Object -First 1) -replace '^GITHUB_TOKEN=', ''
git remote set-url origin "https://OnlineAdventuress:$token@github.com/OnlineAdventuress/screenodds.git"
git push origin HEAD
git remote set-url origin "https://github.com/OnlineAdventuress/screenodds.git"
```

- [ ] **Step 6: Merge to master after verification**

From the main checkout:

```bash
git merge --ff-only feature/market-value-workbench
```

- [ ] **Step 7: Push master**

Use the same stored GitHub token pattern:

```powershell
$envPath = "C:\Users\longl\Desktop\Shared-Sync\.env"
$token = (Get-Content $envPath | Where-Object { $_ -match '^GITHUB_TOKEN=' } | Select-Object -First 1) -replace '^GITHUB_TOKEN=', ''
git remote set-url origin "https://OnlineAdventuress:$token@github.com/OnlineAdventuress/screenodds.git"
git push origin master
git remote set-url origin "https://github.com/OnlineAdventuress/screenodds.git"
```

- [ ] **Step 8: Deploy to Netlify**

Run:

```bash
netlify build
netlify deploy --prod --no-build --dir .netlify/static --functions .netlify/functions --site 5700712b-37ac-4967-b3a4-9231d35efeda
```

Expected: deploy exits `0` and returns a production deploy URL.

- [ ] **Step 9: Verify production**

Run:

```bash
curl -I https://screenodds.com/markets/polymarket-oscars-best-picture
curl -s https://screenodds.com/markets/polymarket-oscars-best-picture | Select-String "Market Value Workbench"
```

Expected: HTTP `200` and rendered HTML includes `Market Value Workbench`.
