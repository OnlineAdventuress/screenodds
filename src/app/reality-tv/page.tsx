import type { Metadata } from "next";
import { HubPageTemplate } from "@/components/hub-page-template";
import { hubPages } from "@/lib/content";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "Reality TV Odds | Love Island and Big Brother Markets | ScreenOdds",
  description: "Reality TV prediction markets for Love Island odds, Big Brother odds, Top Chef, and similar shows.",
};

export default async function RealityTvPage() {
  return <HubPageTemplate hub={hubPages["reality-tv"]} markets={await fetchEntertainmentMarkets()} />;
}
