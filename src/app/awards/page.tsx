import type { Metadata } from "next";
import { HubPageTemplate } from "@/components/hub-page-template";
import { hubPages } from "@/lib/content";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "Awards Prediction Markets | Polymarket Oscars Odds | ScreenOdds",
  description: "Track Polymarket Oscars, Best Picture odds, Grammy odds, and Tony Awards prediction markets.",
  alternates: {
    canonical: "/awards",
  },
};

export default async function AwardsPage() {
  return <HubPageTemplate hub={hubPages.awards} markets={await fetchEntertainmentMarkets()} />;
}
