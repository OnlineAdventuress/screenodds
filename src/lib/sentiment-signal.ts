import { DEFAULT_TRAILING_DAYS, getRecencyMetrics } from "./last30days";

export type SentimentItemSource =
  | "x"
  | "reddit"
  | "tiktok"
  | "web"
  | "news"
  | "polymarket";

export type ScoredSentimentItem = {
  source: SentimentItemSource;
  url?: string;
  author?: string;
  text: string;
  publishedAt: string;
  engagement?: number;
  relevance: number;
  stance: number;
  confidence: number;
};

export type WeightedSentimentItem = ScoredSentimentItem & {
  weight: number;
};

export type SentimentSignalConfig = {
  trailingDays: number;
  relevanceThreshold: number;
  signalDivergenceThreshold: number;
  minSignalSampleSize: number;
  highConfidenceSampleSize: number;
  highConfidenceAverage: number;
  minAverageConfidenceForSignal: number;
  recencyHalfLifeDays: number;
  engagementWeightCap: number;
  logisticSlope: number;
};

export type SentimentSignal = {
  marketProbability: number;
  socialProbability: number | null;
  divergence: number | null;
  rawIndex: number;
  sampleSize: number;
  avgConfidence: number;
  confidenceLabel: "low" | "medium" | "high";
  signal: boolean;
  topItems: WeightedSentimentItem[];
  methodology: string;
};

export type SentimentSignalInput = {
  marketProbability: number;
  items: ScoredSentimentItem[];
  now?: Date;
  config?: SentimentSignalConfig;
};

export type CalibrationResult = {
  status: "insufficient-data";
  snapshotCount: number;
  message: string;
};

export const DEFAULT_SENTIMENT_SIGNAL_CONFIG: SentimentSignalConfig = {
  trailingDays: DEFAULT_TRAILING_DAYS,
  relevanceThreshold: 0.35,
  signalDivergenceThreshold: 0.12,
  minSignalSampleSize: 3,
  highConfidenceSampleSize: 5,
  highConfidenceAverage: 0.75,
  minAverageConfidenceForSignal: 0.6,
  recencyHalfLifeDays: 14,
  engagementWeightCap: 4,
  logisticSlope: 1.6,
};

const UNCALIBRATED_METHODOLOGY =
  "ScreenOdds maps outcome-specific social stance to an uncalibrated social-implied probability. Treat this as context until resolved-market backtests calibrate the mapping.";

export function calculateSentimentSignal(input: SentimentSignalInput): SentimentSignal {
  const config = input.config ?? DEFAULT_SENTIMENT_SIGNAL_CONFIG;
  const now = input.now ?? new Date();
  const marketProbability = clampProbability(input.marketProbability);

  const weightedItems = input.items
    .map((item) => weightItem(item, { config, now }))
    .filter((item): item is WeightedSentimentItem => Boolean(item));

  if (weightedItems.length === 0) {
    return {
      marketProbability,
      socialProbability: null,
      divergence: null,
      rawIndex: 0,
      sampleSize: 0,
      avgConfidence: 0,
      confidenceLabel: "low",
      signal: false,
      topItems: [],
      methodology: UNCALIBRATED_METHODOLOGY,
    };
  }

  const totalWeight = weightedItems.reduce((total, item) => total + item.weight, 0);
  const rawIndex =
    totalWeight === 0
      ? 0
      : clamp(
          weightedItems.reduce((total, item) => total + item.stance * item.weight, 0) /
            totalWeight,
          -1,
          1,
        );
  const avgConfidence =
    weightedItems.reduce((total, item) => total + item.confidence, 0) / weightedItems.length;
  const socialProbability = mapIndexToProbability(rawIndex, config);
  const divergence = socialProbability - marketProbability;
  const confidenceLabel = getConfidenceLabel({
    sampleSize: weightedItems.length,
    avgConfidence,
    config,
  });

  return {
    marketProbability,
    socialProbability,
    divergence,
    rawIndex,
    sampleSize: weightedItems.length,
    avgConfidence,
    confidenceLabel,
    signal:
      Math.abs(divergence) >= config.signalDivergenceThreshold &&
      weightedItems.length >= config.minSignalSampleSize &&
      avgConfidence >= config.minAverageConfidenceForSignal,
    topItems: [...weightedItems].sort((a, b) => b.weight - a.weight).slice(0, 3),
    methodology: UNCALIBRATED_METHODOLOGY,
  };
}

export function mapIndexToProbability(
  rawIndex: number,
  config: SentimentSignalConfig = DEFAULT_SENTIMENT_SIGNAL_CONFIG,
): number {
  return clampProbability(1 / (1 + Math.exp(-config.logisticSlope * clamp(rawIndex, -1, 1))));
}

export function calibrateProbabilityMapping(
  snapshots: unknown[],
  config: SentimentSignalConfig = DEFAULT_SENTIMENT_SIGNAL_CONFIG,
): CalibrationResult {
  void config;

  return {
    status: "insufficient-data",
    snapshotCount: snapshots.length,
    message:
      "Need resolved historical snapshots before fitting Platt scaling or isotonic calibration.",
  };
}

function weightItem(
  item: ScoredSentimentItem,
  { config, now }: { config: SentimentSignalConfig; now: Date },
): WeightedSentimentItem | null {
  const relevance = clamp(item.relevance, 0, 1);
  const confidence = clamp(item.confidence, 0, 1);
  const stance = clamp(item.stance, -1, 1);
  const recency = getRecencyMetrics(item.publishedAt, {
    now,
    halfLifeDays: config.recencyHalfLifeDays,
  });

  if (!recency || relevance < config.relevanceThreshold || confidence <= 0) {
    return null;
  }

  if (recency.ageDays > config.trailingDays) {
    return null;
  }

  const engagement = Math.max(0, item.engagement ?? 0);
  const engagementWeight = Math.max(
    1,
    Math.min(config.engagementWeightCap, Math.log1p(engagement)),
  );
  const weight = relevance * confidence * recency.decay * engagementWeight;

  return {
    ...item,
    publishedAt: recency.publishedAt,
    relevance,
    stance,
    confidence,
    engagement,
    weight,
  };
}

function getConfidenceLabel({
  sampleSize,
  avgConfidence,
  config,
}: {
  sampleSize: number;
  avgConfidence: number;
  config: SentimentSignalConfig;
}): SentimentSignal["confidenceLabel"] {
  if (sampleSize < config.minSignalSampleSize || avgConfidence < config.minAverageConfidenceForSignal) {
    return "low";
  }

  if (sampleSize >= config.highConfidenceSampleSize && avgConfidence >= config.highConfidenceAverage) {
    return "high";
  }

  return "medium";
}

function clampProbability(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
