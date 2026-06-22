import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Entertainment Market Blog",
  description:
    "SEO guides for entertainment prediction markets, awards odds, movie markets, and reality TV odds.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="screen-kicker">SEO articles</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
        Entertainment prediction-market guides
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
        DataForSEO-backed articles for Oscars, Best Picture, reality TV, and
        movie-market keywords ScreenOdds can realistically rank for.
      </p>
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {articles.map((article) => (
          <Link key={article.slug} href={`/blog/${article.slug}`} className="screen-panel block p-5">
            <Image
              src={article.heroImage}
              alt={article.heroAlt}
              width={1200}
              height={675}
              sizes="(min-width: 1024px) 38rem, 100vw"
              className="aspect-[16/9] w-full rounded-lg object-cover"
            />
            <p className="screen-kicker">{article.category}</p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
              {article.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{article.description}</p>
            <p className="mt-4 text-xs text-zinc-500">
              Keyword: {article.primaryKeyword} | US volume: {article.keywordVolume} | KD:{" "}
              {article.keywordDifficulty}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
