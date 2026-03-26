"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveGuardianDisplayName } from "@/data/mock/guardian-seed-display-names";
import { GUARDIAN_SEED_ROWS } from "@/data/mock/guardians-seed";
import { loginAsMockGuardian } from "@/lib/dev/login-as-mock-guardian";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tierBadgeClass: Record<string, string> = {
  Starter: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
  Active: "border-[var(--brand-trust-blue)]/35 bg-[var(--brand-trust-blue-soft)]/50 text-[var(--brand-trust-blue)]",
  Pro: "border-primary/30 bg-primary/10 text-primary",
  Elite: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
};

export function MockGuardianQuickLogin({ className }: { className?: string }) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onPick = async (guardianId: string) => {
    setPendingId(guardianId);
    try {
      const sb = createSupabaseBrowserClient();
      await sb?.auth.signOut();
      const result = await loginAsMockGuardian(guardianId);
      if (!result.ok) {
        setPendingId(null);
        return;
      }
      window.location.assign(`/${locale}/mypage`);
    } catch {
      setPendingId(null);
    }
  };

  return (
    <section
      className={cn(
        "border-border/60 bg-muted/20 mt-8 rounded-[var(--radius-md)] border border-dashed px-4 py-4 sm:px-5",
        className,
      )}
      aria-label={t("devMockGuardianTitle")}
    >
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{t("devMockGuardianEyebrow")}</p>
      <h2 className="text-muted-foreground mt-1 text-sm font-medium">{t("devMockGuardianTitle")}</h2>
      <p className="text-muted-foreground/90 mt-2 text-xs leading-relaxed">{t("devMockGuardianHint")}</p>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {GUARDIAN_SEED_ROWS.map((row) => {
          const busy = pendingId === row.id;
          const displayName = resolveGuardianDisplayName(row.id, row.display_name);
          return (
            <li key={row.id}>
              <div
                className={cn(
                  "border-border/70 bg-card/40 flex min-h-12 w-full items-center gap-2 rounded-[var(--radius-md)] border px-2 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5",
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onPick(row.id)}
                  className="border-border/70 text-foreground h-9 shrink-0 px-2.5 text-xs font-semibold sm:h-10 sm:px-3"
                >
                  {busy ? "…" : t("devMockGuardianLoginButton")}
                </Button>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 px-2 py-0.5 text-[10px] font-semibold", tierBadgeClass[row.product_tier])}
                >
                  {row.product_tier}
                </Badge>
                <Link
                  href={`/guardians/${row.id}`}
                  title={t("devMockGuardianProfileLinkTitle")}
                  className="text-foreground hover:text-[var(--link-color)] min-w-0 flex-1 truncate text-left text-sm font-medium underline-offset-2 hover:underline"
                >
                  {displayName}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
