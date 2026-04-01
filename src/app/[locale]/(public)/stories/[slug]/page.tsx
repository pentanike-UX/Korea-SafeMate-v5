import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getV4StoryBySlug } from "@/data/v4/stories";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";

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
  const t = await getTranslations("V4.storyDetail");
  if (!story) notFound();

  return (
    <article className="bg-[var(--bg-page)] pb-24">
      <div className="relative aspect-[21/9] w-full max-w-[100rem] mx-auto overflow-hidden">
        <Image src={story.coverImage} alt="" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)] via-transparent to-transparent" />
      </div>
      <div className="page-container -mt-16 relative max-w-3xl sm:-mt-20">
        <div className="bg-card ring-border/60 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-md)] ring-1 sm:p-10">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {story.readingMinutes} min · {story.tags.join(" · ")}
          </p>
          <h1 className="text-[var(--text-strong)] mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{story.title}</h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{story.deck}</p>
          <section className="border-border/50 mt-8 border-t pt-8">
            <h2 className="text-[var(--text-strong)] text-sm font-semibold tracking-wide uppercase">{t("decisionFocus")}</h2>
            <p className="text-foreground mt-2 leading-relaxed">{story.decisionFocus}</p>
          </section>
          <div className="mt-8 space-y-5">
            {story.bodyParagraphs.map((para, i) => (
              <p key={i} className="text-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
          {story.relatedRouteSlugs.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-3">
              {story.relatedRouteSlugs.map((rs) => (
                <Button key={rs} asChild variant="outline" className="rounded-[var(--radius-lg)]">
                  <Link href={`/explore/routes/${rs}`}>{t("relatedRoute")}</Link>
                </Button>
              ))}
              <Button asChild className="rounded-[var(--radius-lg)]">
                <Link href="/planner">{t("openPlanner")}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
