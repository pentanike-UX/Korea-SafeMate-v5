import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import { getPublicGuardianById } from "@/lib/guardian-public";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadgesServer } from "@/components/forty-two/trust-badges-server";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import { GUARDIAN_TIER_ROLE_BADGE_CLASSNAME, guardianTierBadgeVariant } from "@/lib/guardian-tier-ui";
import { cn } from "@/lib/utils";
import { POST_SAMPLE_BADGE_CLASS } from "@/components/posts/post-sample-constants";

export async function PostAuthorAside({ post }: { post: ContentPost }) {
  const t = await getTranslations("Posts");
  const tTier = await getTranslations("GuardianTier");
  const guardian = getPublicGuardianById(post.author_user_id);
  const imgs = guardian ? guardianProfileImageUrls(guardian) : null;

  return (
    <aside className="contents">
      <Card className="border-border/60 overflow-hidden rounded-2xl py-0 shadow-[var(--shadow-sm)]">
        <div className="relative aspect-[16/10]">
          {guardian && imgs ? (
            <Image src={imgs.landscape} alt="" fill className="object-cover object-center" sizes="400px" />
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
              <span className={POST_SAMPLE_BADGE_CLASS} title={t("sampleBadgeAria")}>
                {t("sampleBadge")}
              </span>
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
              <Button asChild className="w-full rounded-xl">
                <Link href={`/guardians/${guardian.user_id}`}>{t("viewGuardian")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href={`/book?guardian=${guardian.user_id}`}>{t("requestWithGuardian")}</Link>
              </Button>
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
