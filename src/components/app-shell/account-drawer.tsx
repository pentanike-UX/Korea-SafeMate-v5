"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthUser } from "@/hooks/use-auth-user";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function rowClass(secondary?: boolean) {
  return cn(
    "text-[var(--text-strong)] block w-full rounded-[14px] px-4 py-3 text-left text-sm font-medium transition-colors",
    secondary ? "text-muted-foreground hover:bg-[var(--bg-surface-subtle)]" : "hover:bg-[var(--brand-primary-soft)]",
  );
}

export function AccountDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations("V4.workspace.accountDrawer");
  const tHeader = useTranslations("Header");
  const user = useAuthUser();

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    onOpenChange(false);
    window.location.assign("/");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm rounded-l-[24px] p-0 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <SheetHeader className="border-border/50 border-b px-5 py-4 text-left">
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-4" aria-label={t("navAria")}>
          {user ? (
            <>
              <Link href="/mypage" className={rowClass()} onClick={() => onOpenChange(false)}>
                {tHeader("accountMypage")}
              </Link>
              <Link href="/mypage/profile" className={rowClass(true)} onClick={() => onOpenChange(false)}>
                {tHeader("accountProfile")}
              </Link>
              <Link href="/traveler" className={rowClass(true)} onClick={() => onOpenChange(false)}>
                {tHeader("myJourney")}
              </Link>
              <Link href="/guardian" className={rowClass(true)} onClick={() => onOpenChange(false)}>
                {tHeader("accountGuardianHub")}
              </Link>
              <Button variant="outline" className="mt-4 h-11 w-full rounded-[14px]" onClick={() => void signOut()}>
                {tHeader("logOut")}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={rowClass()} onClick={() => onOpenChange(false)}>
                {tHeader("logIn")}
              </Link>
              <Link href="/login?next=/mypage" className={rowClass(true)} onClick={() => onOpenChange(false)}>
                {tHeader("signUp")}
              </Link>
              <Link href="/login/guardian" className={rowClass(true)} onClick={() => onOpenChange(false)}>
                {tHeader("guardianLoginShort")}
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
