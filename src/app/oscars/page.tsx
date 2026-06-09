import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LatestNews } from "@/components/latest-news";
import { RelatedLinks } from "@/components/related-links";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Oscars Odds",
  description:
    "Oscars prediction-market coverage for Best Picture, acting categories, nominations, and awards-season market signals.",
  alternates: {
    canonical: "/oscars",
  },
};

export default function OscarsPage() {
  const awardsGuides = articles.filter((article) => article.category === "Awards");

  return (
    <>
      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <Link href="/awards" className="screen-link">
              Awards hub
            </Link>
            <p className="screen-kicker mt-8">Oscars odds</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
              Oscars prediction-market coverage
            </h1>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              ScreenOdds tracks Oscars market signals across Best Picture,
              acting races, nominations, guild results, and campaign milestones.
              The first authority cluster prioritizes pages that combine clear
              search demand with recurring market movement.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/blog/polymarket-oscars-odds" className="screen-button">
                Oscars guide
              </Link>
              <Link href="/markets/polymarket-oscars-best-picture" className="screen-button-secondary">
                Best Picture market
              </Link>
            </div>
          </div>
          <Image
            src="/images/awards-hero.png"
            alt="Awards-season envelopes and prediction-market probability charts"
            width={1200}
            height={675}
            sizes="(min-width: 1024px) 48rem, 100vw"
            className="aspect-[16/9] w-full rounded-lg border border-zinc-800 object-cover shadow-2xl"
            priority
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="screen-kicker">Guides</p>
        <h2 className="mt-3 text-3xl font-semibold text-zinc-50">
          Oscars and awards-season guides
        </h2>
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {awardsGuides.map((guide) => (
            <Link key={guide.slug} href={`/blog/${guide.slug}`} className="screen-panel block p-5">
              <p className="screen-kicker">{guide.primaryKeyword}</p>
              <h3 className="mt-3 text-2xl font-semibold text-zinc-50">{guide.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{guide.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <LatestNews title="Latest Oscars market notes" category="Awards" />

      <RelatedLinks
        title="Oscars context"
        links={[
          {
            href: "/awards",
            label: "Awards Prediction Markets",
            description: "The broader awards hub for Oscars, Grammys, and Tonys.",
          },
          {
            href: "/blog/best-picture-odds",
            label: "Best Picture odds",
            description: "How to read Best Picture prediction-market prices.",
          },
          {
            href: "/news",
            label: "ScreenOdds news",
            description: "Daily low-risk market notes and source-backed updates.",
          },
        ]}
      />
    </>
  );
}
