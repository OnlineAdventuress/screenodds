import type { Metadata } from "next";
import { HubPageTemplate } from "@/components/hub-page-template";
import { hubPages } from "@/lib/content";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "Box Office Prediction Markets | ScreenOdds",
  description: "Opening weekend box office odds and highest-grossing movie prediction markets.",
};

export default async function BoxOfficePage() {
  return <HubPageTemplate hub={hubPages["box-office"]} markets={await fetchEntertainmentMarkets()} />;
}
