"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
          return (
            <li key={row.id}>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void onPick(row.id)}
                className="border-border/70 text-foreground h-auto min-h-12 w-full justify-start gap-2.5 rounded-[var(--radius-md)] px-3 py-3 text-left text-sm font-medium"
              >
                <Badge
                  variant="outline"
                  className={cn("shrink-0 px-2 py-0.5 text-[10px] font-semibold", tierBadgeClass[row.product_tier])}
                >
                  {row.product_tier}
                </Badge>
                <span className="min-w-0 truncate">{row.display_name}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
