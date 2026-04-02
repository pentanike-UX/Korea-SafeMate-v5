"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function rowClass() {
  return "text-[var(--text-strong)] hover:bg-[var(--brand-primary-soft)] block w-full rounded-[14px] px-4 py-3 text-left text-sm font-medium transition-colors";
}

export function InfoDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations("V4.workspace.infoDrawer");
  const tLogin = useTranslations("Login");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("w-full max-w-sm rounded-l-[24px] p-0 shadow-[0_24px_64px_rgba(15,23,42,0.12)]")}>
        <SheetHeader className="border-border/50 border-b px-5 py-4 text-left">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-4" aria-label={t("navAria")}>
          <Link href="/chat" className={rowClass()} onClick={() => onOpenChange(false)}>
            {tLogin("backToChat")}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
