import type { Metadata } from "next";
import { BoxOfficeAuthorityHub } from "@/components/box-office-authority-hub";
import { getBoxOfficeHubData } from "@/lib/box-office";
import { fetchEntertainmentMarkets } from "@/lib/polymarket";

export const metadata: Metadata = {
  title: "Box Office Prediction Markets",
  description:
    "Opening weekend odds, highest-grossing movie markets, release watchlists, and source-backed box office prediction-market context.",
  alternates: {
    canonical: "/box-office",
  },
};

export default async function BoxOfficePage() {
  const markets = await fetchEntertainmentMarkets();
  const data = await getBoxOfficeHubData(markets);

  return <BoxOfficeAuthorityHub data={data} />;
}
