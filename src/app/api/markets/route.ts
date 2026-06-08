import { calculateMarketSummary } from "@/lib/markets";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const revalidate = 900;

export async function GET() {
  const markets = await fetchEntertainmentMarkets();

  return Response.json({
    markets,
    summary: calculateMarketSummary(markets),
    updatedAt: new Date().toISOString(),
  });
}
