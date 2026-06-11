import Link from "next/link";
import {
  formatCompactCurrency,
  formatProbability,
  type Market,
} from "../lib/markets";

type MarketCardProps = {
  market: Market;
};

export function MarketCard({ market }: MarketCardProps) {
  const isLocalMarket = market.source === "fallback";
  const href = isLocalMarket
    ? `/markets/${market.slug}`
    : (market.sourceUrl ?? `https://polymarket.com/event/${market.slug}`);
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="screen-kicker">{market.category}</p>
          <h3 className="mt-3 text-lg font-semibold leading-6 text-zinc-50">
            {market.title}
          </h3>
        </div>
        <div className="text-right font-mono text-xl font-bold text-teal-200">
          {formatProbability(market.probability)}
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
        {market.description}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded bg-zinc-800">
        <div
          className="h-full rounded bg-teal-300"
          style={{ width: `${Math.max(4, market.probability * 100)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-zinc-500">
        <span>1M {formatCompactCurrency(market.volume1mo)}</span>
        <span>24H {formatCompactCurrency(market.volume24hr)}</span>
        <span>Liq {formatCompactCurrency(market.liquidity)}</span>
      </div>
      {!isLocalMarket ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Opens source market
        </p>
      ) : null}
    </>
  );

  if (!isLocalMarket) {
    return (
      <a
        href={href}
        className="screen-panel block p-4"
        rel="nofollow noopener noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="screen-panel block p-4">
      {content}
    </Link>
  );
}
