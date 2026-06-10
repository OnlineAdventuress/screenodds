import Link from "next/link";
import { LatestNews } from "@/components/latest-news";
import { MarketCard } from "@/components/market-card";
import { MetricCard } from "@/components/metric-card";
import { RelatedLinks } from "@/components/related-links";
import type { BoxOfficeHubData } from "@/lib/box-office";
import { formatCompactCurrency } from "@/lib/markets";

type BoxOfficeAuthorityHubProps = {
  data: BoxOfficeHubData;
};

export function BoxOfficeAuthorityHub({ data }: BoxOfficeAuthorityHubProps) {
  return (
    <>
      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <Link href="/" className="screen-link">
            Home
          </Link>
          <p className="screen-kicker mt-8">Box office authority</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
                Box Office Prediction Markets
              </h1>
              <p className="mt-5 text-base leading-8 text-zinc-300">
                Track opening weekend, highest-grossing movie, and release-calendar
                markets with source-backed context. ScreenOdds separates market-implied
                probability from box office reporting so each page can be useful beyond
                the price.
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Checked {data.checkedAt.slice(0, 10)}. TMDb is used for release
                metadata; box office gross figures need dedicated source verification
                before publication.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Tracked markets"
                value={String(data.summary.totalMarkets)}
                detail="Box office and highest-grossing movie markets."
              />
              <MetricCard
                label="1M volume"
                value={formatCompactCurrency(data.summary.totalVolume1mo)}
                detail="Recent prediction-market volume."
              />
              <MetricCard
                label="24H volume"
                value={formatCompactCurrency(data.summary.totalVolume24hr)}
                detail="Fresh market activity."
              />
              <MetricCard
                label="Liquidity"
                value={formatCompactCurrency(data.summary.totalLiquidity)}
                detail="Available market depth."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="screen-kicker">Release watchlist</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">
              Upcoming titles and market catalysts
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              These entries are metadata signals, not box office predictions. They tell
              us which releases may deserve market pages or news coverage.
            </p>
          </div>
          <div className="screen-panel divide-y divide-zinc-800 p-5">
            {data.watchlist.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[0.32fr_1fr_0.18fr]"
              >
                <div>
                  <p className="font-semibold text-zinc-50">{entry.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                    {entry.releaseDate ?? "Date pending"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-100">{entry.signal}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{entry.detail}</p>
                </div>
                <a
                  href={entry.sourceUrl}
                  className="screen-link md:text-right"
                  rel="nofollow noopener noreferrer"
                  target="_blank"
                >
                  {entry.sourceName}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="screen-kicker">Source stack</p>
        <h2 className="mt-3 text-3xl font-semibold text-zinc-50">
          Where ScreenOdds checks box office signals
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {data.sources.map((source) => (
            <a
              key={source.name}
              href={source.url}
              className="screen-panel block p-5"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              <p className="font-semibold text-zinc-50">{source.name}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{source.role}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-500">
                {source.cadence}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="screen-kicker">Markets</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50">
              Box office markets to watch
            </h2>
          </div>
          <Link
            href="/markets/scary-movie-opening-weekend-box-office"
            className="screen-link"
          >
            Opening weekend page
          </Link>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {data.markets.map((market) => (
            <MarketCard key={market.slug} market={market} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="screen-kicker">Methodology</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {data.methodology.map((entry) => (
            <div key={entry.title} className="screen-panel p-5">
              <h3 className="font-semibold text-zinc-50">{entry.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{entry.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <LatestNews title="Latest box office news" category="Box Office" />

      <RelatedLinks
        title="Build the box office research path"
        links={[
          {
            href: "/markets/highest-grossing-movie-in-2026",
            label: "Highest-grossing movie odds",
            description: "Year-end box office market context.",
          },
          {
            href: "/movies",
            label: "Movie prediction markets",
            description: "Casting, franchise, and release-calendar markets.",
          },
          {
            href: "/blog/best-picture-odds",
            label: "Best Picture odds",
            description: "Awards-market guide for film search demand.",
          },
        ]}
      />
    </>
  );
}
