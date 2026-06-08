import type { Metadata } from "next";
import { HubPageTemplate } from "@/components/hub-page-template";
import { hubPages } from "@/lib/content";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "Movie Prediction Markets | ScreenOdds",
  description: "Live movie prediction markets, including next James Bond actor odds and high-volume film markets.",
};

export default async function MoviesPage() {
  return <HubPageTemplate hub={hubPages.movies} markets={await fetchEntertainmentMarkets()} />;
}
