"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { readGuardianPlannerContext, type GuardianPlannerContextPayload } from "@/lib/v4/guardian-planner-context";

function buildPrefillMessage(ctx: GuardianPlannerContextPayload, t: ReturnType<typeof useTranslations<"V4.guardianRequest">>) {
  const lines: string[] = [];
  lines.push(t("prefillRouteLine", { title: ctx.routeTitle, slug: ctx.routeSlug }));
  if (ctx.plan?.outputSummary) lines.push(t("prefillPlanLine", { summary: ctx.plan.outputSummary }));
  if (ctx.variant && ctx.variant !== "primary") lines.push(t("prefillVariantLine", { variant: ctx.variant }));
  lines.push(t("prefillAsk"));
  return lines.join("\n\n");
}

export function GuardianRequestV4Form({ guardianName, guardianSlug }: { guardianName: string; guardianSlug: string }) {
  const t = useTranslations("V4.guardianRequest");
  const searchParams = useSearchParams();
  const routeFromUrl = searchParams.get("route");
  const planFromUrl = searchParams.get("plan");

  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const didPrefill = useRef(false);

  const urlHint = useMemo(() => {
    const parts: string[] = [];
    if (routeFromUrl) parts.push(t("urlRouteHint", { slug: routeFromUrl }));
    if (planFromUrl) parts.push(t("urlPlanHint", { id: planFromUrl }));
    return parts.length ? `${parts.join(" · ")}\n\n` : "";
  }, [routeFromUrl, planFromUrl, t]);

  useEffect(() => {
    if (didPrefill.current) return;
    didPrefill.current = true;
    const ctx = readGuardianPlannerContext();
    let next = "";
    if (ctx && (!routeFromUrl || ctx.routeSlug === routeFromUrl)) {
      next = `${urlHint}${buildPrefillMessage(ctx, t)}`;
    } else if (urlHint) {
      next = `${urlHint}${t("prefillAsk")}`;
    }
    if (next) queueMicrotask(() => setMessage(next));
  }, [routeFromUrl, urlHint, t]);

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
