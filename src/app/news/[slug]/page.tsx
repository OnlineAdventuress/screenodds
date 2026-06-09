import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RelatedLinks } from "@/components/related-links";
import { getNewsPostBySlug, getPublishedNewsPosts } from "@/lib/editorial";
import {
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
} from "@/lib/seo";

type NewsArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedNewsPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getNewsPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/news/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/news/${post.slug}`,
      type: "article",
      images: [
        {
          url: post.heroImage,
          width: 1200,
          height: 675,
          alt: post.heroAlt,
        },
      ],
    },
  };
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const post = getNewsPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = [
    buildNewsArticleJsonLd(post),
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "News", path: "/news" },
      { name: post.title, path: `/news/${post.slug}` },
    ]),
  ];

  return (
    <>
      {jsonLd.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
      <article className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
        <Link href="/news" className="screen-link">
          News
        </Link>
        <p className="screen-kicker mt-8">{post.category}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
          {post.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-zinc-300">{post.description}</p>
        <div className="mt-6 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
          <div className="screen-panel p-4">
            <p className="screen-kicker">Type</p>
            <p className="mt-2 capitalize">{post.newsType.replaceAll("-", " ")}</p>
          </div>
          <div className="screen-panel p-4">
            <p className="screen-kicker">Updated</p>
            <p className="mt-2">{post.updatedAt}</p>
          </div>
          <div className="screen-panel p-4">
            <p className="screen-kicker">Source check</p>
            <p className="mt-2">{Math.round(post.sourceConfidence * 100)}%</p>
          </div>
        </div>

        <Image
          src={post.heroImage}
          alt={post.heroAlt}
          width={1200}
          height={675}
          sizes="(min-width: 768px) 56rem, 100vw"
          className="mt-8 aspect-[16/9] w-full rounded-lg border border-zinc-800 object-cover shadow-2xl"
          priority
        />
        <p className="mt-3 text-xs leading-5 text-zinc-500">{post.heroMedia.credit}</p>

        <div className="mt-10 space-y-10">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold text-zinc-50">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-8 text-zinc-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 border-t border-zinc-800 pt-8">
          <h2 className="text-2xl font-semibold text-zinc-50">Sources</h2>
          <div className="mt-5 space-y-3">
            {post.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                rel="noopener noreferrer"
                target="_blank"
                className="screen-panel block p-4"
              >
                <p className="font-semibold text-zinc-50">{source.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {source.publisher} | Accessed {source.accessedAt}
                </p>
              </a>
            ))}
          </div>
        </section>
      </article>

      <RelatedLinks title="Market context" links={post.marketLinks} />
      <RelatedLinks links={post.related} />
    </>
  );
}
