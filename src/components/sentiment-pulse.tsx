import type { SentimentPulse as SentimentPulseModel } from "../lib/sentiment";

type SentimentPulseProps = {
  pulse: SentimentPulseModel | null;
};

export function SentimentPulse({ pulse }: SentimentPulseProps) {
  if (!pulse) {
    return null;
  }

  const sourceCounts = [
    ["X", pulse.sourceCounts.x],
    ["Reddit", pulse.sourceCounts.reddit],
    ["Polymarket", pulse.sourceCounts.polymarket],
    ["Kalshi", pulse.sourceCounts.kalshi],
  ];

  return (
    <div className="screen-panel p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="screen-kicker">Sentiment pulse</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
            Social and comparison-market context
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 sm:justify-end">
          <span className="rounded border border-zinc-700 px-2 py-1">
            {pulse.sentimentLabel}
          </span>
          <span className="rounded border border-zinc-700 px-2 py-1">
            {pulse.confidence}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Checked {pulse.checkedAt.slice(0, 10)} · {pulse.windowDays}-day window
          </p>
          <p className="mt-3 text-sm leading-7 text-zinc-300">{pulse.summary}</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">
            {pulse.topNarratives.map((narrative) => (
              <li key={narrative} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                <span>{narrative}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sourceCounts.map(([label, count]) => (
              <div key={label} className="rounded border border-zinc-800 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                  {label}:{count}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Cited discussion</p>
            <div className="mt-3 space-y-3">
              {pulse.citedPosts.length > 0 ? (
                pulse.citedPosts.map((post) => (
                  <a
                    key={post.url}
                    href={post.url}
                    className="block rounded border border-zinc-800 p-3 transition hover:border-teal-300/60"
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                      {post.source} · {post.date} · {post.engagementLabel}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-100">
                      {post.author}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{post.text}</p>
                  </a>
                ))
              ) : (
                <p className="rounded border border-zinc-800 p-3 text-sm text-zinc-500">
                  No cited social posts cached yet.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-100">Related markets</p>
            <div className="mt-3 space-y-3">
              {pulse.relatedMarkets.length > 0 ? (
                pulse.relatedMarkets.map((market) => (
                  <a
                    key={market.url}
                    href={market.url}
                    className="block rounded border border-zinc-800 p-3 transition hover:border-teal-300/60"
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                      {market.source}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-100">
                      {market.title}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      {market.priceLabel}
                      {market.volumeLabel ? ` · ${market.volumeLabel}` : ""}
                    </p>
                  </a>
                ))
              ) : (
                <p className="rounded border border-zinc-800 p-3 text-sm text-zinc-500">
                  No related comparison markets cached yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
