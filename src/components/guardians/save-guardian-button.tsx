"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Bookmark, Heart, Loader2 } from "lucide-react";

export function SaveGuardianButton({ guardianUserId }: { guardianUserId: string }) {
  const t = useTranslations("GuardiansDiscover");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setHint(null);
    try {
      const res = await fetch("/api/traveler/saved-guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardian_user_id: guardianUserId, action: "toggle" }),
      });
      const data = (await res.json()) as { ids?: string[]; saved?: boolean; error?: string };
      if (!res.ok) {
        setHint(data.error ?? t("saveError"));
        return;
      }
      setHint(data.saved ? t("saveAdded") : t("saveRemoved"));
    } catch {
      setHint(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-[var(--radius-md)]"
        disabled={loading}
        onClick={() => void toggle()}
      >
        {loading ? (
          <Loader2 className="size-[1.125rem] animate-spin" aria-hidden />
        ) : (
          <Heart className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
        )}
        <span>{t("cardSave")}</span>
      </Button>
      <Button asChild variant="ghost" size="sm" className="text-[var(--link-color)] h-auto min-h-10 w-full text-sm font-semibold">
        <Link href="/traveler/saved-guardians" className="inline-flex items-center justify-center gap-2">
          <Bookmark className="size-4 shrink-0 opacity-90" aria-hidden />
          {t("saveViewList")}
        </Link>
      </Button>
      {hint ? <p className="text-muted-foreground text-center text-xs leading-snug">{hint}</p> : null}
    </div>
  );
}
