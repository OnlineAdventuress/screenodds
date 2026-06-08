import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { RelatedLinks } from "@/components/related-links";
import { articles, getArticleBySlug } from "@/lib/articles";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {};
  }

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/blog/${article.slug}`,
      type: "article",
      images: [
        {
          url: article.heroImage,
          width: 1200,
          height: 675,
          alt: article.heroAlt,
        },
      ],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const jsonLd = [
    buildArticleJsonLd(article),
    buildFaqPageJsonLd(article.faqs),
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: article.title, path: `/blog/${article.slug}` },
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
        <Link href="/blog" className="screen-link">
          Blog
        </Link>
        <p className="screen-kicker mt-8">{article.category}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-6xl">
          {article.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-zinc-300">{article.description}</p>
        <div className="mt-6 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
          <div className="screen-panel p-4">
            <p className="screen-kicker">Keyword</p>
            <p className="mt-2">{article.primaryKeyword}</p>
          </div>
          <div className="screen-panel p-4">
            <p className="screen-kicker">US volume</p>
            <p className="mt-2">{article.keywordVolume}</p>
          </div>
          <div className="screen-panel p-4">
            <p className="screen-kicker">Difficulty</p>
            <p className="mt-2">{article.keywordDifficulty}</p>
          </div>
        </div>

        <Image
          src={article.heroImage}
          alt={article.heroAlt}
          width={1200}
          height={675}
          sizes="(min-width: 768px) 56rem, 100vw"
          className="mt-8 aspect-[16/9] w-full rounded-lg border border-zinc-800 object-cover shadow-2xl"
          priority
        />

        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
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
          <h2 className="text-2xl font-semibold text-zinc-50">FAQ</h2>
          <div className="mt-5 space-y-4">
            {article.faqs.map((faq) => (
              <div key={faq.question} className="screen-panel p-4">
                <h3 className="font-semibold text-zinc-50">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>

      <RelatedLinks links={article.related} />
    </>
  );
}
