import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublishedNewsPosts } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "Entertainment Market News",
  description:
    "Source-backed entertainment prediction-market news for awards, box office, movies, streaming, and reality TV.",
  alternates: {
    canonical: "/news",
  },
};

export default function NewsPage() {
  const posts = getPublishedNewsPosts();

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="screen-kicker">News</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
        Entertainment prediction-market news
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
        Source-backed market notes for Oscars, box office, movies, streaming,
        and reality TV. Rumors, leaks, and unclear stories stay out of this
        index until sourcing checks pass.
      </p>
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.slug} href={`/news/${post.slug}`} className="screen-panel block p-5">
            <Image
              src={post.heroImage}
              alt={post.heroAlt}
              width={1200}
              height={675}
              sizes="(min-width: 1024px) 38rem, 100vw"
              className="aspect-[16/9] w-full rounded-lg object-cover"
            />
            <p className="screen-kicker mt-4">{post.category}</p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-50">{post.title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{post.description}</p>
            <p className="mt-4 text-xs text-zinc-500">
              {post.newsType.replaceAll("-", " ")} | Updated {post.updatedAt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
