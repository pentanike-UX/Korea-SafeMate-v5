"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Snap = "collapsed" | "half" | "full";

const SNAP_PCT: Record<Snap, number> = {
  collapsed: 0.18,
  half: 0.5,
  full: 0.88,
};

export function RouteBottomSheet({
  children,
  footer,
  initialSnap = "half",
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  initialSnap?: Snap;
  className?: string;
}) {
  const [snap, setSnap] = useState<Snap>(initialSnap);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startPct: number; h: number; active: boolean } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const pct = SNAP_PCT[snap];

  const commitSnapFromDelta = useCallback((deltaY: number, startPct: number, height: number) => {
    const deltaPct = deltaY / height;
    const next = Math.max(0.1, Math.min(0.94, startPct - deltaPct));
    const targets = Object.entries(SNAP_PCT) as [Snap, number][];
    let best: Snap = "half";
    let bestD = 1;
    for (const [k, v] of targets) {
      const d = Math.abs(next - v);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    setSnap(best);
  }, []);

  useEffect(() => {
    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d?.active) return;
      commitSnapFromDelta(ev.clientY - d.startY, d.startPct, d.h);
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [commitSnapFromDelta]);

  const onPointerDownHandle = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragRef.current = { startY: e.clientY, startPct: pct, h: window.innerHeight, active: true };
  };

  const onPointerUpHandle = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={sheetRef}
      className={cn(
        "border-border/60 bg-[var(--bg-surface)] fixed right-0 bottom-0 left-0 z-40 flex flex-col rounded-t-[var(--radius-card)] border-x border-t shadow-[var(--shadow-md)] lg:relative lg:z-0 lg:rounded-[var(--radius-card)] lg:border lg:shadow-[var(--shadow-sm)]",
        !dragging && "transition-[height] duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] motion-reduce:transition-none",
        className,
      )}
      style={{
        height: `min(${Math.round(pct * 100)}dvh, calc(100dvh - env(safe-area-inset-bottom)))`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        role="slider"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={18}
        aria-valuemax={88}
        aria-label="Resize sheet"
        className="flex cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
        onPointerDown={onPointerDownHandle}
        onPointerUp={onPointerUpHandle}
      >
        <span className="bg-muted-foreground/40 h-1 w-11 rounded-full" />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 sm:px-5">{children}</div>
        {footer ? (
          <div
            className={cn(
              "border-border/60 bg-[color-mix(in_srgb,var(--bg-surface)_98%,transparent)] shrink-0 border-t px-4 py-3 shadow-[0_-10px_28px_rgba(15,23,42,0.06)] sm:px-5",
              "supports-[backdrop-filter]:backdrop-blur-md",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
