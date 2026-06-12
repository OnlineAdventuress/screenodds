# Sentiment and Kalshi Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cached social sentiment and Kalshi comparison-market context to ScreenOdds market detail pages without making page builds depend on paid APIs.

**Architecture:** Build a fallback-first data layer in `src/lib/sentiment.ts`, a public Kalshi client in `src/lib/kalshi.ts`, and a compact `SentimentPulse` component on seeded market pages. Put paid xAI calls only in `scripts/social-sentiment-scan.mjs`, which writes normalized JSON snapshots under `reports/social-sentiment/`.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, Vitest, Node scripts, xAI API via shared env, Kalshi public trade API.

---

## File Structure

- Create `src/lib/sentiment.ts`: snapshot types, fallback fixtures, JSON cache loader, market-query config.
- Create `src/lib/sentiment.test.ts`: unit tests for fallback, valid cache parsing, invalid cache handling, and secret-safe outputs.
- Create `src/lib/kalshi.ts`: public URL builders, series/market normalizers, display helpers.
- Create `src/lib/kalshi.test.ts`: tests for unauthenticated request URLs and normalized entertainment market fields.
- Create `src/components/sentiment-pulse.tsx`: presentational component for sentiment summaries, narratives, source counts, cited posts, and related markets.
- Create `src/components/sentiment-pulse.test.tsx`: static-render tests for the component.
- Create `scripts/social-sentiment-scan.mjs`: explicit scan entry point for xAI and Kalshi enrichment.
- Create `reports/social-sentiment/*.json`: deterministic starter snapshots for the three first markets.
- Modify `src/app/markets/[slug]/page.tsx`: load and render `SentimentPulse` below existing external signals.
- Modify `package.json`: add `sentiment:scan`.
- Modify `.Codex/learnings.md` only if implementation reveals a durable project rule.

## Task 1: Sentiment Cache Data Boundary

**Files:**
- Create: `src/lib/sentiment.ts`
- Test: `src/lib/sentiment.test.ts`
- Create directory: `reports/social-sentiment/`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sentiment.test.ts` with these cases:

```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getFallbackSentimentPulse,
  getSentimentPulseForMarket,
  getSentimentTopicForMarket,
  normalizeSentimentSnapshot,
} from "./sentiment";

describe("sentiment pulse cache", () => {
  it("returns deterministic fallback content when no snapshot exists", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "screenodds-sentiment-"));
    try {
      const pulse = await getSentimentPulseForMarket("love-island-odds", { baseDir: dir });
      expect(pulse.marketSlug).toBe("love-island-odds");
      expect(pulse.confidence).toBe("fallback");
      expect(pulse.sourceCounts.x).toBeGreaterThanOrEqual(0);
      expect(pulse.summary).toContain("ScreenOdds");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("parses valid cached snapshots without leaking secrets", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "screenodds-sentiment-"));
    try {
      await writeFile(
        path.join(dir, "love-island-odds.json"),
        JSON.stringify({
          marketSlug: "love-island-odds",
          query: "Love Island Polymarket",
          checkedAt: "2026-06-12T00:00:00.000Z",
          windowDays: 30,
          sentimentLabel: "mixed",
          summary: "X discussion is focused on Love Island prediction markets.",
          topNarratives: ["Polymarket added Love Island markets"],
          sourceCounts: { x: 10, reddit: 0, polymarket: 2, kalshi: 3 },
          citedPosts: [
            {
              source: "x",
              author: "PredictionNews_",
              url: "https://x.com/PredictionNews_/status/2062231921791541519",
              date: "2026-06-03",
              engagementLabel: "4 likes",
              text: "Polymarket added Love Island markets.",
            },
          ],
          relatedMarkets: [
            {
              source: "kalshi",
              title: "who will be eliminated",
              url: "https://kalshi.com/markets/KXLIUSAELIMINATION",
              priceLabel: "Best ask 36%",
              volumeLabel: "$65.4K volume",
            },
          ],
          confidence: "live",
        }),
      );
      const pulse = await getSentimentPulseForMarket("love-island-odds", { baseDir: dir });
      expect(pulse.confidence).toBe("live");
      expect(pulse.citedPosts[0]?.author).toBe("PredictionNews_");
      expect(JSON.stringify(pulse)).not.toContain("xai-");
      expect(JSON.stringify(pulse)).not.toContain("apiKey");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back when cached JSON is invalid", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "screenodds-sentiment-"));
    try {
      await writeFile(path.join(dir, "love-island-odds.json"), "{not json");
      const pulse = await getSentimentPulseForMarket("love-island-odds", { baseDir: dir });
      expect(pulse.confidence).toBe("fallback");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("normalizes partial snapshots and market topic config", () => {
    expect(getSentimentTopicForMarket("polymarket-oscars-best-picture")?.query).toBe(
      "Polymarket Oscars Best Picture Kalshi",
    );
    const snapshot = normalizeSentimentSnapshot({
      marketSlug: "highest-grossing-movie-in-2026",
      query: "highest grossing movie Polymarket Kalshi",
      checkedAt: "2026-06-12T00:00:00.000Z",
      summary: "Movie chart discussion is thin but relevant.",
    });
    expect(snapshot?.sentimentLabel).toBe("neutral");
    expect(snapshot?.topNarratives.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- src/lib/sentiment.test.ts
```

Expected: FAIL because `src/lib/sentiment.ts` does not exist.

- [ ] **Step 3: Implement minimal sentiment cache module**

Create `src/lib/sentiment.ts` with exported types and functions named in the test. Use `readFile` from `node:fs/promises`, default `baseDir` to `process.cwd()/reports/social-sentiment`, and validate all external URLs with `https://`. Return `getFallbackSentimentPulse(marketSlug)` on missing files, invalid JSON, or invalid snapshot shape.

- [ ] **Step 4: Run focused test and verify it passes**

Run:

```bash
npm run test -- src/lib/sentiment.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sentiment.ts src/lib/sentiment.test.ts reports/social-sentiment
git commit -m "feat: add sentiment pulse cache"
```

## Task 2: Kalshi Public Data Client

**Files:**
- Create: `src/lib/kalshi.ts`
- Test: `src/lib/kalshi.test.ts`

- [ ] **Step 1: Write the failing tests**

Create tests proving:
- `buildKalshiSeriesUrl({ category: "Entertainment" })` returns `https://external-api.kalshi.com/trade-api/v2/series?category=Entertainment&include_volume=true`.
- `buildKalshiMarketsUrl({ seriesTicker: "KXOSCARPIC", limit: 20 })` includes `series_ticker=KXOSCARPIC`, `limit=20`, and `mve_filter=exclude`.
- `normalizeKalshiSeriesResponse()` keeps only ticker, title, category, tags, volume, updated date, and URL.
- `normalizeKalshiMarketsResponse()` maps yes bid/ask/last price and volume into display labels.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- src/lib/kalshi.test.ts
```

Expected: FAIL because `src/lib/kalshi.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/kalshi.ts`**

Use the public base URL `https://external-api.kalshi.com/trade-api/v2`. Do not add auth headers. Export request builders, normalizers, `fetchKalshiEntertainmentSeries()`, and `fetchKalshiSeriesMarkets()`. Keep fetch functions nullable on HTTP errors.

- [ ] **Step 4: Run focused test and verify it passes**

Run:

```bash
npm run test -- src/lib/kalshi.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalshi.ts src/lib/kalshi.test.ts
git commit -m "feat: add Kalshi entertainment client"
```

## Task 3: Sentiment UI Component

**Files:**
- Create: `src/components/sentiment-pulse.tsx`
- Test: `src/components/sentiment-pulse.test.tsx`

- [ ] **Step 1: Write the failing render tests**

Create tests using `renderToStaticMarkup` that assert the HTML includes:
- `Sentiment pulse`
- the sentiment label
- the checked date
- source count labels
- cited post links with `nofollow noopener noreferrer`
- related market links with `nofollow noopener noreferrer`

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- src/components/sentiment-pulse.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement `SentimentPulse`**

Render a `screen-panel` with a header, summary, narrative list, source count row, cited post list, and related market list. Return `null` only if no pulse is passed.

- [ ] **Step 4: Run focused test and verify it passes**

Run:

```bash
npm run test -- src/components/sentiment-pulse.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sentiment-pulse.tsx src/components/sentiment-pulse.test.tsx
git commit -m "feat: add sentiment pulse component"
```

## Task 4: Starter Snapshots and Scan Script

**Files:**
- Create: `scripts/social-sentiment-scan.mjs`
- Modify: `package.json`
- Create: `reports/social-sentiment/love-island-odds.json`
- Create: `reports/social-sentiment/polymarket-oscars-best-picture.json`
- Create: `reports/social-sentiment/highest-grossing-movie-in-2026.json`

- [ ] **Step 1: Add deterministic snapshots**

Create three JSON snapshots using the schema from the design spec. Use observed sample facts from the June 12 local check for Love Island, and conservative fallback-style summaries for Oscars and highest-grossing movie until a scan is run.

- [ ] **Step 2: Add the scan script**

Create `scripts/social-sentiment-scan.mjs` that:
- Parses `--market`, `--all`, and `--dry-run`.
- Loads shared env from `C:\Users\longl\Desktop\Shared-Sync\.env`.
- Requires `XAI_API_KEY` only when not in `--dry-run`.
- Uses xAI chat completions with `tools: [{ type: "x_search" }]` to request a compact JSON summary.
- Calls Kalshi public series/market endpoints for the matching topic.
- Writes normalized snapshots to `reports/social-sentiment/{marketSlug}.json`.
- Sets `PYTHONUTF8=1` and `PYTHONIOENCODING=utf-8` when shelling out to local `last30days` in future, but does not require `last30days` in this slice.

- [ ] **Step 3: Add npm script**

Add to `package.json`:

```json
"sentiment:scan": "node scripts/social-sentiment-scan.mjs"
```

- [ ] **Step 4: Verify dry-run**

Run:

```bash
npm run sentiment:scan -- --market love-island-odds --dry-run
```

Expected: prints normalized JSON and does not require `XAI_API_KEY`.

- [ ] **Step 5: Commit**

```bash
git add scripts/social-sentiment-scan.mjs package.json reports/social-sentiment
git commit -m "feat: add sentiment scan snapshots"
```

## Task 5: Market Page Wiring

**Files:**
- Modify: `src/app/markets/[slug]/page.tsx`
- Optional test: source-level regression in `src/app/market-page-source.test.ts`

- [ ] **Step 1: Write a source regression test**

Create a test that reads `src/app/markets/[slug]/page.tsx` and asserts it imports `SentimentPulse`, imports `getSentimentPulseForMarket`, awaits a sentiment pulse for the market slug, and renders `<SentimentPulse pulse={sentimentPulse} />`.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm run test -- src/app/market-page-source.test.ts
```

Expected: FAIL because the page is not wired yet.

- [ ] **Step 3: Wire the page**

In `src/app/markets/[slug]/page.tsx`, import the component and loader, call `const sentimentPulse = await getSentimentPulseForMarket(market.slug);`, and render it in its own section after `ExternalSignals`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm run test -- src/app/market-page-source.test.ts src/lib/sentiment.test.ts src/components/sentiment-pulse.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/markets/[slug]/page.tsx src/app/market-page-source.test.ts
git commit -m "feat: show sentiment pulse on market pages"
```

## Task 6: Final Verification and Deployment

**Files:**
- Modify `.Codex/learnings.md` only if new durable lessons were discovered.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Check generated market HTML**

Run:

```powershell
$content = Get-Content -LiteralPath ".next\server\app\markets\love-island-odds.html" -Raw
$content.Contains("Sentiment pulse")
$content.Contains("Love Island")
```

Expected: both values are `True`.

- [ ] **Step 3: Push all commits**

Use the project GitHub token push flow when needed, then confirm:

```bash
git status --short --branch
```

Expected: `master...origin/master` with no local changes.

- [ ] **Step 4: Deploy to Netlify**

Stop ScreenOdds-owned Node processes if any are running, then:

```bash
netlify deploy --prod --site 5700712b-37ac-4967-b3a4-9231d35efeda
```

Expected: `Deploy is live!`.

- [ ] **Step 5: Public smoke check**

Run:

```powershell
$response = Invoke-WebRequest -Uri "https://screenodds.com/markets/love-island-odds" -UseBasicParsing -TimeoutSec 45
$response.StatusCode
$response.Content.Contains("Sentiment pulse")
```

Expected: status `200`, content check `True`.
