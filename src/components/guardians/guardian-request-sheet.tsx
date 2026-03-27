"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { mockRegions } from "@/data/mock";
import {
  buildGuardianIntakePayload,
  type GuardianIntakeFormInput,
  type GuardianRequestKind,
} from "@/lib/guardian-request-intake-payload";
import { LANGUAGE_OPTIONS } from "@/lib/booking-wizard-config";
import type { TravelerUserType } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const GUARDIAN_REQUEST_OPEN_EVENT = "safemate:open-guardian-request";

export type GuardianRequestOpenDetail = {
  postId?: string;
  postTitle?: string;
};

export function GuardianRequestOpenTrigger({
  className,
  variant = "default",
  size = "lg",
  children,
  postContext,
}: {
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  children: ReactNode;
  postContext?: GuardianRequestOpenDetail | null;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent<GuardianRequestOpenDetail>(GUARDIAN_REQUEST_OPEN_EVENT, {
            detail: postContext ?? {},
          }),
        )
      }
    >
      {children}
    </Button>
  );
}

export type GuardianRequestSheetHostProps = {
  guardianUserId: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
  suggestedRegionSlug?: string | null;
};

export function GuardianRequestSheetHost({
  guardianUserId,
  displayName,
  headline,
  avatarUrl,
  suggestedRegionSlug,
}: GuardianRequestSheetHostProps) {
  const t = useTranslations("GuardianRequest");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [postCtx, setPostCtx] = useState<GuardianRequestOpenDetail | null>(null);
  const [side, setSide] = useState<"right" | "bottom">("bottom");

  const [requestKind, setRequestKind] = useState<GuardianRequestKind>("full_day");
  const [regionSlug, setRegionSlug] = useState(() =>
    mockRegions.some((r) => r.slug === (suggestedRegionSlug ?? "")) ? suggestedRegionSlug! : "seoul",
  );
  const [preferredDate, setPreferredDate] = useState("");
  const [mood, setMood] = useState("");
  const [details, setDetails] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [travelerUserType, setTravelerUserType] = useState<TravelerUserType>("foreign_traveler");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [travelerCount, setTravelerCount] = useState(1);
  const [agreeScope, setAgreeScope] = useState(false);
  const [agreeReview, setAgreeReview] = useState(false);
  const [agreeNoChat, setAgreeNoChat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setSide(mq.matches ? "right" : "bottom");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onOpenEvent = useCallback((e: Event) => {
    const ce = e as CustomEvent<GuardianRequestOpenDetail>;
    const d = ce.detail;
    setPostCtx(d?.postId ? { postId: d.postId, postTitle: d.postTitle } : null);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(GUARDIAN_REQUEST_OPEN_EVENT, onOpenEvent);
    return () => window.removeEventListener(GUARDIAN_REQUEST_OPEN_EVENT, onOpenEvent);
  }, [onOpenEvent]);

  const resetForClose = () => {
    setError(null);
    setPostCtx(null);
  };

  const kindLabel = (k: GuardianRequestKind) => {
    if (k === "half_day") return t("kindHalf");
    if (k === "full_day") return t("kindDay");
    if (k === "full_itinerary") return t("kindItinerary");
    return t("kindInquiry");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!guestName.trim() || !guestEmail.trim()) {
      setError(t("errorContact"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setError(t("errorEmail"));
      return;
    }
    if (!agreeScope || !agreeReview || !agreeNoChat) {
      setError(t("errorAgreements"));
      return;
    }
    if (!regionSlug) {
      setError(t("errorRegion"));
      return;
    }

    const input: GuardianIntakeFormInput = {
      requestKind,
      regionSlug,
      preferredDate,
      mood,
      details,
      guestName,
      guestEmail,
      travelerUserType,
      preferredLanguage,
      travelerCount,
      guardianUserId,
      guardianDisplayName: displayName,
      relatedPost:
        postCtx?.postId && postCtx.postTitle ? { id: postCtx.postId, title: postCtx.postTitle } : null,
    };

    const payload = buildGuardianIntakePayload(input, kindLabel(requestKind), {
      scope: agreeScope,
      admin_review: agreeReview,
      no_immediate_chat: agreeNoChat,
    });

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; saved?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? t("errorSubmit"));
      const id = data.id ?? "unknown";
      try {
        sessionStorage.setItem(
          "ksm_booking_success",
          JSON.stringify({ id, payload, saved: Boolean(data.saved) }),
        );
      } catch {
        /* ignore */
      }
      setOpen(false);
      resetForClose();
      router.push(`/book/success?id=${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  const kinds: GuardianRequestKind[] = ["half_day", "full_day", "full_itinerary", "inquiry"];

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForClose();
      }}
    >
      <SheetContent
        side={side}
        className={cn(
          "flex w-full flex-col gap-0 overflow-hidden p-0",
          side === "right" ? "sm:max-w-lg" : "max-h-[92vh] rounded-t-2xl",
        )}
      >
        <SheetHeader className="border-border/60 shrink-0 space-y-3 border-b px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="border-border/50 relative size-14 shrink-0 overflow-hidden rounded-xl border bg-muted">
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="56px" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <SheetTitle className="text-left text-base leading-snug sm:text-lg">{displayName}</SheetTitle>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">{headline}</p>
            </div>
          </div>
          {postCtx?.postTitle ? (
            <p className="bg-primary/6 text-foreground rounded-lg px-3 py-2 text-xs leading-relaxed">
              <span className="text-primary font-semibold">{t("postContextPrefix")}</span> {postCtx.postTitle}
            </p>
          ) : null}
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <div>
              <p className="text-foreground text-sm font-semibold">{t("fieldRequestKind")}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {kinds.map((k) => (
                  <label
                    key={k}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                      requestKind === k ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/80 hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="requestKind"
                      className="accent-primary"
                      checked={requestKind === k}
                      onChange={() => setRequestKind(k)}
                    />
                    <span>{kindLabel(k)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gr-region">{t("fieldRegion")}</Label>
              <Select value={regionSlug} onValueChange={(v) => v && setRegionSlug(v)}>
                <SelectTrigger id="gr-region" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockRegions.map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>
                      {r.name_ko ? `${r.name_ko} · ${r.name}` : r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gr-date">{t("fieldDate")}</Label>
              <Input
                id="gr-date"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-muted-foreground text-xs leading-relaxed">{t("helperDate")}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gr-mood">{t("fieldMood")}</Label>
              <Input
                id="gr-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder={t("moodPlaceholder")}
                className="rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gr-details">{t("fieldDetails")}</Label>
              <Textarea
                id="gr-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder={t("detailsPlaceholder")}
                className="rounded-xl"
              />
              <p className="text-muted-foreground text-xs leading-relaxed">{t("helperDetails")}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("fieldUserType")}</Label>
                <Select
                  value={travelerUserType}
                  onValueChange={(v) => v && setTravelerUserType(v as TravelerUserType)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foreign_traveler">{t("userTypeForeign")}</SelectItem>
                    <SelectItem value="korean_traveler">{t("userTypeKorean")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gr-count">{t("fieldPartySize")}</Label>
                <Input
                  id="gr-count"
                  type="number"
                  min={1}
                  max={8}
                  value={travelerCount}
                  onChange={(e) => setTravelerCount(Number(e.target.value) || 1)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("fieldLanguage")}</Label>
              <Select value={preferredLanguage} onValueChange={(v) => v && setPreferredLanguage(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="gr-name">{t("fieldName")}</Label>
                <Input
                  id="gr-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoComplete="name"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gr-email">{t("fieldEmail")}</Label>
                <Input
                  id="gr-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  autoComplete="email"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="border-border/60 space-y-2 rounded-xl border bg-muted/30 p-3 text-sm">
              <label className="flex cursor-pointer gap-2">
                <input type="checkbox" checked={agreeScope} onChange={(e) => setAgreeScope(e.target.checked)} className="mt-0.5 accent-primary" />
                <span>{t("agreeScope")}</span>
              </label>
              <label className="flex cursor-pointer gap-2">
                <input type="checkbox" checked={agreeReview} onChange={(e) => setAgreeReview(e.target.checked)} className="mt-0.5 accent-primary" />
                <span>{t("agreeReview")}</span>
              </label>
              <label className="flex cursor-pointer gap-2">
                <input type="checkbox" checked={agreeNoChat} onChange={(e) => setAgreeNoChat(e.target.checked)} className="mt-0.5 accent-primary" />
                <span>{t("agreeNoChat")}</span>
              </label>
            </div>

            {error ? (
              <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-border/60 shrink-0 space-y-2 border-t bg-background px-5 py-4 sm:px-6">
            <Button type="submit" disabled={submitting} className="h-12 w-full rounded-2xl text-base font-semibold">
              {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : t("submit")}
            </Button>
            <p className="text-muted-foreground text-center text-[11px] leading-relaxed">{t("footerNote")}</p>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
