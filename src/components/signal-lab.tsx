"use client";

import { useMemo, useState } from "react";
import {
  clampReaderProbability,
  compareProbabilityEstimate,
  type SignalCheckStatus,
  type SignalLabModel,
} from "../lib/signal-lab";

type SignalLabProps = {
  model: SignalLabModel;
};

const statusClasses: Record<SignalCheckStatus, string> = {
  positive: "border-teal-400/60 text-teal-100",
  neutral: "border-zinc-700 text-zinc-200",
  warning: "border-amber-400/60 text-amber-100",
};

export function SignalLab({ model }: SignalLabProps) {
  const [readerEstimate, setReaderEstimate] = useState(model.defaultReaderProbability);
  const comparison = useMemo(
    () => compareProbabilityEstimate(model.marketProbability, readerEstimate),
    [model.marketProbability, readerEstimate],
  );

  function updateReaderEstimate(value: string) {
    setReaderEstimate(clampReaderProbability(Number(value)));
  }

  return (
    <div className="screen-panel p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <p className="screen-kicker">Signal Lab</p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
            Market price vs. your view
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Compare the market-implied probability with your own estimate, then
            check whether volume, liquidity, sources, and catalysts support the move.
          </p>
        </div>
        <div className="rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
          {model.reliability.label} / {model.reliability.score}/100
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded border border-zinc-800 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SignalValue label="Market estimate" value={model.probabilityLabel} />
            <SignalValue label="Your estimate" value={`${readerEstimate}%`} />
          </div>

          <label
            className="mt-5 block text-sm font-semibold text-zinc-100"
            htmlFor={`${model.marketSlug}-estimate`}
          >
            Your probability estimate
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id={`${model.marketSlug}-estimate`}
              type="range"
              min="1"
              max="99"
              value={readerEstimate}
              onChange={(event) => updateReaderEstimate(event.target.value)}
              className="w-full accent-teal-300"
            />
            <input
              type="number"
              min="1"
              max="99"
              value={readerEstimate}
              onChange={(event) => updateReaderEstimate(event.target.value)}
              className="w-24 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              aria-label="Your probability estimate"
            />
          </div>

          <div className="mt-4 rounded border border-zinc-800 p-3">
            <p className="text-sm font-semibold text-teal-100">{comparison.label}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{comparison.summary}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            This comparison is informational and depends on liquidity, fees, market
            rules, and source confidence. Your estimate stays in this browser.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded border border-zinc-800 p-4">
            <p className="text-sm font-semibold text-zinc-100">Reliability read</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {model.reliability.summary}
            </p>
            {model.reliability.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100">
                {model.reliability.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {model.checks.map((check) => (
              <div
                key={check.label}
                className={`rounded border p-3 ${statusClasses[check.status]}`}
              >
                <p className="text-sm font-semibold">{check.label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Upcoming catalysts</p>
          <div className="mt-3 divide-y divide-zinc-800 rounded border border-zinc-800">
            {model.catalysts.map((catalyst) => (
              <div key={`${catalyst.label}-${catalyst.dateLabel}`} className="p-3">
                <p className="text-sm font-semibold text-zinc-100">{catalyst.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                  {catalyst.dateLabel} / {catalyst.sourceLabel}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-100">Methodology</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
            {model.methodology.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SignalValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold text-zinc-50">{value}</p>
    </div>
  );
}
