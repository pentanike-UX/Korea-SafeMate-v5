"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPostHeroImageUrl } from "@/lib/content-post-route";
import type { ContentPost } from "@/types/domain";

export function MypagePostPreviewSheetTrigger({
  post,
  triggerLabel,
  triggerVariant = "outline",
}: {
  post: ContentPost;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost" | "default";
}) {
  const t = useTranslations("TravelerHub");
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "bottom">("bottom");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setSide(mq.matches ? "right" : "bottom");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant={triggerVariant} className="rounded-xl" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <SheetContent side={side} className={side === "right" ? "sm:max-w-md" : "max-h-[86vh] rounded-t-2xl"}>
        <SheetHeader>
          <SheetTitle>{post.title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="border-border/60 relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getPostHeroImageUrl(post)} alt="" className="size-full object-cover" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{post.region_slug}</Badge>
            <Badge variant="outline">{post.category_slug}</Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">{post.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="rounded-xl">
              <Link href={`/posts/${post.id}`} onClick={() => setOpen(false)}>
                {t("readPost")}
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
