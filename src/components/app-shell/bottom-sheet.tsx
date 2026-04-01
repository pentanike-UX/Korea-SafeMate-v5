"use client";

import { RouteBottomSheet } from "@/components/route-curated/route-bottom-sheet";
import { cn } from "@/lib/utils";

/**
 * Mobile workspace sheet: same snap behavior as route bottom sheet, positioned above the tab bar.
 */
export function BottomSheet({
  children,
  footer,
  initialSnap = "half",
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  initialSnap?: "collapsed" | "half" | "full";
  className?: string;
}) {
  return (
    <RouteBottomSheet
      initialSnap={initialSnap}
      footer={footer}
      className={cn(
        "z-40 lg:hidden",
        "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-t-[24px] border-x border-t shadow-[0_-20px_56px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {children}
    </RouteBottomSheet>
  );
}
