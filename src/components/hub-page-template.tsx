import Link from "next/link";
import { MarketCard } from "@/components/market-card";
import { MetricCard } from "@/components/metric-card";
import { RelatedLinks } from "@/components/related-links";
import { getHubMarkets, hubPages, type HubPage } from "@/lib/content";
import { calculateMarketSummary, formatCompactCurrency, type Market } from "@/lib/markets";

type HubPageTemplateProps = {
  hub: HubPage;
  markets: Market[];
};

export function HubPageTemplate({ hub, markets }: HubPageTemplateProps) {
  const hubMarkets = getHubMarkets(hub.category, markets);
  const summary = calculateMarketSummary(hubMarkets);

  return (
    <>
      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <Link href="/" className="screen-link">
            Home
          </Link>
          <p className="screen-kicker mt-8">{hub.eyebrow}</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
                {hub.title}
              </h1>
              <p className="mt-5 text-base leading-8 text-zinc-300">{hub.intro}</p>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Primary SEO target: <span className="text-amber-200">{hub.primaryKeyword}</span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Markets"
                value={String(summary.totalMarkets)}
                detail={`Tracked ${hub.category.toLowerCase()} pages.`}
              />
              <MetricCard
                label="1M volume"
                value={formatCompactCurrency(summary.totalVolume1mo)}
                detail="Recent prediction-market activity."
              />
              <MetricCard
                label="Liquidity"
                value={formatCompactCurrency(summary.totalLiquidity)}
                detail="Depth across matching markets."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="screen-kicker">Markets</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">
              Active {hub.category.toLowerCase()} signals
            </h2>
          </div>
          <Link href="/markets/highest-grossing-movie-in-2026" className="screen-link">
            Example market
          </Link>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {hubMarkets.length > 0 ? (
            hubMarkets.map((market) => <MarketCard key={market.slug} market={market} />)
          ) : (
            <div className="screen-panel p-5 text-zinc-400">
              No active live markets matched this hub. ScreenOdds keeps this page ready
              for the next market cycle.
            </div>
          )}
        </div>
      </section>

      <RelatedLinks
        links={Object.values(hubPages)
          .filter((entry) => entry.slug !== hub.slug)
          .slice(0, 3)
          .map((entry) => ({
            href: `/${entry.slug}`,
            label: entry.title,
            description: entry.description,
          }))}
      />
    </>
  );
}
