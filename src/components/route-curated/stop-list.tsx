"use client";

import type { PathSegment, RouteStop } from "@/domain/curated-experience";
import { StopCard } from "@/components/route-curated/stop-card";

export function StopList({
  stops,
  pathSegments,
  spotNames,
  activeStopId,
  onSelect,
  emptyMessage,
}: {
  stops: RouteStop[];
  pathSegments: PathSegment[];
  spotNames: Record<string, string>;
  activeStopId: string | null;
  onSelect: (stopId: string) => void;
  emptyMessage?: string;
}) {
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  if (!sorted.length) {
    return <p className="text-muted-foreground text-sm">{emptyMessage ?? "No stops."}</p>;
  }

  return (
    <ul className="space-y-3">
      {sorted.map((rs) => {
        const seg =
          rs.order <= 1 ? pathSegments[0] : pathSegments.find((s) => s.toStopId === rs.id) ?? pathSegments[rs.order - 2];
        const segmentMeta = seg
          ? { distanceM: seg.distanceMeters, walkMin: seg.durationMinutes }
          : null;
        return (
          <li key={rs.id} data-stop-id={rs.id}>
            <StopCard
              order={rs.order}
              title={spotNames[rs.spotId] ?? "Stop"}
              whyHere={rs.whyHere}
              stayMinutes={rs.stayMinutes}
              transitionHint={rs.transitionHint}
              active={activeStopId === rs.id}
              onSelect={() => onSelect(rs.id)}
              segmentMeta={segmentMeta}
            />
          </li>
        );
      })}
    </ul>
  );
}
