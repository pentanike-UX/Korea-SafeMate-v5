import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Post detail right column: sticky from tablet/desktop so guardian + trust note stay in view.
 * `top` clears the site header (`h-14` / `sm:h-16`) with a small gap.
 */
export function PostDetailStickyAside({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("md:sticky md:top-20 md:z-0 md:self-start", "lg:col-span-4", className)}
    >
      <div className="space-y-5">{children}</div>
    </div>
  );
}
