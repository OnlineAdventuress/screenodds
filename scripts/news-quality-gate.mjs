export const newsQualityThresholds = {
  publishScore: 80,
  draftScore: 60,
  highSourceConfidence: 0.75,
  moderateSourceConfidence: 0.55,
  minimumTrustedSources: 2,
};

const trustedSourceTypes = new Set([
  "official",
  "market-data",
  "box-office-data",
  "trade-reporting",
]);

const primarySourceTypes = new Set(["official", "market-data", "box-office-data"]);

export function evaluateNewsCandidate(candidate, { requestedPublish = false } = {}) {
  const reasons = [];
  let score = 0;

  if (candidate.sourceConfidence >= newsQualityThresholds.highSourceConfidence) {
    score += 30;
    reasons.push("source confidence is high");
  } else if (candidate.sourceConfidence >= newsQualityThresholds.moderateSourceConfidence) {
    score += 20;
    reasons.push("needs stronger sourcing before publication");
  } else {
    score += 5;
    reasons.push("source confidence is low");
  }

  const trustedSourceCount = countTrustedSources(candidate.sources ?? []);
  const hasPrimarySource = hasPrimarySignalSource(candidate.sources ?? []);
  if (trustedSourceCount >= newsQualityThresholds.minimumTrustedSources) {
    score += 25;
    reasons.push("has at least two trusted sources");
  } else if (trustedSourceCount === 1) {
    score += 12;
    reasons.push("has one trusted source");
    reasons.push("needs stronger sourcing before publication");
  } else {
    reasons.push("has no trusted sources");
  }

  if (hasPrimarySource) {
    reasons.push("has a primary signal source");
  } else {
    reasons.push("needs an official, market-data, or box-office source before auto-publication");
  }

  if ((candidate.riskFlags ?? []).length === 0) {
    score += 15;
    reasons.push("has no risk flags");
  } else {
    score -= 20;
    reasons.push("risk flags require editorial review");
  }

  if ((candidate.marketLinks ?? []).length > 0) {
    score += 10;
    reasons.push("has ScreenOdds market context");
  } else {
    reasons.push("missing ScreenOdds market context");
  }

  if ((candidate.related ?? []).length > 0) {
    score += 5;
    reasons.push("has internal related links");
  } else {
    reasons.push("missing internal related links");
  }

  if (candidate.heroImage && candidate.heroAlt) {
    score += 5;
    reasons.push("has image and alt text");
  } else {
    reasons.push("missing image metadata");
  }

  if (hasUsefulEditorialBody(candidate.sections ?? [])) {
    score += 10;
    reasons.push("adds ScreenOdds editorial context");
  } else {
    reasons.push("editorial body is too thin");
  }

  score = Math.max(0, Math.min(100, score));

  if (
    requestedPublish &&
    score >= newsQualityThresholds.publishScore &&
    trustedSourceCount >= newsQualityThresholds.minimumTrustedSources &&
    hasPrimarySource &&
    (candidate.riskFlags ?? []).length === 0
  ) {
    return { action: "publish", score, reasons: uniqueReasons(reasons) };
  }

  if (score >= newsQualityThresholds.draftScore) {
    return { action: "draft", score, reasons: uniqueReasons(reasons) };
  }

  return {
    action: "discard",
    score,
    reasons: uniqueReasons([...reasons, "discarded because it is too thin or risky"]),
  };
}

function countTrustedSources(sources) {
  return sources.filter((source) => trustedSourceTypes.has(source.sourceType)).length;
}

function hasPrimarySignalSource(sources) {
  return sources.some((source) => primarySourceTypes.has(source.sourceType));
}

function hasUsefulEditorialBody(sections) {
  const text = sections
    .flatMap((section) => section.paragraphs ?? [])
    .join(" ")
    .trim();

  return text.split(/\s+/).filter(Boolean).length >= 24;
}

function uniqueReasons(reasons) {
  return [...new Set(reasons)];
}
