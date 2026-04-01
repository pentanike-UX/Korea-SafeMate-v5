"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const DEFAULT_POLICY = `Prioritize ordered sequences over POI dumps.
Always output: rationale, timing tips, cautions, alternative route.
Bias toward wide paths when safetySensitivity is high.
Respect weatherSensitive with indoor-heavy middle segments.`;

export function AdminPromptPolicyClient() {
  const [value, setValue] = useState(DEFAULT_POLICY);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <textarea
        value={value}
        onChange={(e) => {
          setSaved(false);
          setValue(e.target.value);
        }}
        rows={12}
        className="border-input bg-background w-full rounded-xl border p-4 font-mono text-sm"
      />
      <Button
        type="button"
        onClick={() => setSaved(true)}
        className="rounded-[var(--radius-lg)]"
      >
        Save draft
      </Button>
      {saved ? <p className="text-muted-foreground text-sm">Saved locally in this session (MVP).</p> : null}
    </div>
  );
}
