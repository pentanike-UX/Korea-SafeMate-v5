"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CalendarCheck, Users, Star, Newspaper } from "lucide-react";

const groups = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Command center", icon: LayoutDashboard }],
  },
  {
    label: "Booking operations",
    description: "Matching, lifecycle, handoff",
    items: [{ href: "/admin/bookings", label: "Bookings", icon: CalendarCheck }],
  },
  {
    label: "Guardian trust & program",
    description: "Tiers, verification, mutual reviews",
    items: [
      { href: "/admin/guardians", label: "Guardians", icon: Users },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Content quality",
    description: "Moderation & editorial",
    items: [{ href: "/admin/content", label: "Content", icon: Newspaper }],
  },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-foreground/5 text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {label}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-background flex w-full flex-col border-b md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex h-14 items-center gap-3 border-b px-4 md:h-[4.25rem]">
        <span className="bg-foreground text-background flex size-9 items-center justify-center rounded-md text-[11px] font-bold tracking-tight">
          Ops
        </span>
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-semibold tracking-tight">Console</p>
          <p className="text-muted-foreground truncate text-[11px]">{BRAND.name}</p>
        </div>
      </div>

      <nav className="flex flex-row gap-4 overflow-x-auto px-2 py-3 md:flex-1 md:flex-col md:gap-0 md:overflow-y-auto md:px-3 md:py-4">
        {groups.map((group) => (
          <div key={group.label} className="flex min-w-[200px] flex-col gap-1 md:min-w-0 md:pb-5">
            <div className="px-3 pb-1">
              <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                {group.label}
              </p>
              {"description" in group ? (
                <p className="text-muted-foreground/80 mt-0.5 hidden text-[10px] leading-snug md:block">
                  {group.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon }) => {
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <NavLink key={href} href={href} label={label} icon={icon} active={active} />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="text-muted-foreground hidden border-t p-4 text-[11px] leading-relaxed md:block">
        {/* TODO(prod): Supabase auth role check + server middleware for admin routes. */}
        Internal preview · mock data only.
      </div>
    </aside>
  );
}
