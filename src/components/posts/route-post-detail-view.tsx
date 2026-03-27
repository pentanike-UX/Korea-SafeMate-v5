import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import { getPostHeroImageUrl } from "@/lib/content-post-route";
import { getPublicGuardianById } from "@/lib/guardian-public";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { mockRegions } from "@/data/mock";
import { relatedPostsFor } from "@/lib/posts-public";
import { PostAuthorAside } from "@/components/posts/post-author-aside";
import { PostDetailStickyAside } from "@/components/posts/post-detail-sticky-aside";
import { RoutePostDetailClient } from "@/components/route-posts/route-post-detail-client";
import { ArrowLeft } from "lucide-react";

export async function RoutePostDetailView({ post }: { post: ContentPost }) {
  const t = await getTranslations("Posts");
  const related = relatedPostsFor(post, 4);
  const guardian = getPublicGuardianById(post.author_user_id);
  const sheetAvatar = guardian ? guardianProfileImageUrls(guardian).avatar : getPostHeroImageUrl(post);
  const sheetHeadline = guardian?.headline ?? post.summary;
  const sheetName = guardian?.display_name ?? post.author_display_name;
  const sheetRegion =
    guardian && mockRegions.some((r) => r.slug === guardian.primary_region_slug)
      ? guardian.primary_region_slug
      : mockRegions.some((r) => r.slug === post.region_slug)
        ? post.region_slug
        : null;

  return (
    <article className="bg-[var(--bg-page)] pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <Link
          href="/posts"
          className="group/back text-muted-foreground hover:text-foreground mb-4 -ml-2 inline-flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium transition-all duration-200 hover:border-border/70 hover:gap-2"
        >
          <ArrowLeft className="size-4 shrink-0 transition-transform duration-200 group-hover/back:-translate-x-0.5" aria-hidden />
          {t("backToList")}
        </Link>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 sm:py-6 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <RoutePostDetailClient
            post={post}
            requestHost={{
              guardianUserId: post.author_user_id,
              displayName: sheetName,
              headline: sheetHeadline.length > 180 ? `${sheetHeadline.slice(0, 177)}…` : sheetHeadline,
              avatarUrl: sheetAvatar,
              suggestedRegionSlug: sheetRegion,
            }}
          />
        </div>
        <PostDetailStickyAside variant="route">
          <PostAuthorAside post={post} />
        </PostDetailStickyAside>
      </div>

      {related.length > 0 ? (
        <section className="border-border/50 mt-12 border-t bg-card/90">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-text-strong text-xl font-semibold">{t("relatedTitle")}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/posts/${r.id}`}
                    className="border-border/70 bg-card block h-full rounded-2xl border p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-primary/25"
                  >
                    <p className="line-clamp-2 font-semibold leading-snug">{r.title}</p>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{r.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </article>
  );
}
