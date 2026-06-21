import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SignalLabModel } from "../lib/signal-lab";
import { SignalLab } from "./signal-lab";

const model: SignalLabModel = {
  marketSlug: "polymarket-oscars-best-picture",
  marketTitle: "Polymarket Oscars Best Picture odds",
  category: "Awards",
  marketProbability: 0.22,
  probabilityLabel: "22%",
  defaultReaderProbability: 22,
  volumeLabel: "$628",
  liquidityLabel: "$8.7K",
  reliability: {
    score: 47,
    label: "Developing signal",
    summary: "The market has some useful support.",
    warnings: ["Low one-month volume makes the current price easier to move."],
  },
  checks: [
    {
      label: "Market liquidity",
      status: "neutral",
      detail: "$8.7K liquidity and $628 one-month volume.",
    },
    {
      label: "Awards signal",
      status: "neutral",
      detail: "Check nominations and guild results.",
    },
  ],
  catalysts: [
    {
      label: "Nomination and shortlist updates",
      dateLabel: "Awards season",
      sourceLabel: "Official awards bodies",
    },
  ],
  methodology: [
    "ScreenOdds compares market-implied probability with volume, liquidity, external source coverage, and category-specific catalysts.",
  ],
};

describe("SignalLab", () => {
  it("renders calculator, reliability, checks, catalysts, and methodology", () => {
    const html = renderToStaticMarkup(<SignalLab model={model} />);
    const visibleText = html.replace(/<[^>]*>/g, " ");

    expect(html).toContain("Signal Lab");
    expect(html).toContain("Market price vs. your view");
    expect(html).toContain("22%");
    expect(html).toContain("Your estimate");
    expect(html).toContain("Developing signal");
    expect(html).toContain("Market liquidity");
    expect(html).toContain("Awards signal");
    expect(html).toContain("Nomination and shortlist updates");
    expect(html).toContain("ScreenOdds compares market-implied probability");
    expect(visibleText).not.toContain("bet");
    expect(visibleText).not.toContain("buy");
    expect(visibleText).not.toContain("sell");
  });
});
