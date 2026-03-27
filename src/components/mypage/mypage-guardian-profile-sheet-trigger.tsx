"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { guardianProfileImageUrls, type GuardianImageSource } from "@/lib/guardian-profile-images";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProfilePreview = GuardianImageSource & {
  display_name: string;
  headline?: string | null;
  primary_region_slug?: string | null;
  guardian_tier?: string | null;
};

export function MypageGuardianProfileSheetTrigger({
  guardian,
  triggerLabel,
  triggerVariant = "outline",
  className,
}: {
  guardian: ProfilePreview;
  triggerLabel: string;
  triggerVariant?: "outline" | "ghost" | "default";
  className?: string;
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

  const imgs = guardianProfileImageUrls(guardian);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        className={cn("rounded-xl", className)}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <SheetContent side={side} className={side === "right" ? "sm:max-w-md" : "max-h-[86vh] rounded-t-2xl"}>
        <SheetHeader>
          <SheetTitle>{guardian.display_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="border-border/60 relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgs.landscape} alt="" className="size-full object-cover" />
          </div>
          {guardian.headline ? <p className="text-sm leading-relaxed">{guardian.headline}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            {guardian.primary_region_slug ? <Badge variant="outline">{guardian.primary_region_slug}</Badge> : null}
            {guardian.guardian_tier ? <Badge variant="secondary">{guardian.guardian_tier}</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="rounded-xl">
              <Link href={`/guardians/${guardian.user_id}`} onClick={() => setOpen(false)}>
                {t("openGuardian")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/book?guardian=${guardian.user_id}`} onClick={() => setOpen(false)}>
                {t("request")}
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
