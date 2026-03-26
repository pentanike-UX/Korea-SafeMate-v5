"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContentCategory } from "@/types/domain";
import type { ContentPost } from "@/types/domain";
import { getPostHeroImageAlt, getPostHeroImageUrl, postHasRouteJourney } from "@/lib/content-post-route";
import { PostSampleBadge } from "@/components/posts/post-sample-badge";
import { RoutePostCard } from "@/components/route-posts/route-post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { ArrowDownWideNarrow, FileQuestion, Heart, Layers, MapPin, Search, Sparkles, Tag } from "lucide-react";

const REGION_SLUGS = ["all", "seoul", "busan", "jeju"] as const;
type RegionFilter = (typeof REGION_SLUGS)[number];

const SORTS = ["recommended", "popular", "latest"] as const;
type SortMode = (typeof SORTS)[number];

const CONTENT_FILTERS = ["all", "article", "route"] as const;
type ContentFilter = (typeof CONTENT_FILTERS)[number];

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
      <section className="relative overflow-hidden border-b border-border/60 bg-card">
        <div className="absolute inset-0 bg-hero-42 opacity-95" />
        <div className="page-container relative py-14 sm:py-16 md:py-20">
          <p className="text-[var(--brand-trust-blue)] inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            42 Guardians
          </p>
          <h1 className="text-text-strong mt-4 max-w-2xl text-[1.65rem] font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-[15px] leading-relaxed sm:mt-6 sm:text-base">{t("heroBody")}</p>
        </div>
      </section>

      <div className="page-container py-10 sm:py-12 md:py-14">
        <div className="border-border/60 bg-card mb-10 space-y-8 rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)] sm:mb-12 sm:p-7 md:p-8">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-11"
              aria-label={t("searchPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-10 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-x-10 lg:gap-y-8">
            <div className="space-y-3 lg:min-w-0 lg:flex-1">
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <Tag className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
                {t("filterCategory")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="default"
                  variant={category === "all" ? "default" : "outline"}
                  className="rounded-full px-5 text-sm"
                  onClick={() => setCategory("all")}
                >
                  {t("all")}
                </Button>
                {categories.map((c) => (
                  <Button
                    key={c.slug}
                    type="button"
                    size="default"
                    variant={category === c.slug ? "default" : "outline"}
                    className="rounded-full px-5 text-sm"
                    onClick={() => setCategory(c.slug)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3 lg:min-w-0 lg:flex-1">
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <MapPin className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
                {t("filterRegion")}
              </p>
              <div className="flex flex-wrap gap-2">
                {REGION_SLUGS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="default"
                    variant={region === r ? "default" : "outline"}
                    className="rounded-full px-5 text-sm capitalize"
                    onClick={() => setRegion(r)}
                  >
                    {r === "all" ? t("all") : t(`region.${r}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3 lg:min-w-0 lg:flex-1">
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <ArrowDownWideNarrow className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
                {t("sort")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="default"
                    variant={sort === m ? "default" : "outline"}
                    className="rounded-full px-5 text-sm"
                    onClick={() => setSort(m)}
                  >
                    {t(`sort${m.charAt(0).toUpperCase() + m.slice(1)}` as "sortRecommended")}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3 lg:min-w-[220px]">
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <Layers className="text-[var(--brand-trust-blue)] size-3.5 shrink-0" aria-hidden />
                {t("filterContent")}
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_FILTERS.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="default"
                    variant={contentFilter === f ? "default" : "outline"}
                    className="rounded-full px-5 text-sm"
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
          <div className="border-border/60 text-muted-foreground flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed bg-muted/20 px-6 py-20 text-center sm:py-24">
            <span className="text-[var(--brand-trust-blue)] flex size-14 items-center justify-center rounded-full bg-[var(--brand-trust-blue-soft)]">
              <FileQuestion className="size-7" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-foreground max-w-sm text-base font-medium">{t("empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
            {filtered.map((p) => {
              const coverUrl = getPostHeroImageUrl(p);
              const coverAlt = getPostHeroImageAlt(p);
              return (
              <li key={p.id}>
                {postHasRouteJourney(p) ? (
                  <RoutePostCard post={p} regionLabel={t(`region.${p.region_slug}` as "region.seoul")} />
                ) : (
                  <Link
                    href={`/posts/${p.id}`}
                    className="border-border/70 bg-card group flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-sm)] transition-all hover:border-[color-mix(in_srgb,var(--brand-trust-blue)_35%,var(--border))] hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      <Image
                        src={coverUrl}
                        alt={coverAlt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width:768px) 100vw, 33vw"
                      />
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0e1b3d]/45 to-transparent" />
                      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
                        {p.is_sample ? <PostSampleBadge /> : null}
                        {p.featured ? (
                          <Badge className="rounded-full bg-card/95 text-[10px] font-semibold text-[var(--brand-primary)] shadow-sm backdrop-blur-sm">
                            {t("featured")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                        <Tag className="text-[var(--brand-trust-blue)] size-3 shrink-0" aria-hidden />
                        {p.tags.slice(0, 3).join(" · ")}
                      </p>
                      <div className="mt-3 flex flex-wrap items-start gap-2 gap-y-1">
                        <h2 className="text-foreground line-clamp-2 min-w-0 flex-1 text-[17px] font-semibold leading-snug group-hover:text-[var(--link-color)] sm:text-lg">
                          {p.title}
                        </h2>
                        {p.is_sample ? <PostSampleBadge className="mt-0.5 sm:hidden" /> : null}
                      </div>
                      <p className="text-muted-foreground mt-3 line-clamp-2 flex-1 text-sm leading-relaxed sm:text-[15px]">{p.summary}</p>
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
