"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimingInfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2 text-sm", className)}>
      <Timer className="text-[var(--brand-trust-blue)] mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <p className="text-foreground mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}
