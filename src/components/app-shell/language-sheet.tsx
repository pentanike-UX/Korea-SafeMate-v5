"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function LanguageSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations("V4.workspace.languageSheet");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[24px] px-5 pb-8 shadow-[0_-24px_64px_rgba(15,23,42,0.12)]">
        <SheetHeader className="px-0 text-left">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{t("lead")}</p>
        <div className="mt-6 flex justify-center">
          <LanguageSwitcher className="scale-110" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
