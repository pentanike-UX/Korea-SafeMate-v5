import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { StoryDetailWorkspaceClient } from "@/components/explore/story-detail-workspace-client";
import { getV4StoryBySlug } from "@/data/v4/stories";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { listPublishedV4Stories } = await import("@/data/v4/stories");
  return listPublishedV4Stories().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = getV4StoryBySlug(slug);
  const t = await getTranslations("V4.stories");
  if (!story) return { title: t("notFound") };
  return { title: `${story.title} | ${BRAND.name}`, description: story.deck };
}

export default async function StoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const story = getV4StoryBySlug(slug);
  if (!story) notFound();

  const payload = {
    title: story.title,
    deck: story.deck,
    readingMinutes: story.readingMinutes,
    tags: story.tags,
    decisionFocus: story.decisionFocus,
    bodyParagraphs: story.bodyParagraphs,
    relatedRouteSlugs: story.relatedRouteSlugs,
    coverImage: story.coverImage,
  };

  return <StoryDetailWorkspaceClient story={payload} />;
}
