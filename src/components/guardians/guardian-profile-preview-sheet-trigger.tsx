"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { guardianProfileImageUrls } from "@/lib/guardian-profile-images";
import type { GuardianProfileSheetPreview } from "@/lib/guardian-profile-sheet-preview";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  GUARDIAN_REQUEST_OPEN_EVENT,
  type GuardianRequestOpenDetail,
} from "@/components/guardians/guardian-request-sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export type { GuardianProfileSheetPreview };

/**
 * Public + mypage: opens guardian preview in sheet; full profile / booking only after explicit choice.
 */
export function GuardianProfilePreviewSheetTrigger({
  guardian,
  triggerLabel,
  triggerVariant = "outline",
  className,
  size = "default",
  postContext,
}: {
  guardian: GuardianProfileSheetPreview;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost" | "default";
  className?: string;
  size?: "default" | "sm" | "lg";
  /** When opened from a post, attach context to the request sheet. */
  postContext?: Pick<GuardianRequestOpenDetail, "postId" | "postTitle"> | null;
}) {
  const t = useTranslations("TravelerHub");
  const tGd = useTranslations("GuardianDetail");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "bottom">("bottom");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setSide(mq.matches ? "right" : "bottom");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const imgs = guardianProfileImageUrls(guardian);
  const isKo = locale === "ko";
  const longBio = guardian.long_bio ? (isKo ? guardian.long_bio.ko : guardian.long_bio.en) : "";
  const languageList = guardian.languages?.map((l) => l.language_code).filter(Boolean) ?? [];
  const repPosts = guardian.representativePosts?.slice(0, 3) ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size={size}
        variant={triggerVariant}
        className={cn("rounded-xl font-semibold", className)}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <SheetContent side={side} className={side === "right" ? "sm:max-w-md" : "max-h-[86vh] rounded-t-2xl"}>
        <SheetHeader>
          <SheetTitle>{guardian.display_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="border-border/60 relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgs.landscape} alt="" className="size-full object-cover" />
          </div>
          <div className="flex items-start gap-3">
            <div className="border-border/60 relative size-12 shrink-0 overflow-hidden rounded-full border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgs.avatar} alt="" className="size-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-semibold">{guardian.display_name}</p>
              {guardian.headline ? <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{guardian.headline}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {guardian.primary_region_slug ? <Badge variant="outline">{guardian.primary_region_slug}</Badge> : null}
            {guardian.guardian_tier ? <Badge variant="secondary">{guardian.guardian_tier}</Badge> : null}
            {languageList.length > 0 ? (
              <Badge variant="outline">
                {t("guardianPreviewLanguages")} {languageList.join(", ")}
              </Badge>
            ) : null}
            {guardian.avg_traveler_rating != null ? (
              <Badge variant="outline" className="inline-flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                {guardian.avg_traveler_rating.toFixed(1)}
                {guardian.review_count_display ? ` (${guardian.review_count_display})` : ""}
              </Badge>
            ) : null}
          </div>
          {longBio ? <p className="text-muted-foreground text-sm leading-relaxed">{longBio.split("\n\n")[0]}</p> : null}
          {guardian.expertise_tags && guardian.expertise_tags.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">{tGd("expertiseTitle")}</p>
              <div className="flex flex-wrap gap-1.5">
                {guardian.expertise_tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {repPosts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase">{t("guardianPreviewRepPosts")}</p>
              <ul className="space-y-1.5">
                {repPosts.map((p) => (
                  <li key={p.id} className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2">
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{p.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Button asChild className="rounded-xl font-semibold">
              <Link href={`/guardians/${guardian.user_id}`} onClick={() => setOpen(false)}>
                {t("openGuardian")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-semibold"
              onClick={() => {
                setOpen(false);
                const detail: GuardianRequestOpenDetail = {
                  guardianUserId: guardian.user_id,
                  displayName: guardian.display_name,
                  headline: guardian.headline ?? "",
                  avatarUrl: imgs.avatar,
                  suggestedRegionSlug: guardian.primary_region_slug ?? null,
                  ...(postContext?.postId ? { postId: postContext.postId, postTitle: postContext.postTitle } : {}),
                };
                window.requestAnimationFrame(() =>
                  window.dispatchEvent(
                    new CustomEvent<GuardianRequestOpenDetail>(GUARDIAN_REQUEST_OPEN_EVENT, { detail }),
                  ),
                );
              }}
            >
              {t("request")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
