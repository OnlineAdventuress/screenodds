import { fallbackMarkets } from "./fixtures";
import { normalizeGammaEvent, type GammaEvent, type Market } from "./markets";

export const entertainmentTags = [
  { id: 53, name: "Movies" },
  { id: 51, name: "Box Office" },
  { id: 18, name: "Awards" },
  { id: 100338, name: "TV & Streaming" },
  { id: 100339, name: "Reality TV" },
  { id: 102952, name: "Top Netflix" },
] as const;

export function buildGammaEventsUrl(tagId: number): string {
  const params = new URLSearchParams({
    tag_id: String(tagId),
    related_tags: "false",
    active: "true",
    closed: "false",
    limit: "5",
    order: "volume1mo",
    ascending: "false",
  });

  return `https://gamma-api.polymarket.com/events?${params.toString()}`;
}

export async function fetchEntertainmentMarkets(): Promise<Market[]> {
  try {
    const eventGroups = await Promise.all(
      entertainmentTags.map(async (tag) => {
        const response = await fetch(buildGammaEventsUrl(tag.id), {
          next: { revalidate: 900 },
          headers: { accept: "application/json" },
        });

        if (!response.ok) {
          return [];
        }

        return (await response.json()) as GammaEvent[];
      }),
    );

    const markets = dedupeMarkets(
      eventGroups
        .flat()
        .map(normalizeGammaEvent)
        .filter(isScreenOddsMarket),
    );

    return markets.length > 0
      ? markets.sort((a, b) => b.volume1mo - a.volume1mo).slice(0, 120)
      : fallbackMarkets;
  } catch {
    return fallbackMarkets;
  }
}

function dedupeMarkets(markets: Market[]): Market[] {
  const seen = new Set<string>();
  const deduped: Market[] = [];

  for (const market of markets) {
    if (!seen.has(market.slug)) {
      seen.add(market.slug);
      deduped.push(market);
    }
  }

  return deduped;
}

function isScreenOddsMarket(market: Market): boolean {
  const text = `${market.title} ${market.description} ${market.tags.join(" ")}`.toLowerCase();
  return [
    "movie",
    "film",
    "box office",
    "opening weekend",
    "oscar",
    "awards",
    "grammy",
    "tony",
    "netflix",
    "tv",
    "reality",
    "love island",
    "big brother",
    "top chef",
    "james bond",
    "culture",
  ].some((term) => text.includes(term));
}
