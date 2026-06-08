# ScreenOdds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the first ScreenOdds MVP for `screenodds.com`.

**Architecture:** A Next.js App Router site with typed market normalization, Polymarket live fetches, deterministic fallback fixtures, static SEO hubs/articles, Kie.ai image generation scripts, and Vercel deployment. Core content remains server-rendered and crawlable; client interactivity is limited to filtering/sorting enhancements.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Vitest, Polymarket Gamma API, DataForSEO, Kie.ai ChatGPT Image 2, Vercel.

---

## File Structure

- `src/lib/markets.ts`: market types, normalization, filtering, summaries, ranking.
- `src/lib/fixtures.ts`: fallback ScreenOdds markets.
- `src/lib/polymarket.ts`: live Polymarket fetchers for entertainment tags.
- `src/lib/content.ts`: hub/article metadata and keyword map.
- `src/lib/seo.ts`: JSON-LD and metadata helpers.
- `src/lib/markets.test.ts`: Vitest tests for data logic.
- `src/components/*`: reusable market cards, metric cards, header, related links, article shell.
- `src/app/*`: App Router pages.
- `scripts/generate-kie-image.mjs`: Kie.ai image task creation/polling.
- `public/images/`: generated site and article images.

---

### Task 1: Scaffold the Next.js App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `public/`

- [ ] Create a Next.js TypeScript project in the existing repo.

Run:

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: project files are created in `C:\Users\longl\Documents\Codex\antigravity\screenodds`.

- [ ] Install test dependencies.

Run:

```powershell
npm install -D vitest @vitejs/plugin-react
```

Expected: dependencies install without audit-blocking errors.

- [ ] Add scripts to `package.json`.

Expected scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] Run baseline build.

Run:

```powershell
npm run build
```

Expected: build exits 0.

- [ ] Commit.

Run:

```powershell
git add -A
git commit -m "chore: scaffold screenodds app"
```

---

### Task 2: Add Market Data Tests First

**Files:**
- Create: `src/lib/markets.test.ts`
- Create: `src/lib/markets.ts`
- Create: `src/lib/fixtures.ts`

- [ ] Write failing tests for normalization, summary metrics, filtering, and ranking.

Test cases:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateMarketSummary,
  filterMarkets,
  normalizeGammaEvent,
  rankMarketsByOpportunity,
} from "./markets";

describe("ScreenOdds market utilities", () => {
  it("normalizes Gamma events into ScreenOdds markets", () => {
    const market = normalizeGammaEvent({
      id: "1",
      title: "\"Scary Movie\" Opening Weekend Box Office",
      slug: "scary-movie-opening-weekend-box-office",
      description: "Opening weekend gross market.",
      volume1mo: "308870.14",
      volume24hr: "110809.56",
      volume1wk: "308870.14",
      liquidity: "87963.55",
      endDate: "2026-06-08T12:00:00Z",
      updatedAt: "2026-06-08T00:00:00Z",
      tags: [{ label: "Movies" }, { label: "box office" }],
      markets: [{ outcomePrices: "[\"0.62\",\"0.38\"]" }],
    });

    expect(market.category).toBe("Box Office");
    expect(market.probability).toBe(0.62);
    expect(market.volume1mo).toBe(308870.14);
  });

  it("calculates market summary totals", () => {
    const markets = [
      { volume1mo: 100, volume24hr: 10, volume1wk: 30, liquidity: 40, probability: 0.4 },
      { volume1mo: 200, volume24hr: 20, volume1wk: 50, liquidity: 60, probability: 0.6 },
    ].map((partial, index) => ({
      id: String(index),
      title: `Market ${index}`,
      slug: `market-${index}`,
      description: "",
      category: "Movies" as const,
      vertical: "Movies" as const,
      tags: [],
      noProbability: 1 - partial.probability,
      endDate: null,
      updatedAt: "2026-06-08T00:00:00Z",
      source: "fallback" as const,
      ...partial,
    }));

    expect(calculateMarketSummary(markets)).toMatchObject({
      totalMarkets: 2,
      totalVolume1mo: 300,
      totalVolume24hr: 30,
      totalLiquidity: 100,
    });
  });

  it("filters markets by category and query", () => {
    const markets = [
      { title: "Best Picture Odds", category: "Awards" as const },
      { title: "Love Island Odds", category: "Reality TV" as const },
    ].map((partial, index) => ({
      id: String(index),
      slug: partial.title.toLowerCase().replaceAll(" ", "-"),
      description: "",
      vertical: partial.category,
      tags: [partial.category],
      probability: 0.5,
      noProbability: 0.5,
      volume1mo: 1,
      volume24hr: 1,
      volume1wk: 1,
      liquidity: 1,
      endDate: null,
      updatedAt: "2026-06-08T00:00:00Z",
      source: "fallback" as const,
      ...partial,
    }));

    expect(filterMarkets(markets, { category: "Awards", query: "picture" })).toHaveLength(1);
  });

  it("ranks SEO-relevant liquid markets first", () => {
    const ranked = rankMarketsByOpportunity([
      {
        id: "a",
        title: "Polymarket Oscars Best Picture",
        slug: "polymarket-oscars-best-picture",
        description: "",
        category: "Awards",
        vertical: "Awards",
        tags: ["Awards", "Oscars"],
        probability: 0.5,
        noProbability: 0.5,
        volume1mo: 5000,
        volume24hr: 500,
        volume1wk: 1000,
        liquidity: 2000,
        endDate: null,
        updatedAt: "2026-06-08T00:00:00Z",
        source: "fallback",
      },
      {
        id: "b",
        title: "Minor Culture Market",
        slug: "minor-culture-market",
        description: "",
        category: "Culture",
        vertical: "Culture",
        tags: ["Culture"],
        probability: 0.5,
        noProbability: 0.5,
        volume1mo: 50,
        volume24hr: 0,
        volume1wk: 10,
        liquidity: 20,
        endDate: null,
        updatedAt: "2026-06-08T00:00:00Z",
        source: "fallback",
      },
    ]);

    expect(ranked[0].slug).toBe("polymarket-oscars-best-picture");
  });
});
```

- [ ] Run tests and verify they fail.

Run:

```powershell
npm run test
```

Expected: failures because `src/lib/markets.ts` does not export required functions yet.

- [ ] Implement the market utilities and fallback fixtures.

Implementation must include `MarketCategory`, `Market`, `normalizeGammaEvent`, `calculateMarketSummary`, `filterMarkets`, `rankMarketsByOpportunity`, `formatCompactCurrency`, `formatProbability`, and `getMarketBySlug`.

- [ ] Run tests and verify they pass.

Run:

```powershell
npm run test
```

Expected: all tests pass.

- [ ] Commit.

Run:

```powershell
git add src/lib
git commit -m "feat: add screenodds market data model"
```

---

### Task 3: Add Live Polymarket Fetching

**Files:**
- Create: `src/lib/polymarket.ts`
- Create: `src/app/api/markets/route.ts`

- [ ] Implement entertainment tag fetching.

Use these tag IDs:

```ts
export const entertainmentTags = [
  { id: 53, name: "Movies" },
  { id: 51, name: "Box Office" },
  { id: 18, name: "Awards" },
  { id: 100338, name: "TV & Streaming" },
  { id: 100339, name: "Reality TV" },
  { id: 102952, name: "Top Netflix" },
];
```

Fetch Gamma events from:

```ts
https://gamma-api.polymarket.com/events?tag_id=${id}&related_tags=true&active=true&closed=false&limit=100&order=volume1mo&ascending=false
```

Return fallback fixtures on any fetch failure.

- [ ] Add `/api/markets`.

Return:

```ts
return Response.json({
  markets,
  summary: calculateMarketSummary(markets),
  updatedAt: new Date().toISOString(),
});
```

- [ ] Run tests and build.

Run:

```powershell
npm run test
npm run build
```

Expected: both exit 0.

- [ ] Commit.

Run:

```powershell
git add src/lib/polymarket.ts src/app/api/markets/route.ts
git commit -m "feat: fetch entertainment prediction markets"
```

---

### Task 4: Build SEO Hubs and Market Pages

**Files:**
- Create/modify: `src/app/page.tsx`
- Create: `src/app/movies/page.tsx`
- Create: `src/app/box-office/page.tsx`
- Create: `src/app/awards/page.tsx`
- Create: `src/app/tv/page.tsx`
- Create: `src/app/reality-tv/page.tsx`
- Create: `src/app/markets/[slug]/page.tsx`
- Create: `src/components/site-header.tsx`
- Create: `src/components/market-card.tsx`
- Create: `src/components/metric-card.tsx`
- Create: `src/components/related-links.tsx`
- Create: `src/lib/content.ts`

- [ ] Create reusable hub metadata for the five hubs.
- [ ] Create homepage with direct links to all hubs and top markets.
- [ ] Create hub pages with crawlable market summaries.
- [ ] Create market detail pages from fallback/live market slugs.
- [ ] Run build.
- [ ] Commit with `feat: build screenodds market hubs`.

---

### Task 5: Add SEO Articles

**Files:**
- Create: `src/lib/articles.ts`
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`

- [ ] Add five launch articles:
  - `polymarket-oscars-odds`
  - `best-picture-odds`
  - `love-island-odds`
  - `big-brother-odds`
  - `next-james-bond-actor-odds`
- [ ] Each article must include keyword-backed title, description, body sections, FAQ entries, and related links.
- [ ] Add article schema and breadcrumb schema.
- [ ] Run build.
- [ ] Commit with `content: add launch SEO articles`.

---

### Task 6: Add Kie.ai Image Generation

**Files:**
- Create: `scripts/generate-kie-image.mjs`
- Create: `scripts/generate-launch-images.mjs`
- Create: `.env.example`
- Create: `public/images/`

- [ ] Add `.env.example` without secrets:

```env
KIE_API_KEY=
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
NEXT_PUBLIC_SITE_URL=https://screenodds.com
```

- [ ] Implement Kie.ai task creation against `https://api.kie.ai/api/v1/jobs/createTask`.
- [ ] Poll `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` until success.
- [ ] Generate editorial, non-infringing hero/OG images for homepage, awards, reality TV, and box office.
- [ ] Save image URLs/paths in content metadata.
- [ ] Run build and visually verify images render.
- [ ] Commit with `feat: add generated screenodds image pipeline`.

---

### Task 7: Add SEO Metadata, Sitemap, Robots

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Modify: `src/app/layout.tsx`

- [ ] Set `metadataBase` to `https://screenodds.com`.
- [ ] Add WebSite and Organization JSON-LD.
- [ ] Generate sitemap entries for hubs, markets, and articles.
- [ ] Allow crawling in `robots.ts`.
- [ ] Run build.
- [ ] Commit with `feat: add screenodds technical seo`.

---

### Task 8: Verify, Push, and Deploy

**Files:**
- Modify: `AGENTS.md` after Vercel project IDs are known.
- Modify: `.Codex/learnings.md`.

- [ ] Run:

```powershell
npm run test
npm run build
```

- [ ] Create GitHub repo `OnlineAdventuress/screenodds` if missing.
- [ ] Push `master`.
- [ ] Create or connect a Vercel project for `screenodds.com`.
- [ ] Trigger production deployment through Vercel REST API if CLI/webhook is unreliable.
- [ ] Confirm deployment is ready.
- [ ] Update `.Codex/learnings.md`.
- [ ] Commit/push deployment metadata with `chore: record screenodds deployment`.

---

## Plan Self-Review

- Spec coverage: market hubs, live/fallback data, DataForSEO keyword strategy, Kie.ai images, SEO articles, compliance, verification, and deployment are covered.
- Placeholder scan: no `TBD` or `TODO` placeholders.
- Type consistency: market category names are consistent across tasks.
