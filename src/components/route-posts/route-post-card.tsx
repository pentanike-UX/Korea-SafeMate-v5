"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import { getContentPostFormat, postCoverImageUrl } from "@/lib/content-post-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

export function RoutePostCard({ post, regionLabel, className }: { post: ContentPost; regionLabel: string; className?: string }) {
  const t = useTranslations("RoutePosts");
  const tPosts = useTranslations("Posts");
  const journey = post.route_journey!;
  const meta = journey.metadata;
  const format = getContentPostFormat(post);
  const cover = postCoverImageUrl(post);

  const formatLabel =
    format === "hybrid"
      ? t("formatHybrid")
      : format === "route"
        ? t("formatRoute")
        : format === "spot"
          ? t("formatSpot")
          : t("formatArticle");

  const showRouteIncludedBadge = format === "hybrid" || format === "route";
  const transportLabel = t(`transport.${meta.transport_mode}` as "transport.walk");

  return (
    <div
      className={cn(
        "border-border/70 bg-card flex h-full flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <Link href={`/posts/${post.id}`} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="bg-muted absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1b3d]/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
            <Badge className="rounded-full bg-white/95 text-[10px] font-bold text-[var(--brand-primary)] shadow-sm">{formatLabel}</Badge>
            {showRouteIncludedBadge ? (
              <Badge variant="secondary" className="rounded-full border-0 bg-black/55 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                {t("cardBadgeRouteIncluded")}
              </Badge>
            ) : null}
            {post.featured ? (
              <Badge className="rounded-full bg-white/95 text-[10px] font-semibold text-foreground shadow-sm">{tPosts("featured")}</Badge>
            ) : null}
          </div>
          <div className="absolute right-3 bottom-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
              <MapPin className="size-3.5 shrink-0 opacity-95" aria-hidden />
              {t("cardRoutePill")}
            </span>
          </div>
        </div>
        <div className="p-5 pb-2">
          <p className="text-primary text-[10px] font-bold tracking-widest uppercase">{post.tags.slice(0, 3).join(" · ")}</p>
          <h2 className="text-foreground mt-2 line-clamp-2 font-semibold leading-snug group-hover:text-primary">{post.title}</h2>
          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{post.summary}</p>
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <p className="text-muted-foreground text-xs leading-relaxed">
          <span className="text-foreground font-medium">{t("cardSpots", { count: journey.spots.length })}</span>
          <span aria-hidden> · </span>
          <span>{t("chipDistance", { km: meta.estimated_total_distance_km.toFixed(1) })}</span>
          <span aria-hidden> · </span>
          <span>{transportLabel}</span>
        </p>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span>{post.author_display_name}</span>
          <span aria-hidden>·</span>
          <span className="capitalize">{regionLabel}</span>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button asChild size="sm" className="flex-1 rounded-xl">
            <Link href={`/posts/${post.id}`}>{t("ctaViewRoute")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl">
            <Link href={`/guardians/${post.author_user_id}`}>{t("ctaChooseGuardian")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
