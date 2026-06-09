import Image from "next/image";
import Link from "next/link";
import type { MarketCategory } from "@/lib/markets";
import { getLatestNews, type NewsPost } from "@/lib/editorial";

type LatestNewsProps = {
  title?: string;
  category?: MarketCategory;
  limit?: number;
};

export function LatestNews({
  title = "Latest ScreenOdds news",
  category,
  limit = 3,
}: LatestNewsProps) {
  const posts = getLatestNews(limit, category);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="screen-kicker">News</p>
          <h2 className="mt-3 text-3xl font-semibold text-zinc-50">{title}</h2>
        </div>
        <Link href="/news" className="screen-link">
          All news
        </Link>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {posts.map((post) => (
          <NewsCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}

function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Link href={`/news/${post.slug}`} className="screen-panel block p-4">
      <Image
        src={post.heroImage}
        alt={post.heroAlt}
        width={800}
        height={450}
        sizes="(min-width: 1024px) 24rem, 100vw"
        className="aspect-[16/9] w-full rounded-md object-cover"
      />
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span>{post.category}</span>
        <span>{post.publishedAt}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-7 text-zinc-50">{post.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{post.description}</p>
    </Link>
  );
}
