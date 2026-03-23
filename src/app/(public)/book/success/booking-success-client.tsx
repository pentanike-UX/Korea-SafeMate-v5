"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { BookingRequestPayload } from "@/types/domain";
import { mockServiceTypes } from "@/data/mock";
import { CONTACT_CHANNEL_LABELS } from "@/lib/constants";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

type Stored = { id: string; payload: BookingRequestPayload; saved: boolean };

export function BookingSuccessClient() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [stored, setStored] = useState<Stored | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ksm_booking_success");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Stored;
      if (parsed?.payload && parsed?.id) setStored(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const id = stored?.id ?? idParam ?? "—";
  const payload = stored?.payload;
  const svc = payload ? mockServiceTypes.find((s) => s.code === payload.service_code) : null;
  const ch = payload?.preferred_contact_channel;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-2xl">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Request submitted</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
          Thank you. Our team will review your context and availability. You are{" "}
          <span className="text-foreground font-medium">not</span> connected to a Guardian or external chat
          yet — we will email you at <span className="text-foreground">{payload?.guest_email ?? "your address"}</span>{" "}
          with next steps when matching is ready.
        </p>
        <p className="text-muted-foreground mt-3 text-xs">
          Reference: <span className="text-foreground font-mono">{id}</span>
          {stored && !stored.saved ? (
            <span className="block text-amber-700 dark:text-amber-400">
              (MVP: not saved to database — configure Supabase for persistence.)
            </span>
          ) : null}
        </p>
      </div>

      {payload ? (
        <div className="space-y-6">
          <BookingSummaryCard payload={payload} />
          {svc ? (
            <p className="text-muted-foreground text-center text-xs">
              Service: <span className="text-foreground font-medium">{svc.name}</span>
              {ch ? (
                <>
                  {" "}
                  · Handoff:{" "}
                  <span className="text-foreground font-medium">
                    {CONTACT_CHANNEL_LABELS[ch as keyof typeof CONTACT_CHANNEL_LABELS] ?? ch}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : (
        <Card className="border-primary/15">
          <CardHeader>
            <CardTitle className="text-base">Summary unavailable</CardTitle>
            <CardDescription>
              Open this page from the same browser session right after submitting, or keep your reference ID
              for support.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            If you refreshed or opened in another device, details are not stored client-side.
            {/* TODO(prod): Server-rendered success from booking id + auth. */}
          </CardContent>
        </Card>
      )}

      <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="rounded-xl">
          <Link href="/explore">Explore local intel</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/services">Services</Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-xl">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
