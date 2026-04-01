"use client";

import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CompactWorkspaceHeader({ title, className }: { title: string; className?: string }) {
  return (
    <header
      className={cn(
        "border-border/55 bg-[color-mix(in_srgb,var(--bg-surface)_94%,transparent)] fixed top-0 right-0 left-0 z-40 flex h-12 items-center gap-3 border-b px-3 pt-[env(safe-area-inset-top)] shadow-[0_8px_28px_rgba(15,23,42,0.04)] supports-[backdrop-filter]:backdrop-blur-xl lg:hidden",
        className,
      )}
    >
      <Link
        href="/"
        className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-primary)] text-[10px] font-semibold text-[var(--text-on-brand)]"
        aria-label={BRAND.name}
      >
        SM
      </Link>
      <h2 className="text-[var(--text-strong)] min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">{title}</h2>
    </header>
  );
}
