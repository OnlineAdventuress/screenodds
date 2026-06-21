# Signal Lab Value Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ScreenOdds Signal Lab panel: a market-page calculator and scorecard that helps readers compare market-implied probability with their own estimate and understand source/liquidity confidence.

**Architecture:** Add a deterministic server-side model in `src/lib/signal-lab.ts`, render it through a focused client component in `src/components/signal-lab.tsx`, and wire it into seeded market pages after existing external/sentiment panels. The model uses existing market, external signal, and sentiment data only; no new API calls are introduced.

**Tech Stack:** Next.js App Router, TypeScript, React client component, Tailwind CSS, Vitest, `react-dom/server` component tests.

## Global Constraints

- Casual-first copy: plain English before deeper market detail.
- No user accounts, saved watchlists, or alerts in this slice.
- No paid API calls from client components or static page builds.
- No trading recommendations, bet sizing, or financial advice.
- No copy should say "bet," "buy," "sell," "lock," "edge," or "guaranteed value."
- Missing external signals or sentiment must not hide or break Signal Lab.
- Clamp reader estimates to 1-99 percent.
- Keep user estimates browser-local only.

---

## File Structure

- Create `src/lib/signal-lab.ts`: Signal Lab types, probability comparison, reliability scoring, category check/catalyst generation, and model builder.
- Create `src/lib/signal-lab.test.ts`: unit tests for math, clamping, labels, scoring, fallback checks, and category-specific model generation.
- Create `src/components/signal-lab.tsx`: client component with reader probability input, range slider, reliability panel, checks, catalysts, and methodology.
- Create `src/components/signal-lab.test.tsx`: server-render tests for core text, prohibited action-copy absence, reliability labels, checks, catalysts, and methodology.
- Modify `src/app/markets/[slug]/page.tsx`: import/build/render Signal Lab without removing `ExternalSignals` or `SentimentPulse`.
- Modify `src/app/market-page-source.test.ts`: assert market pages import/build/render Signal Lab.
- Modify `.Codex/learnings.md`: add a short feature implementation learning after verification.

---

### Task 1: Signal Lab Model

**Files:**
- Create: `src/lib/signal-lab.ts`
- Create: `src/lib/signal-lab.test.ts`

**Interfaces:**
- Consumes: `Market` from `src/lib/markets.ts`, `ExternalSignal[]` from `src/lib/external-signals.ts`, `SentimentPulse | null` from `src/lib/sentiment.ts`.
- Produces:
  - `type SignalLabModel`
  - `type ProbabilityComparison`
  - `function clampReaderProbability(value: number): number`
  - `function compareProbabilityEstimate(marketProbability: number, readerProbabilityPercent: number): ProbabilityComparison`
  - `function buildSignalLabModel(input: BuildSignalLabInput): SignalLabModel`

- [ ] **Step 1: Write failing probability tests**

Add `src/lib/signal-lab.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildSignalLabModel,
  clampReaderProbability,
  compareProbabilityEstimate,
} from "./signal-lab";
import type { Market } from "./markets";

function makeMarket(partial: Partial<Market> = {}): Market {
  return {
    id: "polymarket-oscars-best-picture",
    title: "Polymarket Oscars Best Picture odds",
    slug: "polymarket-oscars-best-picture",
    description: "Oscar market hub for Best Picture probabilities.",
    category: "Awards",
    vertical: "Awards",
    tags: ["Awards", "Oscars", "Movies"],
    probability: 0.22,
    noProbability: 0.78,
    volume1mo: 628,
    volume24hr: 19,
    volume1wk: 107,
    liquidity: 8653,
    endDate: "2027-02-28T00:00:00Z",
    updatedAt: "2026-06-08T00:00:00Z",
    source: "fallback",
    ...partial,
  };
}

describe("Signal Lab probability helpers", () => {
  it("clamps reader probability estimates to the allowed 1-99 range", () => {
    expect(clampReaderProbability(-20)).toBe(1);
    expect(clampReaderProbability(0)).toBe(1);
    expect(clampReaderProbability(42.4)).toBe(42);
    expect(clampReaderProbability(120)).toBe(99);
    expect(clampReaderProbability(Number.NaN)).toBe(50);
  });

  it("compares market probability with the reader estimate using plain labels", () => {
    expect(compareProbabilityEstimate(0.22, 30)).toMatchObject({
      readerProbability: 0.3,
      differencePoints: -8,
      label: "Market lower than your estimate",
    });
    expect(compareProbabilityEstimate(0.62, 50)).toMatchObject({
      readerProbability: 0.5,
      differencePoints: 12,
      label: "Market higher than your estimate",
    });
    expect(compareProbabilityEstimate(0.51, 50)).toMatchObject({
      label: "Close to your estimate",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/lib/signal-lab.test.ts`

Expected: fail because `src/lib/signal-lab.ts` does not exist.

- [ ] **Step 3: Implement probability helpers and public types**

Create `src/lib/signal-lab.ts` with:

```ts
import { formatCompactCurrency, formatProbability, type Market, type MarketCategory } from "./markets";
import type { ExternalSignal } from "./external-signals";
import type { SentimentPulse } from "./sentiment";

export type SignalCheckStatus = "positive" | "neutral" | "warning";

export type ReliabilityLabel =
  | "Strong signal"
  | "Developing signal"
  | "Thin signal"
  | "Needs review";

export type ProbabilityComparisonLabel =
  | "Market higher than your estimate"
  | "Market lower than your estimate"
  | "Close to your estimate";

export type ProbabilityComparison = {
  marketProbability: number;
  readerProbability: number;
  differencePoints: number;
  label: ProbabilityComparisonLabel;
  summary: string;
};

export type SignalLabModel = {
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
    label: ReliabilityLabel;
    summary: string;
    warnings: string[];
  };
  checks: Array<{
    label: string;
    status: SignalCheckStatus;
    detail: string;
  }>;
  catalysts: Array<{
    label: string;
    dateLabel: string;
    sourceLabel: string;
  }>;
  methodology: string[];
};

export type BuildSignalLabInput = {
  market: Market;
  externalSignals?: ExternalSignal[];
  sentimentPulse?: SentimentPulse | null;
  now?: Date;
};

export function clampReaderProbability(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function compareProbabilityEstimate(
  marketProbability: number,
  readerProbabilityPercent: number,
): ProbabilityComparison {
  const readerPercent = clampReaderProbability(readerProbabilityPercent);
  const marketPercent = Math.round(marketProbability * 100);
  const differencePoints = marketPercent - readerPercent;
  const label =
    Math.abs(differencePoints) <= 3
      ? "Close to your estimate"
      : differencePoints > 0
        ? "Market higher than your estimate"
        : "Market lower than your estimate";

  return {
    marketProbability,
    readerProbability: readerPercent / 100,
    differencePoints,
    label,
    summary: `${label}. Difference: ${Math.abs(differencePoints)} percentage points.`,
  };
}
```

- [ ] **Step 4: Verify helper tests pass**

Run: `npm run test -- src/lib/signal-lab.test.ts`

Expected: pass the helper tests; model tests are added next.

- [ ] **Step 5: Add failing model tests**

Append to `src/lib/signal-lab.test.ts`:

```ts
describe("Signal Lab model", () => {
  it("builds a strong box office model when volume, liquidity, and source coverage are present", () => {
    const model = buildSignalLabModel({
      market: makeMarket({
        slug: "scary-movie-opening-weekend-box-office",
        title: '"Scary Movie" Opening Weekend Box Office',
        category: "Box Office",
        vertical: "Box Office",
        tags: ["Movies", "Box Office"],
        probability: 0.62,
        volume1mo: 308870,
        volume24hr: 110809,
        liquidity: 87963,
      }),
      externalSignals: [
        {
          id: "tmdb-1",
          label: "TMDb title metadata",
          value: "Scary Movie",
          detail: "Title metadata.",
          kind: "movie-metadata",
          sourceName: "TMDb",
          sourceUrl: "https://www.themoviedb.org/movie/4247",
          checkedAt: "2026-06-21T00:00:00.000Z",
          confidence: "live",
        },
        {
          id: "box-office-1",
          label: "Box office context",
          value: "Weekend grosses",
          detail: "Box office data.",
          kind: "box-office",
          sourceName: "ScreenOdds research",
          sourceUrl: "https://screenodds.com/box-office",
          checkedAt: "2026-06-21T00:00:00.000Z",
          confidence: "fallback",
        },
      ],
    });

    expect(model.marketSlug).toBe("scary-movie-opening-weekend-box-office");
    expect(model.probabilityLabel).toBe("62%");
    expect(model.reliability.label).toBe("Strong signal");
    expect(model.checks.some((check) => check.label === "Market liquidity")).toBe(true);
    expect(model.checks.some((check) => check.label === "Box office signal")).toBe(true);
    expect(model.catalysts.some((catalyst) => catalyst.label.includes("Weekend"))).toBe(true);
  });

  it("marks thin reality TV markets as thin while still returning useful checks", () => {
    const model = buildSignalLabModel({
      market: makeMarket({
        slug: "big-brother-odds",
        title: "Big Brother winner odds",
        category: "Reality TV",
        vertical: "Reality TV",
        tags: ["Reality TV", "Big Brother"],
        probability: 0.14,
        volume1mo: 140,
        volume24hr: 0,
        liquidity: 1000,
        endDate: null,
      }),
      externalSignals: [],
      sentimentPulse: null,
    });

    expect(model.reliability.label).toBe("Thin signal");
    expect(model.reliability.warnings.length).toBeGreaterThan(0);
    expect(model.checks.some((check) => check.label === "Reality TV signal")).toBe(true);
    expect(model.catalysts.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Implement model builder and scoring**

Add the following functions to `src/lib/signal-lab.ts`:

```ts
export function buildSignalLabModel({
  market,
  externalSignals = [],
  sentimentPulse = null,
}: BuildSignalLabInput): SignalLabModel {
  const reliability = scoreReliability(market, externalSignals, sentimentPulse);

  return {
    marketSlug: market.slug,
    marketTitle: market.title,
    category: market.category,
    marketProbability: market.probability,
    probabilityLabel: formatProbability(market.probability),
    defaultReaderProbability: clampReaderProbability(market.probability * 100),
    volumeLabel: formatCompactCurrency(market.volume1mo),
    liquidityLabel: formatCompactCurrency(market.liquidity),
    reliability,
    checks: buildSignalChecks(market, externalSignals, sentimentPulse),
    catalysts: buildCatalysts(market),
    methodology: [
      "ScreenOdds compares market-implied probability with volume, liquidity, external source coverage, and category-specific catalysts.",
      "The calculator is informational and does not persist your estimate.",
      "Thin markets can move sharply without much new information, so source checks matter as much as price.",
    ],
  };
}

function scoreReliability(
  market: Market,
  externalSignals: ExternalSignal[],
  sentimentPulse: SentimentPulse | null,
): SignalLabModel["reliability"] {
  let score = 0;
  const warnings: string[] = [];
  const liveSignals = externalSignals.filter((signal) => signal.confidence === "live").length;

  if (market.volume1mo >= 250000) score += 35;
  else if (market.volume1mo >= 1000) score += 22;
  else warnings.push("Low one-month volume makes the current price easier to move.");

  if (market.liquidity >= 50000) score += 25;
  else if (market.liquidity >= 5000) score += 15;
  else warnings.push("Limited liquidity reduces confidence in small price moves.");

  if (externalSignals.length >= 2) score += 20;
  else if (externalSignals.length === 1) score += 10;
  else warnings.push("No external source panel is available for this market yet.");

  if (liveSignals > 0) score += 10;
  if (sentimentPulse && sentimentPulse.confidence === "live") score += 10;

  const boundedScore = Math.min(100, score);
  const label: ReliabilityLabel =
    boundedScore >= 75
      ? "Strong signal"
      : boundedScore >= 45
        ? "Developing signal"
        : boundedScore >= 20
          ? "Thin signal"
          : "Needs review";

  return {
    score: boundedScore,
    label,
    summary: reliabilitySummary(label),
    warnings,
  };
}

function reliabilitySummary(label: ReliabilityLabel): string {
  switch (label) {
    case "Strong signal":
      return "Market data and source coverage are strong enough to treat the price as a useful entertainment signal.";
    case "Developing signal":
      return "The market has some useful support, but readers should still check liquidity and source freshness.";
    case "Thin signal":
      return "The market may be useful for tracking interest, but low volume or limited sourcing can distort the price.";
    case "Needs review":
      return "Source coverage or market depth is too limited to treat the price as a durable signal.";
  }
}

function buildSignalChecks(
  market: Market,
  externalSignals: ExternalSignal[],
  sentimentPulse: SentimentPulse | null,
): SignalLabModel["checks"] {
  return [
    {
      label: "Market liquidity",
      status: market.liquidity >= 50000 ? "positive" : market.liquidity >= 5000 ? "neutral" : "warning",
      detail: `${formatCompactCurrency(market.liquidity)} liquidity and ${formatCompactCurrency(market.volume1mo)} one-month volume.`,
    },
    categoryCheck(market, externalSignals),
    {
      label: "Source coverage",
      status: externalSignals.length >= 2 ? "positive" : externalSignals.length === 1 ? "neutral" : "warning",
      detail: `${externalSignals.length} external signal${externalSignals.length === 1 ? "" : "s"} attached to this market page.`,
    },
    {
      label: "Social context",
      status: sentimentPulse?.confidence === "live" ? "positive" : sentimentPulse ? "neutral" : "warning",
      detail: sentimentPulse
        ? `${sentimentPulse.sentimentLabel} sentiment from a ${sentimentPulse.windowDays}-day window.`
        : "No cached social sentiment scan is available yet.",
    },
  ];
}

function categoryCheck(market: Market, externalSignals: ExternalSignal[]): SignalLabModel["checks"][number] {
  const hasKind = (kind: ExternalSignal["kind"]) => externalSignals.some((signal) => signal.kind === kind);

  if (market.category === "Box Office") {
    return {
      label: "Box office signal",
      status: hasKind("box-office") || hasKind("movie-metadata") ? "positive" : "warning",
      detail: "Compare the market with release timing, weekend grosses, comps, and title metadata.",
    };
  }
  if (market.category === "Awards") {
    return {
      label: "Awards signal",
      status: hasKind("awards-context") || hasKind("prediction-market") ? "neutral" : "warning",
      detail: "Check nominations, precursor awards, guild results, and ceremony timing.",
    };
  }
  if (market.category === "Reality TV") {
    return {
      label: "Reality TV signal",
      status: hasKind("tv-metadata") || hasKind("prediction-market") ? "neutral" : "warning",
      detail: "Episode timing, public voting, edit visibility, and spoiler risk can all move prices.",
    };
  }
  if (market.category === "TV & Streaming") {
    return {
      label: "Streaming signal",
      status: hasKind("tv-metadata") ? "neutral" : "warning",
      detail: "Release timing, platform charts, and renewal sources should be checked beside the market.",
    };
  }
  return {
    label: "Entertainment signal",
    status: externalSignals.length > 0 ? "neutral" : "warning",
    detail: "Use official sources and liquidity checks before treating the price as durable.",
  };
}

function buildCatalysts(market: Market): SignalLabModel["catalysts"] {
  const endDate = market.endDate ? market.endDate.slice(0, 10) : "Rolling";
  if (market.category === "Awards") {
    return [
      { label: "Nomination and shortlist updates", dateLabel: "Awards season", sourceLabel: "Official awards bodies" },
      { label: "Guild, critics, and televised precursor results", dateLabel: "Before ceremony", sourceLabel: "Industry results" },
      { label: "Market resolution date", dateLabel: endDate, sourceLabel: "Market rules" },
    ];
  }
  if (market.category === "Box Office") {
    return [
      { label: "Weekend estimates and final grosses", dateLabel: "Each weekend", sourceLabel: "Box office reports" },
      { label: "Theater count and competing releases", dateLabel: "Release window", sourceLabel: "Distributor calendar" },
      { label: "Market resolution date", dateLabel: endDate, sourceLabel: "Market rules" },
    ];
  }
  if (market.category === "Reality TV") {
    return [
      { label: "Episode, vote, or elimination window", dateLabel: "Weekly cycle", sourceLabel: "Official show schedule" },
      { label: "Finale and public vote signals", dateLabel: endDate, sourceLabel: "Show format" },
      { label: "Spoiler and rumor checks", dateLabel: "Before each episode", sourceLabel: "Source review" },
    ];
  }
  return [
    { label: "Official announcement or release update", dateLabel: "Next public update", sourceLabel: "Official/trade sources" },
    { label: "Market resolution date", dateLabel: endDate, sourceLabel: "Market rules" },
  ];
}
```

- [ ] **Step 7: Verify Task 1**

Run: `npm run test -- src/lib/signal-lab.test.ts`

Expected: all Signal Lab model tests pass.

- [ ] **Step 8: Commit Task 1**

Run:

```bash
git add src/lib/signal-lab.ts src/lib/signal-lab.test.ts
git commit -m "feat: add signal lab model"
```

---

### Task 2: Signal Lab Component

**Files:**
- Create: `src/components/signal-lab.tsx`
- Create: `src/components/signal-lab.test.tsx`

**Interfaces:**
- Consumes: `SignalLabModel`, `compareProbabilityEstimate`, `clampReaderProbability`.
- Produces: `function SignalLab({ model }: { model: SignalLabModel })`.

- [ ] **Step 1: Write failing component test**

Create `src/components/signal-lab.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalLab } from "./signal-lab";
import type { SignalLabModel } from "../lib/signal-lab";

const model: SignalLabModel = {
  marketSlug: "polymarket-oscars-best-picture",
  marketTitle: "Polymarket Oscars Best Picture odds",
  category: "Awards",
  marketProbability: 0.22,
  probabilityLabel: "22%",
  defaultReaderProbability: 22,
  volumeLabel: "$628",
  liquidityLabel: "$8.7K",
  reliability: {
    score: 47,
    label: "Developing signal",
    summary: "The market has some useful support.",
    warnings: ["Low one-month volume makes the current price easier to move."],
  },
  checks: [
    {
      label: "Market liquidity",
      status: "neutral",
      detail: "$8.7K liquidity and $628 one-month volume.",
    },
    {
      label: "Awards signal",
      status: "neutral",
      detail: "Check nominations and guild results.",
    },
  ],
  catalysts: [
    {
      label: "Nomination and shortlist updates",
      dateLabel: "Awards season",
      sourceLabel: "Official awards bodies",
    },
  ],
  methodology: [
    "ScreenOdds compares market-implied probability with volume, liquidity, external source coverage, and category-specific catalysts.",
  ],
};

describe("SignalLab", () => {
  it("renders calculator, reliability, checks, catalysts, and methodology", () => {
    const html = renderToStaticMarkup(<SignalLab model={model} />);

    expect(html).toContain("Signal Lab");
    expect(html).toContain("Market price vs. your view");
    expect(html).toContain("22%");
    expect(html).toContain("Your estimate");
    expect(html).toContain("Developing signal");
    expect(html).toContain("Market liquidity");
    expect(html).toContain("Awards signal");
    expect(html).toContain("Nomination and shortlist updates");
    expect(html).toContain("ScreenOdds compares market-implied probability");
    expect(html).not.toContain("bet");
    expect(html).not.toContain("buy");
    expect(html).not.toContain("sell");
  });
});
```

- [ ] **Step 2: Run component test to verify failure**

Run: `npm run test -- src/components/signal-lab.test.tsx`

Expected: fail because `src/components/signal-lab.tsx` does not exist.

- [ ] **Step 3: Implement component**

Create `src/components/signal-lab.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  clampReaderProbability,
  compareProbabilityEstimate,
  type SignalCheckStatus,
  type SignalLabModel,
} from "@/lib/signal-lab";

type SignalLabProps = {
  model: SignalLabModel;
};

const statusClasses: Record<SignalCheckStatus, string> = {
  positive: "border-teal-400/60 text-teal-100",
  neutral: "border-zinc-700 text-zinc-200",
  warning: "border-amber-400/60 text-amber-100",
};

export function SignalLab({ model }: SignalLabProps) {
  const [readerEstimate, setReaderEstimate] = useState(model.defaultReaderProbability);
  const comparison = useMemo(
    () => compareProbabilityEstimate(model.marketProbability, readerEstimate),
    [model.marketProbability, readerEstimate],
  );

  function updateReaderEstimate(value: string) {
    setReaderEstimate(clampReaderProbability(Number(value)));
  }

  return (
    <div className="screen-panel p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <p className="screen-kicker">Signal Lab</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
            Market price vs. your view
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Compare the market-implied probability with your own estimate, then
            check whether volume, liquidity, sources, and catalysts support the move.
          </p>
        </div>
        <div className="rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
          {model.reliability.label} / {model.reliability.score}/100
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded border border-zinc-800 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SignalValue label="Market estimate" value={model.probabilityLabel} />
            <SignalValue label="Your estimate" value={`${readerEstimate}%`} />
          </div>
          <label className="mt-5 block text-sm font-semibold text-zinc-100" htmlFor={`${model.marketSlug}-estimate`}>
            Your probability estimate
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id={`${model.marketSlug}-estimate`}
              type="range"
              min="1"
              max="99"
              value={readerEstimate}
              onChange={(event) => updateReaderEstimate(event.target.value)}
              className="w-full accent-teal-300"
            />
            <input
              type="number"
              min="1"
              max="99"
              value={readerEstimate}
              onChange={(event) => updateReaderEstimate(event.target.value)}
              className="w-24 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              aria-label="Your probability estimate"
            />
          </div>
          <div className="mt-4 rounded border border-zinc-800 p-3">
            <p className="text-sm font-semibold text-teal-100">{comparison.label}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{comparison.summary}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            This comparison is informational and depends on liquidity, fees, market
            rules, and source confidence. Your estimate stays in this browser.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded border border-zinc-800 p-4">
            <p className="text-sm font-semibold text-zinc-100">Reliability read</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{model.reliability.summary}</p>
            {model.reliability.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100">
                {model.reliability.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {model.checks.map((check) => (
              <div key={check.label} className={`rounded border p-3 ${statusClasses[check.status]}`}>
                <p className="text-sm font-semibold">{check.label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Upcoming catalysts</p>
          <div className="mt-3 divide-y divide-zinc-800 rounded border border-zinc-800">
            {model.catalysts.map((catalyst) => (
              <div key={`${catalyst.label}-${catalyst.dateLabel}`} className="p-3">
                <p className="text-sm font-semibold text-zinc-100">{catalyst.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                  {catalyst.dateLabel} / {catalyst.sourceLabel}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Methodology</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
            {model.methodology.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SignalValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold text-zinc-50">{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Verify component test passes**

Run: `npm run test -- src/components/signal-lab.test.tsx`

Expected: pass.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/components/signal-lab.tsx src/components/signal-lab.test.tsx
git commit -m "feat: add signal lab component"
```

---

### Task 3: Market Page Integration

**Files:**
- Modify: `src/app/markets/[slug]/page.tsx`
- Modify: `src/app/market-page-source.test.ts`

**Interfaces:**
- Consumes: `buildSignalLabModel({ market, externalSignals, sentimentPulse })`.
- Produces: rendered `<SignalLab model={signalLab} />` on seeded market pages.

- [ ] **Step 1: Add failing source integration test**

Update `src/app/market-page-source.test.ts`:

```ts
expect(source).toContain('import { SignalLab } from "@/components/signal-lab"');
expect(source).toContain('import { buildSignalLabModel } from "@/lib/signal-lab"');
expect(source).toContain("const signalLab = buildSignalLabModel({");
expect(source).toContain("<SignalLab model={signalLab} />");
```

- [ ] **Step 2: Run integration source test to verify failure**

Run: `npm run test -- src/app/market-page-source.test.ts`

Expected: fail because the market page has not imported/rendered Signal Lab.

- [ ] **Step 3: Wire market page**

Modify `src/app/markets/[slug]/page.tsx`:

```tsx
import { SignalLab } from "@/components/signal-lab";
import { buildSignalLabModel } from "@/lib/signal-lab";
```

After `sentimentPulse`:

```tsx
const signalLab = buildSignalLabModel({
  market,
  externalSignals,
  sentimentPulse,
});
```

Add a section after `SentimentPulse`:

```tsx
<section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
  <SignalLab model={signalLab} />
</section>
```

- [ ] **Step 4: Verify integration test passes**

Run: `npm run test -- src/app/market-page-source.test.ts`

Expected: pass.

- [ ] **Step 5: Verify market page source still includes existing panels**

Run: `npm run test -- src/components/signal-lab.test.tsx src/app/market-page-source.test.ts`

Expected: pass, with source test still asserting `ExternalSignals` and `SentimentPulse`.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add src/app/markets/[slug]/page.tsx src/app/market-page-source.test.ts
git commit -m "feat: add signal lab to market pages"
```

---

### Task 4: Verification, Learning, and Deployment

**Files:**
- Modify: `.Codex/learnings.md`

**Interfaces:**
- Consumes: completed tasks 1-3.
- Produces: passing repo, pushed commits, production Netlify deploy, verified production pages.

- [ ] **Step 1: Run full local verification**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected:
- 24+ test files pass.
- ESLint exits 0.
- Next build succeeds and includes `/markets/polymarket-oscars-best-picture`, `/markets/highest-grossing-movie-in-2026`, and other seeded market routes.

- [ ] **Step 2: Verify generated output contains Signal Lab**

Run:

```bash
rg -F "Signal Lab" .next
rg -F "Market price vs. your view" .next
```

Expected: both commands find generated output.

- [ ] **Step 3: Add project learning**

Append to `.Codex/learnings.md`:

```md
## 2026-06-21 - Signal Lab Calculator

- What worked: Building Signal Lab as a deterministic model plus a client calculator kept paid APIs out of render paths while adding useful market-page interactivity.
- What broke: Nothing if full verification passes.
- Pattern to remember: Market-page tools should consume existing server-normalized models and keep user-entered estimates browser-local.
```

- [ ] **Step 4: Commit verification note**

Run:

```bash
git add .Codex/learnings.md
git commit -m "docs: record signal lab implementation learning"
```

- [ ] **Step 5: Push all commits**

Use the project HTTPS token push pattern:

```powershell
$envPath = 'C:\Users\longl\Desktop\Shared-Sync\.env'
$tokenLine = Select-String -Path $envPath -Pattern '^GITHUB_TOKEN=' | Select-Object -First 1
$token = $tokenLine.Line -replace '^GITHUB_TOKEN=', ''
$publicRemote = 'https://github.com/OnlineAdventuress/screenodds.git'
$authRemote = "https://OnlineAdventuress:$token@github.com/OnlineAdventuress/screenodds.git"
git remote set-url origin $authRemote
git push origin master
git remote set-url origin $publicRemote
```

Expected: push succeeds.

- [ ] **Step 6: Deploy to Netlify**

Before deploy:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'screenodds' -and $_.CommandLine -match 'next' } | Select-Object ProcessId,CommandLine | Format-List
```

Deploy:

```powershell
$envPath = 'C:\Users\longl\Desktop\Shared-Sync\.env'
$tokenLine = Select-String -Path $envPath -Pattern '^NETLIFY_PERSONAL_ACCESS_TOKEN_THEVINYLBYTE=' | Select-Object -First 1
$env:NETLIFY_AUTH_TOKEN = $tokenLine.Line -replace '^NETLIFY_PERSONAL_ACCESS_TOKEN_THEVINYLBYTE=', ''
npx netlify deploy --prod --site 5700712b-37ac-4967-b3a4-9231d35efeda
```

Expected: production deploy succeeds.

- [ ] **Step 7: Verify production pages**

Check:

```powershell
Invoke-WebRequest -UseBasicParsing https://screenodds.com/markets/polymarket-oscars-best-picture
Invoke-WebRequest -UseBasicParsing https://screenodds.com/markets/highest-grossing-movie-in-2026
Invoke-WebRequest -UseBasicParsing https://screenodds.com/sitemap.xml
```

Expected:
- Market pages return 200.
- HTML contains `Signal Lab`.
- Sitemap returns 200.
