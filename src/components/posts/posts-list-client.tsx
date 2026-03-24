"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContentCategory } from "@/types/domain";
import type { ContentPost } from "@/types/domain";
import { postCoverImageUrl, postHasRouteJourney } from "@/lib/content-post-route";
import { RoutePostCard } from "@/components/route-posts/route-post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Heart, Search, Sparkles } from "lucide-react";

const REGION_SLUGS = ["all", "seoul", "busan", "jeju"] as const;
type RegionFilter = (typeof REGION_SLUGS)[number];

const SORTS = ["recommended", "popular", "latest"] as const;
type SortMode = (typeof SORTS)[number];

const CONTENT_FILTERS = ["all", "article", "route"] as const;
type ContentFilter = (typeof CONTENT_FILTERS)[number];

function postVisualSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 360;
  return `linear-gradient(135deg, hsl(${h} 65% 88%) 0%, hsl(${(h + 40) % 360} 55% 78%) 100%)`;
}

export function PostsListClient({
  posts,
  categories,
}: {
  posts: ContentPost[];
  categories: ContentCategory[];
}) {
  const t = useTranslations("Posts");
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");

  useEffect(() => {
    const c = searchParams.get("content");
    if (c === "route") setContentFilter("route");
    else if (c === "article") setContentFilter("article");
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = [...posts];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.summary.toLowerCase().includes(s) ||
          p.tags.some((tag) => tag.toLowerCase().includes(s)),
      );
    }
    if (category !== "all") {
      list = list.filter((p) => p.category_slug === category);
    }
    if (region !== "all") {
      list = list.filter((p) => p.region_slug === region);
    }
    if (contentFilter === "article") {
      list = list.filter((p) => !postHasRouteJourney(p));
    } else if (contentFilter === "route") {
      list = list.filter((p) => postHasRouteJourney(p));
    }
    if (sort === "popular") {
      list.sort((a, b) => b.popular_score - a.popular_score);
    } else if (sort === "latest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      list.sort((a, b) => b.recommended_score - a.recommended_score);
    }
    return list;
  }, [posts, q, category, region, sort, contentFilter]);

  return (
    <div className="bg-[var(--bg-page)] min-h-screen">
      <section className="relative overflow-hidden border-b border-border/60 bg-white">
        <div className="absolute inset-0 bg-hero-42 opacity-95" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
          <p className="text-primary inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            42 Guardians
          </p>
          <h1 className="text-text-strong mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed sm:text-base">{t("heroBody")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="border-border/60 bg-card mb-8 space-y-4 rounded-2xl border p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("filterCategory")}</p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={category === "all" ? "default" : "outline"}
                  className="rounded-full text-xs"
                  onClick={() => setCategory("all")}
                >
                  {t("all")}
                </Button>
                {categories.map((c) => (
                  <Button
                    key={c.slug}
                    type="button"
                    size="sm"
                    variant={category === c.slug ? "default" : "outline"}
                    className="rounded-full text-xs"
                    onClick={() => setCategory(c.slug)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("filterRegion")}</p>
              <div className="flex flex-wrap gap-1.5">
                {REGION_SLUGS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={region === r ? "default" : "outline"}
                    className="rounded-full text-xs capitalize"
                    onClick={() => setRegion(r)}
                  >
                    {r === "all" ? t("all") : t(`region.${r}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("sort")}</p>
              <div className="flex flex-wrap gap-1.5">
                {SORTS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={sort === m ? "default" : "outline"}
                    className="rounded-full text-xs"
                    onClick={() => setSort(m)}
                  >
                    {t(`sort${m.charAt(0).toUpperCase() + m.slice(1)}` as "sortRecommended")}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2 lg:min-w-[200px]">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("filterContent")}</p>
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_FILTERS.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={contentFilter === f ? "default" : "outline"}
                    className="rounded-full text-xs"
                    onClick={() => setContentFilter(f)}
                  >
                    {t(`content${f.charAt(0).toUpperCase() + f.slice(1)}` as "contentAll")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">{t("empty")}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const coverUrl = postCoverImageUrl(p);
              return (
              <li key={p.id}>
                {postHasRouteJourney(p) ? (
                  <RoutePostCard post={p} regionLabel={t(`region.${p.region_slug}` as "region.seoul")} />
                ) : (
                  <Link
                    href={`/posts/${p.id}`}
                    className="border-border/70 bg-card group flex h-full flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          sizes="(max-width:768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 z-0" style={{ background: postVisualSeed(p.id) }} />
                      )}
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0e1b3d]/45 to-transparent" />
                      {p.featured ? (
                        <div className="absolute top-3 left-3 z-10">
                          <Badge className="rounded-full bg-white/95 text-[10px] font-semibold text-[var(--brand-primary)] shadow-sm">
                            {t("featured")}
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-primary text-[10px] font-bold tracking-widest uppercase">
                        {p.tags.slice(0, 3).join(" · ")}
                      </p>
                      <h2 className="text-foreground mt-2 line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                        {p.title}
                      </h2>
                      <p className="text-muted-foreground mt-2 line-clamp-2 flex-1 text-sm">{p.summary}</p>
                      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span>{p.author_display_name}</span>
                        <span aria-hidden>·</span>
                        <span className="capitalize">{t(`region.${p.region_slug}` as "region.seoul")}</span>
                        {p.helpful_rating != null ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Heart className="size-3.5 fill-rose-400/80 text-rose-400/80" aria-hidden />
                              {p.helpful_rating.toFixed(1)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                )}
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
