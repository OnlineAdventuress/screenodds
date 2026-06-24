import type { ExternalSignal } from "./external-signals";
import { formatCompactCurrency, formatProbability, type Market, type MarketCategory } from "./markets";
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

export type PriceComparisonLabel =
  | "Market is above your estimate"
  | "Market is below your estimate"
  | "Market is close to your estimate";

export type ProbabilityComparison = {
  marketProbability: number;
  readerProbability: number;
  differencePoints: number;
  label: ProbabilityComparisonLabel;
  summary: string;
};

export type PriceComparison = {
  marketYesPriceCents: number;
  readerYesPriceCents: number;
  differenceCents: number;
  label: PriceComparisonLabel;
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
  valueMath: {
    marketYesPriceCents: number;
    marketNoPriceCents: number;
    defaultReaderYesPriceCents: number;
    breakEvenProbabilityLabel: string;
    priceSummary: string;
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

export function buildSignalLabModel({
  market,
  externalSignals = [],
  sentimentPulse = null,
}: BuildSignalLabInput): SignalLabModel {
  const reliability = scoreReliability(market, externalSignals, sentimentPulse);
  const marketYesPriceCents = probabilityToCents(market.probability);
  const defaultReaderYesPriceCents = clampReaderProbability(market.probability * 100);

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
    valueMath: {
      marketYesPriceCents,
      marketNoPriceCents: 100 - marketYesPriceCents,
      defaultReaderYesPriceCents,
      breakEvenProbabilityLabel: formatProbability(market.probability),
      priceSummary: `${formatProbability(market.probability)} market probability is roughly ${marketYesPriceCents} cents on a $1-style probability scale.`,
    },
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
  let score = market.probability > 0 && market.probability < 1 ? 20 : 0;
  const warnings: string[] = [];
  const liveSignals = externalSignals.filter((signal) => signal.confidence === "live").length;

  if (market.volume1mo >= 250000) {
    score += 35;
  } else if (market.volume1mo >= 1000) {
    score += 22;
  } else {
    warnings.push("Low one-month volume makes the current price easier to move.");
  }

  if (market.liquidity >= 50000) {
    score += 25;
  } else if (market.liquidity >= 5000) {
    score += 15;
  } else {
    warnings.push("Limited liquidity reduces confidence in small price moves.");
  }

  if (externalSignals.length >= 2) {
    score += 20;
  } else if (externalSignals.length === 1) {
    score += 10;
  } else {
    warnings.push("No external source panel is available for this market yet.");
  }

  if (liveSignals > 0) {
    score += 10;
  }
  if (sentimentPulse?.confidence === "live") {
    score += 10;
  }

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

function categoryCheck(
  market: Market,
  externalSignals: ExternalSignal[],
): SignalLabModel["checks"][number] {
  const hasKind = (kind: ExternalSignal["kind"]) =>
    externalSignals.some((signal) => signal.kind === kind);

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
