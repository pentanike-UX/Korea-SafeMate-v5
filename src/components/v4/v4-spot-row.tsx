import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Spot } from "@/domain/curated-experience";
import { cn } from "@/lib/utils";

export function V4SpotRow({ spot, className }: { spot: Spot; className?: string }) {
  return (
    <Link
      href={`/explore/spots/${spot.slug}`}
      className={cn(
        "bg-card ring-border/60 flex gap-4 overflow-hidden rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-sm)] ring-1 transition-shadow duration-300 hover:shadow-[var(--shadow-md)] sm:gap-5 sm:p-4",
        className,
      )}
    >
      <div className="relative size-[5.5rem] shrink-0 overflow-hidden rounded-[var(--radius-md)] sm:size-28">
        <Image src={spot.images[0] ?? ""} alt="" fill className="object-cover" sizes="112px" />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{spot.district}</p>
        <h3 className="text-[var(--text-strong)] mt-0.5 font-semibold leading-snug">{spot.name}</h3>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">{spot.shortDescription}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {spot.vibeTags.slice(0, 3).map((t) => (
            <span key={t} className="bg-[var(--brand-primary-soft)] text-[var(--text-strong)]/80 rounded-full px-2 py-0.5 text-[11px]">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
