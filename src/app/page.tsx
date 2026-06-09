import Link from "next/link";
import Image from "next/image";
import { LatestNews } from "@/components/latest-news";
import { MarketCard } from "@/components/market-card";
import { MetricCard } from "@/components/metric-card";
import { RelatedLinks } from "@/components/related-links";
import { getCategoryCounts, getHomeStats, hubPages } from "@/lib/content";
import { formatCompactCurrency } from "@/lib/markets";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export default async function Home() {
  const markets = await fetchEntertainmentMarkets();
  const { ranked, summary } = getHomeStats(markets);
  const topMarkets = ranked.slice(0, 6);
  const categoryCounts = getCategoryCounts(markets);

  return (
    <>
      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="screen-kicker">Live entertainment markets</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
              Movie, awards, box office, and reality TV odds from prediction markets.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
              ScreenOdds tracks Polymarket entertainment markets and turns noisy culture
              feeds into focused, indexable pages for film, TV, streaming, awards, and
              reality-show outcomes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/oscars" className="screen-button">
                Track Oscars
              </Link>
              <Link href="/box-office" className="screen-button-secondary">
                View box office
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <Image
              src="/images/screenodds-og.png"
              alt="Editorial ScreenOdds market desk for movies, awards, and reality TV"
              width={1200}
              height={675}
              sizes="(min-width: 1024px) 48rem, 100vw"
              className="aspect-[16/9] w-full rounded-lg border border-zinc-800 object-cover shadow-2xl"
              priority
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {topMarkets.slice(0, 4).map((market) => (
                <MarketCard key={market.slug} market={market} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard
            label="Tracked markets"
            value={String(summary.totalMarkets)}
            detail="Live and fallback entertainment prediction markets."
          />
          <MetricCard
            label="1M volume"
            value={formatCompactCurrency(summary.totalVolume1mo)}
            detail="Recent market volume across the ScreenOdds universe."
          />
          <MetricCard
            label="24H volume"
            value={formatCompactCurrency(summary.totalVolume24hr)}
            detail="Fresh activity signal for currently moving markets."
          />
          <MetricCard
            label="Liquidity"
            value={formatCompactCurrency(summary.totalLiquidity)}
            detail="Available market depth across tracked events."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="screen-kicker">Hubs</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">
              Built around rankable entertainment-intent pages.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-zinc-400">
            DataForSEO showed the strongest launch wedge around Oscars, Best
            Picture odds, Love Island odds, Big Brother odds, and next James Bond actor odds.
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {Object.values(hubPages).map((hub) => {
            const count =
              categoryCounts.find((entry) => entry.category === hub.category)?.count ?? 0;

            return (
              <Link key={hub.slug} href={`/${hub.slug}`} className="screen-panel block p-4">
                <p className="screen-kicker">{hub.eyebrow}</p>
                <h3 className="mt-3 font-semibold text-zinc-50">{hub.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{count} tracked markets</p>
              </Link>
            );
          })}
        </div>
      </section>

      <LatestNews title="Latest market notes" />

      <RelatedLinks
        title="Start with the highest-intent pages"
        links={[
          {
            href: "/oscars",
            label: "Polymarket Oscars odds",
            description: "The best direct-intent launch cluster by keyword volume.",
          },
          {
            href: "/reality-tv",
            label: "Reality TV odds",
            description: "Love Island and Big Brother terms are low difficulty.",
          },
          {
            href: "/movies",
            label: "Next James Bond actor odds",
            description: "A focused movie page with measurable search volume.",
          },
        ]}
      />
    </>
  );
}
