import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import { relatedPostsForMerged } from "@/lib/posts-public-merged.server";
import {
  getPostHeroImageAlt,
  getPostHeroImageUrl,
  getPostSecondaryImageAlt,
  getPostSecondaryImageUrl,
  postHasOwnVisualMedia,
  postHasRouteJourney,
} from "@/lib/content-post-route";
import { RelatedPostsBrowseSheet } from "@/components/posts/related-posts-browse-sheet";
import { GuardianRequestDefaultsPublisher } from "@/components/guardians/guardian-request-defaults-publisher";
import { SaveTravelerPostButton } from "@/components/posts/save-traveler-post-button";
import { PostAuthorAside } from "@/components/posts/post-author-aside";
import { PostDetailStickyAside } from "@/components/posts/post-detail-sticky-aside";
import { RoutePostDetailView } from "@/components/posts/route-post-detail-view";
import { getPublicGuardianByIdMerged } from "@/lib/guardian-public-merged.server";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { mockRegions } from "@/data/mock";
import { clampSheetHeadline, resolveGuardianHeadlineWithPostFallback } from "@/lib/guardian-sheet-headline";
import { splitPostBodyLeadRest } from "@/lib/post-detail-body-split";
import { resolvePostTypeLabelKey } from "@/lib/post-detail-type-label";
import { PostDetailHero } from "@/components/posts/post-detail-hero";
import { PostDetailIntroPanel } from "@/components/posts/post-detail-intro-panel";
import { PostGuardianAttributionRow } from "@/components/posts/post-guardian-attribution-row";
import { FILL_IMAGE_COVER_CENTER } from "@/lib/ui/fill-image";
import { ArrowLeft } from "lucide-react";

export async function PostDetailView({ post }: { post: ContentPost }) {
  if (postHasRouteJourney(post)) {
    return <RoutePostDetailView post={post} />;
  }

  const t = await getTranslations("Posts");
  const related = await relatedPostsForMerged(post, 4);
  const heroCover = getPostHeroImageUrl(post);
  const heroAlt = getPostHeroImageAlt(post);
  const guardian = await getPublicGuardianByIdMerged(post.author_user_id);
  const sheetAvatar = guardian ? guardianProfileImageUrls(guardian).avatar : heroCover;
  const sheetHeadlineRaw = resolveGuardianHeadlineWithPostFallback(guardian?.headline, post.summary);
  const sheetHeadline = clampSheetHeadline(sheetHeadlineRaw);
  const sheetName = guardian?.display_name ?? post.author_display_name;
  const sheetRegion =
    guardian && mockRegions.some((r) => r.slug === guardian.primary_region_slug)
      ? guardian.primary_region_slug
      : mockRegions.some((r) => r.slug === post.region_slug)
        ? post.region_slug
        : null;
  const secondaryCover = getPostSecondaryImageUrl(post);
  const secondaryAlt = getPostSecondaryImageAlt(post);
  const showEnrichedPair = !postHasOwnVisualMedia(post) && secondaryCover;

  const { lead, rest } = splitPostBodyLeadRest(post.body);
  const articleIntro = lead.length > 0 && rest.length > 0;
  const bodyText = articleIntro ? rest : post.body.trim();
  const typeLabelKey = resolvePostTypeLabelKey(post);

  return (
    <article className="bg-[var(--bg-page)] pb-16">
      <GuardianRequestDefaultsPublisher
        guardianUserId={post.author_user_id}
        displayName={sheetName}
        headline={sheetHeadline}
        avatarUrl={sheetAvatar}
        suggestedRegionSlug={sheetRegion}
      />
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <Link
          href="/posts"
          className="group/back text-muted-foreground hover:text-foreground mb-4 -ml-2 inline-flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium transition-all duration-200 hover:border-border/70 hover:gap-2"
        >
          <ArrowLeft className="size-4 shrink-0 transition-transform duration-200 group-hover/back:-translate-x-0.5" aria-hidden />
          {t("backToList")}
        </Link>
      </div>

      <PostDetailHero post={post} coverUrl={heroCover} coverAlt={heroAlt} typeLabelKey={typeLabelKey} />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-12">
        <div className="max-w-none space-y-8 lg:col-span-8">
          {articleIntro ? <PostDetailIntroPanel variant="article" primary={lead} /> : null}

          {bodyText ? (
            <div className="text-foreground space-y-4 text-[15px] leading-relaxed sm:text-base">
              {bodyText.split("\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : null}

          {showEnrichedPair ? (
            <figure className="border-border/60 relative aspect-[16/10] overflow-hidden rounded-xl border sm:aspect-[21/9]">
              <Image
                src={secondaryCover!}
                alt={secondaryAlt ?? heroAlt}
                fill
                className={FILL_IMAGE_COVER_CENTER}
                sizes="(max-width:1024px) 100vw, 66vw"
              />
            </figure>
          ) : null}

          {guardian ? (
            <PostGuardianAttributionRow variant="article" displayName={sheetName} avatarUrl={sheetAvatar} />
          ) : null}
        </div>

        <PostDetailStickyAside id="post-author-aside">
          <SaveTravelerPostButton postId={post.id} />
          <PostAuthorAside post={post} />
        </PostDetailStickyAside>
      </div>

      {related.length > 0 ? (
        <section className="border-border/50 border-t bg-card/90">
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
