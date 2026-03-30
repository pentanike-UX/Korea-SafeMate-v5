"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ContentPost } from "@/types/domain";
import { PostSampleBadge } from "@/components/posts/post-sample-badge";
import { Badge } from "@/components/ui/badge";
import { FILL_IMAGE_COVER_ROUTE_HERO } from "@/lib/ui/fill-image";
import { cn } from "@/lib/utils";
import type { PostTypeLabelKey } from "@/lib/post-detail-type-label";
import { Calendar, Heart, MapPin } from "lucide-react";

function heroGradient(post: Pick<ContentPost, "title" | "kind">) {
  const hue = post.title.length * 17 + post.kind.length * 40;
  return `linear-gradient(145deg, hsl(${hue % 360} 45% 92%) 0%, hsl(${(hue + 50) % 360} 40% 85%) 50%, #fff 100%)`;
}

type HeroPost = Pick<
  ContentPost,
  "title" | "summary" | "kind" | "tags" | "is_sample" | "region_slug" | "helpful_rating" | "created_at"
>;

export function PostDetailHero({
  post,
  coverUrl,
  coverAlt,
  typeLabelKey,
}: {
  post: HeroPost;
  coverUrl: string;
  coverAlt: string;
  typeLabelKey: PostTypeLabelKey;
}) {
  const t = useTranslations("Posts");
  const date = new Date(post.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <div
        className="border-border/60 relative overflow-hidden rounded-[1.75rem] border shadow-[var(--shadow-md)]"
        style={{ background: heroGradient(post) }}
      >
        <div className="relative aspect-[21/10] max-h-[320px] min-h-[200px] overflow-hidden sm:aspect-[3/1]">
          <Image
            src={coverUrl}
            alt={coverAlt}
            fill
            className={cn(FILL_IMAGE_COVER_ROUTE_HERO, "opacity-35 mix-blend-multiply")}
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 space-y-3 p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              {post.is_sample ? <PostSampleBadge /> : null}
              <Badge variant="default" className="rounded-full bg-primary/90 font-semibold text-primary-foreground">
                {t(typeLabelKey)}
              </Badge>
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full font-medium">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-text-strong max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {post.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">{post.summary}</p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" aria-hidden />
                {date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                <span className="capitalize">{t(`region.${post.region_slug}` as "region.seoul")}</span>
              </span>
              {post.helpful_rating != null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="size-4 fill-rose-400/90 text-rose-400/90" aria-hidden />
                  {t("helpfulShort", { rating: post.helpful_rating.toFixed(1) })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
