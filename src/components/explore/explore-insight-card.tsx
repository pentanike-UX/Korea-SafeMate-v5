"use client";

import Link from "next/link";
import type { ExploreInsight } from "@/lib/explore-utils";
import { guardianTierBadgeVariant, guardianTierLabel } from "@/lib/guardian-tier-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Bookmark, Share2, Star, ThumbsUp } from "lucide-react";

type Props = {
  insight: ExploreInsight;
  /** When false, hide duplicate region line (e.g. on region hub pages). */
  showRegion?: boolean;
};

export function ExploreInsightCard({ insight, showRegion = true }: Props) {
  const { post, regionName, categoryName, authorTier, authorAvgRating, authorPosts30d, hasGuardianProfile } =
    insight;

  return (
    <Card className="border-primary/10 flex h-full flex-col overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-medium">
            {categoryName}
          </Badge>
          {post.featured ? (
            <Badge variant="secondary" className="text-[10px]">
              Featured pick
            </Badge>
          ) : null}
          {post.status !== "approved" ? (
            <Badge variant="destructive" className="text-[10px] capitalize">
              {post.status}
            </Badge>
          ) : null}
        </div>
        <div>
          <h3 className="text-foreground text-base leading-snug font-semibold tracking-tight">
            {post.title}
          </h3>
          {showRegion ? (
            <p className="text-muted-foreground mt-1 text-xs">{regionName}</p>
          ) : null}
        </div>
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{post.summary}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pb-2">
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground text-sm font-medium">{post.author_display_name}</span>
              {hasGuardianProfile && authorTier ? (
                <Badge variant={guardianTierBadgeVariant(authorTier)} className="text-[10px]">
                  {guardianTierLabel(authorTier)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Contributor
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-3 text-[11px]">
              {authorPosts30d != null ? <span>{authorPosts30d} approved / 30d</span> : null}
              {authorAvgRating != null ? (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="text-primary size-3 fill-current" aria-hidden />
                  {authorAvgRating.toFixed(1)} traveler avg
                </span>
              ) : null}
            </div>
            {insight.authorExpertiseTags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {insight.authorExpertiseTags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="bg-primary/5 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="text-muted-foreground text-[10px]">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
          {post.helpful_rating != null ? (
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3.5" aria-hidden />
              {post.helpful_rating.toFixed(1)} helpful
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="size-3.5 opacity-60" aria-hidden />
            {post.usefulness_votes} found this useful
          </span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-lg"
            disabled
            title="Bookmarks — TODO(prod): Supabase + RLS per user"
          >
            <Bookmark className="size-4" />
            <span className="sr-only">Bookmark</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-lg"
            disabled
            title="Share — TODO(prod): Web Share API + OG URLs"
          >
            <Share2 className="size-4" />
            <span className="sr-only">Share</span>
          </Button>
        </div>
        {hasGuardianProfile ? (
          <Button asChild size="sm" variant="outline" className="rounded-lg">
            <Link href={`/guardians#guardian-${post.author_user_id}`}>Guardian</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-lg" disabled title="Community contributor">
            Contributor
          </Button>
        )}
        <Button asChild size="sm" className="rounded-lg">
          <Link href="/book">Book support</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
