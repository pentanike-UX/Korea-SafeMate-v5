"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type RouteHit = { slug: string; title: string; subtitle: string };
type SpotHit = { slug: string; name: string; district: string };

export function SearchV4Client({ routes, spots }: { routes: RouteHit[]; spots: SpotHit[] }) {
  const t = useTranslations("V4.search");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { routes: routes.slice(0, 6), spots: spots.slice(0, 6) };
    return {
      routes: routes.filter(
        (r) => r.title.toLowerCase().includes(needle) || r.subtitle.toLowerCase().includes(needle) || r.slug.includes(needle),
      ),
      spots: spots.filter(
        (s) => s.name.toLowerCase().includes(needle) || s.district.toLowerCase().includes(needle) || s.slug.includes(needle),
      ),
    };
  }, [q, routes, spots]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[var(--text-strong)] text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
      <label className="mt-6 block">
        <span className="sr-only">{t("label")}</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          className="border-input bg-card text-foreground placeholder:text-muted-foreground w-full rounded-[var(--radius-card)] border px-4 py-3.5 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        />
      </label>

      <section className="mt-10">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{t("routes")}</h2>
        <ul className="mt-3 space-y-2">
          {filtered.routes.length === 0 ? (
            <li className="text-muted-foreground text-sm">{t("empty")}</li>
          ) : (
            filtered.routes.map((r) => (
              <li key={r.slug}>
                <Link href={`/explore/routes/${r.slug}`} className="text-[var(--brand-trust-blue)] block rounded-lg py-1 text-sm font-medium hover:underline">
                  {r.title}
                </Link>
                <p className="text-muted-foreground text-xs">{r.subtitle}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{t("spots")}</h2>
        <ul className="mt-3 space-y-2">
          {filtered.spots.length === 0 ? (
            <li className="text-muted-foreground text-sm">{t("empty")}</li>
          ) : (
            filtered.spots.map((s) => (
              <li key={s.slug}>
                <Link href={`/explore/spots/${s.slug}`} className="text-[var(--brand-trust-blue)] block rounded-lg py-1 text-sm font-medium hover:underline">
                  {s.name}
                </Link>
                <p className="text-muted-foreground text-xs">{s.district}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
