"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GuardianApplyForm() {
  const [open, setOpen] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(prod): Persist `guardian_profiles` draft + document uploads to Supabase Storage.
    setOpen(true);
  }

  return (
    <>
      <p className="text-muted-foreground mx-auto mb-6 max-w-xl text-sm leading-relaxed">
        Signing up starts you as a <span className="text-foreground font-medium">Contributor</span>.
        Active Guardian tier requires sustained approved posts; Verified Guardian + matching requires
        separate ops review — never automatic from volume alone.
      </p>
      <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="g-name">Full legal name</Label>
            <Input id="g-name" required placeholder="Official ID name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-display">Public display name</Label>
            <Input id="g-display" required placeholder="How travelers see you" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-email">Email</Label>
          <Input id="g-email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-lang">Languages you can support</Label>
          <Input
            id="g-lang"
            required
            placeholder="e.g. English (fluent), Japanese (conversational), Korean (native)"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-bio">Short bio & experience</Label>
          <Textarea
            id="g-bio"
            rows={5}
            required
            placeholder="Neighborhoods you know well, years in Seoul, boundaries you maintain…"
          />
        </div>
        <label className="text-muted-foreground flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" required className="border-input text-primary mt-1 size-4 rounded" />
          <span>
            I confirm I will not represent medical, legal, or emergency services, and I understand
            Guardians provide practical companion support within defined scope.
          </span>
        </label>
        <Button type="submit" size="lg" className="rounded-xl">
          Submit application
        </Button>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application queued (MVP)</DialogTitle>
            <DialogDescription>
              In production, this would create a pending profile and notify operations for
              background review.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)} className="rounded-xl">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
