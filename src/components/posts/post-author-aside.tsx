import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ContentPost } from "@/types/domain";
import { getPublicGuardianByIdMerged } from "@/lib/guardian-public-merged.server";
import { getPostHeroImageUrl } from "@/lib/content-post-route";
import { listPostsForGuardianMerged } from "@/lib/posts-public-merged.server";
import { publicGuardianToSheetPreview } from "@/lib/guardian-profile-sheet-preview";
import { GuardianPostsExplorerSheet } from "@/components/guardians/guardian-posts-explorer-sheet";
import { GuardianProfilePreviewSheetTrigger } from "@/components/guardians/guardian-profile-preview-sheet-trigger";
import { PostAuthorRequestCta } from "@/components/posts/post-author-request-cta";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadgesServer } from "@/components/forty-two/trust-badges-server";
import { guardianProfileImageUrls, GUARDIAN_PROFILE_COVER_POSITION_CLASS } from "@/lib/guardian-profile-images";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { cn } from "@/lib/utils";
import { PostSampleBadge } from "@/components/posts/post-sample-badge";

export async function PostAuthorAside({ post }: { post: ContentPost }) {
  const t = await getTranslations("Posts");
  const tReq = await getTranslations("GuardianRequest");
  const tTier = await getTranslations("GuardianTier");
  const guardian = await getPublicGuardianByIdMerged(post.author_user_id);
  const imgs = guardian ? guardianProfileImageUrls(guardian) : null;
  const authorApprovedPosts = guardian ? await listPostsForGuardianMerged(guardian.user_id) : [];
  const postSheetItems = authorApprovedPosts.map((gp) => ({
    id: gp.id,
    title: gp.title,
    summary: gp.summary,
    imageUrl: getPostHeroImageUrl(gp),
  }));
  const repForPreview =
    guardian != null
      ? publicGuardianToSheetPreview(
          guardian,
          authorApprovedPosts.slice(0, 3).map((gp) => ({ id: gp.id, title: gp.title, summary: gp.summary })),
        )
      : null;

  return (
    <aside className="contents">
      <Card className="border-border/60 overflow-hidden rounded-2xl py-0 shadow-[var(--shadow-sm)]">
        <div className="relative aspect-[16/10]">
          {guardian && imgs ? (
            <Image src={imgs.landscape} alt="" fill className={GUARDIAN_PROFILE_COVER_POSITION_CLASS} sizes="400px" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary-soft)] to-[var(--brand-trust-blue-soft)] text-2xl font-bold text-primary/40">
              42
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-5">
          <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">{t("authorCardEyebrow")}</p>
          {post.is_sample ? (
            <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs leading-relaxed">
              <PostSampleBadge />
              <span>{t("sampleAuthorNote")}</span>
            </p>
          ) : null}
          <p className="text-lg font-semibold">{post.author_display_name}</p>
          {guardian ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge
                variant={guardianTierBadgeVariant(guardian.guardian_tier)}
                className={cn(GUARDIAN_TIER_ROLE_BADGE_CLASSNAME)}
              >
                {tTier(guardian.guardian_tier)}
              </Badge>
            </div>
          ) : null}
          {guardian ? (
            <>
              <p className="text-muted-foreground text-sm leading-relaxed">{guardian.headline}</p>
              <TrustBadgesServer ids={guardian.trust_badge_ids} size="xs" />
              {repForPreview ? (
                <GuardianProfilePreviewSheetTrigger
                  guardian={repForPreview}
                  triggerLabel={t("viewGuardian")}
                  triggerVariant="outline"
                  className="w-full"
                  postContext={{ postId: post.id, postTitle: post.title }}
                />
              ) : null}
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs leading-relaxed">
                <li>{tReq("asideBulletHalfFull")}</li>
                <li>{tReq("asideBulletRegion")}</li>
                <li>{tReq("asideBulletTheme")}</li>
                <li>{tReq("asideBulletFlexible")}</li>
              </ul>
              <PostAuthorRequestCta postId={post.id} postTitle={post.title} />
              {postSheetItems.length > 0 ? (
                <GuardianPostsExplorerSheet
                  guardianDisplayName={guardian.display_name}
                  posts={postSheetItems}
                  triggerVariant="asideOutline"
                />
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("authorFallback")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 rounded-2xl border bg-white/90 shadow-[var(--shadow-sm)]">
        <CardContent className="space-y-2 p-5">
          <p className="text-sm font-semibold">{t("trustNoteTitle")}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">{t("trustNoteBody")}</p>
        </CardContent>
      </Card>
    </aside>
  );
}
