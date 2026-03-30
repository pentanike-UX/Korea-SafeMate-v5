import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import { getPostHeroImageUrl } from "@/lib/content-post-route";
import { getPublicGuardianByIdMerged } from "@/lib/guardian-public-merged.server";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { mockRegions } from "@/data/mock";
import { clampSheetHeadline, resolveGuardianHeadlineWithPostFallback } from "@/lib/guardian-sheet-headline";
import { relatedPostsForMerged } from "@/lib/posts-public-merged.server";
import { SaveTravelerPostButton } from "@/components/posts/save-traveler-post-button";
import { PostAuthorAside } from "@/components/posts/post-author-aside";
import { PostDetailStickyAside } from "@/components/posts/post-detail-sticky-aside";
import { RelatedPostsBrowseSheet } from "@/components/posts/related-posts-browse-sheet";
import { RoutePostDetailClient } from "@/components/route-posts/route-post-detail-client";
import { ArrowLeft } from "lucide-react";

export async function RoutePostDetailView({ post }: { post: ContentPost }) {
  const t = await getTranslations("Posts");
  const related = await relatedPostsForMerged(post, 4);
  const guardian = await getPublicGuardianByIdMerged(post.author_user_id);
  const sheetAvatar = guardian ? guardianProfileImageUrls(guardian).avatar : getPostHeroImageUrl(post);
  const sheetHeadline = clampSheetHeadline(resolveGuardianHeadlineWithPostFallback(guardian?.headline, post.summary));
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
              headline: sheetHeadline,
              avatarUrl: sheetAvatar,
              suggestedRegionSlug: sheetRegion,
            }}
          />
        </div>
        <PostDetailStickyAside id="post-author-aside" variant="route">
          <SaveTravelerPostButton postId={post.id} />
          <PostAuthorAside post={post} />
        </PostDetailStickyAside>
      </div>

      {related.length > 0 ? (
        <section className="border-border/50 mt-12 border-t bg-card/90">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-text-strong text-xl font-semibold">{t("relatedTitle")}</h2>
              <RelatedPostsBrowseSheet
                items={related.map((r) => ({
                  id: r.id,
                  title: r.title,
                  summary: r.summary,
                  imageUrl: getPostHeroImageUrl(r),
                }))}
                sheetTitle={t("relatedBrowseSheetTitle")}
                triggerLabel={t("relatedBrowseTrigger")}
              />
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
