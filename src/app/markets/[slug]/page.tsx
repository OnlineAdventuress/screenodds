import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalSignals } from "@/components/external-signals";
import { MarketCard } from "@/components/market-card";
import { SentimentPulse } from "@/components/sentiment-pulse";
import { getLaunchMarkets, getRelatedMarkets, getSeededMarket } from "@/lib/content";
import { getExternalSignalsForMarket } from "@/lib/external-signals";
import { formatCompactCurrency, formatProbability } from "@/lib/markets";
import { getSentimentPulseForMarket } from "@/lib/sentiment";

type MarketPageProps = {
  params: Promise<{ slug: string }>;
};

const categoryPath = {
  Movies: "/movies",
  "Box Office": "/box-office",
  Awards: "/awards",
  "TV & Streaming": "/tv",
  "Reality TV": "/reality-tv",
  Culture: "/",
} as const;

export function generateStaticParams() {
  return getLaunchMarkets().map((market) => ({
    slug: market.slug,
  }));
}

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { slug } = await params;
  const market = getSeededMarket(slug);

  if (!market) {
    return {};
  }

  return {
    title: `${market.title} Odds`,
    description: `${market.description} See probability, one-month volume, liquidity, and related ScreenOdds pages.`,
    alternates: {
      canonical: `/markets/${market.slug}`,
    },
  };
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { slug } = await params;
  const market = getSeededMarket(slug);

  if (!market) {
    notFound();
  }

  const related = getRelatedMarkets(market);
  const externalSignals = await getExternalSignalsForMarket(market);
  const sentimentPulse = await getSentimentPulseForMarket(market.slug);

  return (
    <>
      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <Link href={categoryPath[market.category]} className="screen-link">
            Back to {market.category}
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.42fr]">
            <div>
              <p className="screen-kicker">{market.category}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
                {market.title} odds
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
                {market.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {market.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <aside className="screen-panel p-5">
              <p className="screen-kicker">Current yes</p>
              <p className="mt-4 font-mono text-5xl font-bold text-teal-200">
                {formatProbability(market.probability)}
              </p>
              <div className="mt-6 space-y-3 text-sm text-zinc-300">
                <div className="flex justify-between gap-4">
                  <span>One-month volume</span>
                  <span>{formatCompactCurrency(market.volume1mo)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>24h volume</span>
                  <span>{formatCompactCurrency(market.volume24hr)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Liquidity</span>
                  <span>{formatCompactCurrency(market.liquidity)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Source</span>
                  <span>{market.source}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="screen-panel p-5">
          <p className="screen-kicker">Research note</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
            How to read this market
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            ScreenOdds displays market-implied probabilities as information, not
            advice. Check the exact Polymarket question, resolution source, liquidity,
            and recent volume before treating a price as a durable entertainment signal.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <ExternalSignals signals={externalSignals} />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <SentimentPulse pulse={sentimentPulse} />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <h2 className="text-2xl font-semibold text-zinc-50">Related markets</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {related.map((entry) => (
            <MarketCard key={entry.slug} market={entry} />
          ))}
        </div>
      </section>
    </>
  );
}
