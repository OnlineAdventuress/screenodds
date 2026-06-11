import type { Metadata } from "next";
import { HubPageTemplate } from "@/components/hub-page-template";
import { hubPages } from "@/lib/content";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "TV and Streaming Prediction Markets | ScreenOdds",
  description: "Netflix, TV release, and streaming chart prediction markets for screen entertainment.",
  alternates: {
    canonical: "/tv",
  },
};

export default async function TvPage() {
  return <HubPageTemplate hub={hubPages.tv} markets={await fetchEntertainmentMarkets()} />;
}
