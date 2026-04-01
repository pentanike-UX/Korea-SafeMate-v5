"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function GuardianRequestV4Form({ guardianName, guardianSlug }: { guardianName: string; guardianSlug: string }) {
  const t = useTranslations("V4.guardianRequest");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  if (done) {
    return (
      <div className="bg-[var(--success-soft)] rounded-[var(--radius-card)] p-8 text-center">
        <h2 className="text-[var(--text-strong)] text-xl font-semibold">{t("successTitle")}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("successLead", { name: guardianName })}</p>
        <Button asChild className="mt-6 rounded-[var(--radius-lg)]">
          <Link href="/mypage/requests">{t("goRequests")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <input type="hidden" name="guardian" value={guardianSlug} />
      <div>
        <label htmlFor="req-date" className="text-[var(--text-strong)] text-sm font-medium">
          {t("fieldDate")}
        </label>
        <input
          id="req-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border-input bg-card mt-2 w-full rounded-[var(--radius-lg)] border px-4 py-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </div>
      <div>
        <label htmlFor="req-msg" className="text-[var(--text-strong)] text-sm font-medium">
          {t("fieldMessage")}
        </label>
        <textarea
          id="req-msg"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          className="border-input bg-card mt-2 w-full resize-y rounded-[var(--radius-lg)] border px-4 py-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </div>
      <Button type="submit" size="lg" className="w-full rounded-[var(--radius-lg)] text-base font-semibold">
        {t("submit")}
      </Button>
    </form>
  );
}
