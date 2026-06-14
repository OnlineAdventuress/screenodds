const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_TRAILING_DAYS = 30;
export const DEFAULT_RECENCY_HALF_LIFE_DAYS = 14;

export type TrailingWindowOptions = {
  now?: Date;
  trailingDays?: number;
};

export type RecencyOptions = {
  now?: Date;
  halfLifeDays?: number;
};

export type RecencyMetrics = {
  publishedAt: string;
  ageDays: number;
  decay: number;
};

export function normalizePublishedAt(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function filterToTrailingWindow<T>(
  items: T[],
  getPublishedAt: (item: T) => unknown,
  options: TrailingWindowOptions = {},
): T[] {
  const now = options.now ?? new Date();
  const trailingDays = options.trailingDays ?? DEFAULT_TRAILING_DAYS;
  const startTime = now.getTime() - trailingDays * MS_PER_DAY;

  return items.filter((item) => {
    const normalized = normalizePublishedAt(getPublishedAt(item));
    if (!normalized) {
      return false;
    }

    const time = new Date(normalized).getTime();
    return time >= startTime && time <= now.getTime();
  });
}

export function getRecencyMetrics(
  publishedAt: unknown,
  options: RecencyOptions = {},
): RecencyMetrics | null {
  const normalized = normalizePublishedAt(publishedAt);
  if (!normalized) {
    return null;
  }

  const now = options.now ?? new Date();
  const halfLifeDays = options.halfLifeDays ?? DEFAULT_RECENCY_HALF_LIFE_DAYS;
  const ageDays = Math.max(0, (now.getTime() - new Date(normalized).getTime()) / MS_PER_DAY);
  const decay = Math.pow(0.5, ageDays / Math.max(halfLifeDays, 1));

  return {
    publishedAt: normalized,
    ageDays,
    decay,
  };
}
