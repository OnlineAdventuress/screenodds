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

export type EvidenceBreakdownItem = {
  label: string;
  score: number;
  status: SignalCheckStatus;
  detail: string;
};

export type ReaderChecklistItem = {
  label: string;
  detail: string;
};

export type ResearchLink = {
  label: string;
  href: string;
  detail: string;
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
  evidenceBreakdown: EvidenceBreakdownItem[];
  readerChecklist: ReaderChecklistItem[];
  researchLinks: ResearchLink[];
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
  relatedMarkets?: Market[];
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
  relatedMarkets = [],
}: BuildSignalLabInput): SignalLabModel {
  const reliability = scoreReliability(market, externalSignals, sentimentPulse);
  const marketYesPriceCents = probabilityToCents(market.probability);
  const defaultReaderYesPriceCents = clampReaderProbability(market.probability * 100);
  const catalysts = buildCatalysts(market);

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
    evidenceBreakdown: buildEvidenceBreakdown(
      market,
      externalSignals,
      sentimentPulse,
      catalysts,
    ),
    readerChecklist: buildReaderChecklist(market),
    researchLinks: buildResearchLinks(market, relatedMarkets),
    catalysts,
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

export function buildEvidenceBreakdown(
  market: Market,
  externalSignals: ExternalSignal[],
  sentimentPulse: SentimentPulse | null,
  catalysts: SignalLabModel["catalysts"],
): EvidenceBreakdownItem[] {
  const marketDepthScore =
    market.volume1mo >= 250000 && market.liquidity >= 50000
      ? 90
      : market.volume1mo >= 1000 || market.liquidity >= 5000
        ? 60
        : 30;
  const liveSignalCount = externalSignals.filter((signal) => signal.confidence === "live").length;
  const sourceCoverageScore =
    liveSignalCount > 0
      ? 85
      : externalSignals.length >= 2
        ? 65
        : externalSignals.length === 1
          ? 45
          : 25;
  const sentimentFreshnessScore =
    sentimentPulse?.confidence === "live" ? 80 : sentimentPulse ? 50 : 25;
  const catalystScore = catalysts.length >= 3 ? 75 : catalysts.length >= 2 ? 55 : 35;

  return [
    {
      label: "Market depth",
      score: marketDepthScore,
      status: statusFromScore(marketDepthScore),
      detail: `${formatCompactCurrency(market.liquidity)} liquidity and ${formatCompactCurrency(market.volume1mo)} one-month volume.`,
    },
    {
      label: "Source coverage",
      score: sourceCoverageScore,
      status: statusFromScore(sourceCoverageScore),
      detail:
        liveSignalCount > 0
          ? `${liveSignalCount} live external signal${liveSignalCount === 1 ? "" : "s"} attached to this page.`
          : `${externalSignals.length} external signal${externalSignals.length === 1 ? "" : "s"} attached to this page.`,
    },
    {
      label: "Sentiment freshness",
      score: sentimentFreshnessScore,
      status: statusFromScore(sentimentFreshnessScore),
      detail: sentimentPulse
        ? `${sentimentPulse.sentimentLabel} sentiment from a ${sentimentPulse.windowDays}-day cached window.`
        : "No cached sentiment window is attached to this market yet.",
    },
    {
      label: "Catalyst clarity",
      score: catalystScore,
      status: statusFromScore(catalystScore),
      detail: `${catalysts.length} category-specific catalyst${catalysts.length === 1 ? "" : "s"} listed for the next research check.`,
    },
  ];
}

export function buildReaderChecklist(market: Market): ReaderChecklistItem[] {
  if (market.category === "Awards") {
    return [
      {
        label: "Check nomination timing",
        detail: "Confirm the next official shortlist, nomination, guild, or ceremony date.",
      },
      {
        label: "Compare precursor overlap",
        detail: "Read guild, critic, and festival results beside the market price.",
      },
      {
        label: "Confirm resolution rules",
        detail: "Make sure the market question matches the official award outcome.",
      },
      {
        label: "Watch liquidity before reactions",
        detail: "Thin awards markets can move sharply after one visible review or speech.",
      },
    ];
  }

  if (market.category === "Box Office") {
    return [
      {
        label: "Check weekend estimates",
        detail: "Compare the market with estimates, final grosses, and source timing.",
      },
      {
        label: "Compare release comps",
        detail: "Use similar titles, franchise history, and theater count before reading a move.",
      },
      {
        label: "Confirm the gross definition",
        detail: "Check whether the market resolves on domestic, worldwide, opening, or full-run data.",
      },
      {
        label: "Watch competing releases",
        detail: "Calendar changes and premium-format availability can change box office ranges.",
      },
    ];
  }

  if (market.category === "Reality TV") {
    return [
      {
        label: "Check episode timing",
        detail: "Confirm the next episode, vote window, elimination, or finale date.",
      },
      {
        label: "Compare public vote signals",
        detail: "Read social discussion beside official show mechanics and edit visibility.",
      },
      {
        label: "Confirm contestant field",
        detail: "Make sure withdrawals, eliminations, and format twists are reflected.",
      },
      {
        label: "Watch spoiler risk",
        detail: "Treat unsourced leaks as weak context until confirmed by the show or reputable coverage.",
      },
    ];
  }

  if (market.category === "TV & Streaming") {
    return [
      {
        label: "Check release calendar",
        detail: "Confirm official episode, season, renewal, or platform timing.",
      },
      {
        label: "Compare chart signals",
        detail: "Use platform rankings and third-party metadata as context, not resolution proof.",
      },
      {
        label: "Confirm source quality",
        detail: "Separate official announcements from trade reports and social speculation.",
      },
      {
        label: "Watch show-status changes",
        detail: "Cancellation, renewal, and production updates can move streaming markets quickly.",
      },
    ];
  }

  return [
    {
      label: "Check official sources",
      detail: "Start with official announcements, studio sources, or reputable trade coverage.",
    },
    {
      label: "Compare market depth",
      detail: "Read probability changes beside liquidity and one-month volume.",
    },
    {
      label: "Confirm resolution rules",
      detail: "Make sure the source of truth and deadline match the market question.",
    },
    {
      label: "Watch timing catalysts",
      detail: "Release calendars, casting updates, and public announcements can change the signal.",
    },
  ];
}

export function buildResearchLinks(
  market: Market,
  relatedMarkets: Market[] = [],
): ResearchLink[] {
  const links: ResearchLink[] = [
    {
      label: `${market.category} hub`,
      href: categoryHubPath[market.category],
      detail: `Compare this market with the broader ScreenOdds ${market.category.toLowerCase()} coverage.`,
    },
  ];
  const related = relatedMarkets.find((entry) => entry.slug !== market.slug);

  if (related) {
    links.push({
      label: `Related market: ${related.title}`,
      href: `/markets/${related.slug}`,
      detail: "Use a nearby market as a comparison point before reading one probability in isolation.",
    });
  }

  const guide = guidePathByCategory[market.category];
  if (guide) {
    links.push(guide);
  }

  return uniqueResearchLinks(links).slice(0, 3);
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

function statusFromScore(score: number): SignalCheckStatus {
  if (score >= 75) {
    return "positive";
  }
  if (score >= 45) {
    return "neutral";
  }
  return "warning";
}

function uniqueResearchLinks(links: ResearchLink[]): ResearchLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) {
      return false;
    }
    seen.add(link.href);
    return true;
  });
}

const categoryHubPath: Record<MarketCategory, string> = {
  Movies: "/movies",
  "Box Office": "/box-office",
  Awards: "/awards",
  "TV & Streaming": "/tv",
  "Reality TV": "/reality-tv",
  Culture: "/",
};

const guidePathByCategory: Partial<Record<MarketCategory, ResearchLink>> = {
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
    href: "/blog/love-island-odds",
    detail: "Review the reality TV checklist for votes, edits, and finale timing.",
  },
  "TV & Streaming": {
    label: "Streaming prediction guide",
    href: "/blog/polymarket-netflix-odds",
    detail: "Compare streaming markets with release timing and platform chart context.",
  },
  Movies: {
    label: "Movie prediction guide",
    href: "/blog/next-james-bond-actor-odds",
    detail: "Read how movie news, casting signals, and market depth interact.",
  },
  Culture: {
    label: "Prediction market analytics guide",
    href: "/blog/polymarket-analytics",
    detail: "Use the broader analytics guide before relying on one entertainment market.",
  },
};
