"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations("V4.workspace.helpSheet");

  const bullets = [t("b1"), t("b2"), t("b3")] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[24px] px-5 pb-8 shadow-[0_-24px_64px_rgba(15,23,42,0.12)]">
        <SheetHeader className="px-0 text-left">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <ul className="text-muted-foreground mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <Button asChild className="mt-6 h-11 w-full rounded-[14px]">
          <Link href="/help" onClick={() => onOpenChange(false)}>
            {t("openHelp")}
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
