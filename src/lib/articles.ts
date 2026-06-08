import {
  getGuideBySlug,
  getPublishedGuides,
  type ArticleSection,
  type EvergreenGuide,
} from "./editorial";

export type { ArticleSection };

export type Article = EvergreenGuide;

export const articles: Article[] = getPublishedGuides();

export function getArticleBySlug(slug: string): Article | null {
  return getGuideBySlug(slug);
}
