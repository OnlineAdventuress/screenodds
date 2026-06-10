import type { ExternalSignal } from "@/lib/external-signals";

type ExternalSignalsProps = {
  signals: ExternalSignal[];
};

export function ExternalSignals({ signals }: ExternalSignalsProps) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <div className="screen-panel p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="screen-kicker">Real-world signals</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
            External data to read beside the market
          </h2>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Checked {signals[0]?.checkedAt.slice(0, 10)}
        </p>
      </div>
      <div className="mt-5 divide-y divide-zinc-800">
        {signals.map((signal) => (
          <div key={signal.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[0.25fr_1fr_0.2fr]">
            <div>
              <p className="text-sm font-semibold text-zinc-100">{signal.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                {signal.sourceName}
              </p>
            </div>
            <div>
              <p className="text-base font-semibold text-teal-100">{signal.value}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{signal.detail}</p>
            </div>
            <div className="flex items-start justify-between gap-3 md:justify-end">
              <span className="rounded border border-zinc-700 px-2 py-1 text-xs uppercase tracking-[0.12em] text-zinc-400">
                {signal.confidence}
              </span>
              <a
                href={signal.sourceUrl}
                className="screen-link whitespace-nowrap"
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
