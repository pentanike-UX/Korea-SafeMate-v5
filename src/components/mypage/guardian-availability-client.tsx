"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function GuardianAvailabilityClient() {
  const t = useTranslations("V4.guardianAvailability");
  const [slots, setSlots] = useState("Weeknights 19:00–22:00 KST\nSat 14:00–18:00 KST");
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <textarea
        value={slots}
        onChange={(e) => {
          setSaved(false);
          setSlots(e.target.value);
        }}
        rows={6}
        className="border-input bg-card w-full rounded-[var(--radius-lg)] border p-4 text-sm"
      />
      <Button type="button" onClick={() => setSaved(true)} className="rounded-[var(--radius-lg)]">
        {t("save")}
      </Button>
      {saved ? <p className="text-muted-foreground text-sm">{t("saved")}</p> : null}
    </div>
  );
}
