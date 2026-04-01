"use client";

import { cn } from "@/lib/utils";

/** DOM element for a numbered route stop pin (MapLibre Marker). */
export function createRouteStopMarkerElement(opts: {
  order: number;
  title: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { order, title, selected, onSelect } = opts;
  const el = document.createElement("button");
  el.type = "button";
  el.className = cn(
    "route-curated-pin flex size-9 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
    selected
      ? "border-[var(--bg-surface)] z-10 scale-110 bg-[hsl(220_55%_36%)] text-white"
      : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-strong)] opacity-90 hover:opacity-100",
  );
  el.textContent = String(order);
  el.title = title;
  el.setAttribute("aria-label", `Stop ${order}: ${title}`);
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    onSelect();
  });
  return el;
}
