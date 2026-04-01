import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { CuratedRoute } from "@/domain/curated-experience";
import { cn } from "@/lib/utils";
import { Clock, Footprints, Shield } from "lucide-react";

export function V4RouteCard({
  route,
  className,
  saveHref,
}: {
  route: CuratedRoute;
  className?: string;
  /** If set, secondary action navigates (e.g. login-gated save) */
  saveHref?: string;
}) {
  const durationH = Math.floor(route.durationMinutes / 60);
  const durationM = route.durationMinutes % 60;
  const timeLabel = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM}m`;

  return (
    <article
      className={cn(
        "bg-card group ring-border/60 relative flex flex-col overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] ring-1 transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[var(--shadow-md)] md:hover:-translate-y-0.5",
        className,
      )}
    >
      <Link href={`/explore/routes/${route.slug}`} className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={route.heroImage}
            alt=""
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            sizes="(max-width:768px) 100vw, 33vw"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            {route.vibeTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-strong)] backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="text-[var(--text-strong)] text-lg font-semibold leading-snug tracking-tight">{route.title}</h3>
          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">{route.subtitle}</p>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 opacity-70" strokeWidth={1.75} aria-hidden />
              {timeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Footprints className="size-3.5 opacity-70" strokeWidth={1.75} aria-hidden />
              {route.transportMode.join(" · ")}
            </span>
            {route.confidence != null ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--brand-trust-blue)]">
                <Shield className="size-3.5" strokeWidth={1.75} aria-hidden />
                {Math.round(route.confidence * 100)}%
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-3 line-clamp-2 text-xs leading-relaxed">
            <span className="text-[var(--text-strong)]/80 font-medium">Best for · </span>
            {route.bestFor.join(", ")}
          </p>
        </div>
      </Link>
      {saveHref ? (
        <div className="border-border/50 flex border-t px-5 py-3 sm:px-6">
          <Link
            href={saveHref}
            className="text-[var(--brand-trust-blue)] hover:text-[var(--brand-trust-blue-hover)] text-sm font-semibold"
          >
            Save route
          </Link>
        </div>
      ) : null}
    </article>
  );
}
