"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminPublishPanelClient({ routeCount, storyCount }: { routeCount: number; storyCount: number }) {
  const [validated, setValidated] = useState(false);

  return (
    <div className="bg-card space-y-4 rounded-xl border p-6">
      <ul className="text-sm">
        <li>Published routes: {routeCount}</li>
        <li>Published stories: {storyCount}</li>
      </ul>
      <Button type="button" variant="outline" onClick={() => setValidated(true)} className="rounded-lg">
        Run publish validation (mock)
      </Button>
      {validated ? (
        <p className="text-muted-foreground text-sm">Validation passed — no blocking issues in seed dataset.</p>
      ) : null}
    </div>
  );
}
