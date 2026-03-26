import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ContentPost } from "@/types/domain";
import { POST_SAMPLE_BADGE_CLASS } from "@/components/posts/post-sample-constants";
import { relatedPostsFor } from "@/lib/posts-public";
import {
  getPostHeroImageAlt,
  getPostHeroImageUrl,
  getPostSecondaryImageAlt,
  getPostSecondaryImageUrl,
  postHasOwnVisualMedia,
  postHasRouteJourney,
} from "@/lib/content-post-route";
import { Badge } from "@/components/ui/badge";
import { PostAuthorAside } from "@/components/posts/post-author-aside";
import { PostDetailStickyAside } from "@/components/posts/post-detail-sticky-aside";
import { RoutePostDetailView } from "@/components/posts/route-post-detail-view";
import { ArrowLeft, Calendar, Heart, MapPin } from "lucide-react";

function heroGradient(post: ContentPost) {
  const hue = post.title.length * 17 + post.kind.length * 40;
  return `linear-gradient(145deg, hsl(${hue % 360} 45% 92%) 0%, hsl(${(hue + 50) % 360} 40% 85%) 50%, #fff 100%)`;
}

export async function PostDetailView({ post }: { post: ContentPost }) {
  if (postHasRouteJourney(post)) {
    return <RoutePostDetailView post={post} />;
  }

  const t = await getTranslations("Posts");
  const related = relatedPostsFor(post, 4);
  const heroCover = getPostHeroImageUrl(post);
  const heroAlt = getPostHeroImageAlt(post);
  const secondaryCover = getPostSecondaryImageUrl(post);
  const secondaryAlt = getPostSecondaryImageAlt(post);
  const showEnrichedPair = !postHasOwnVisualMedia(post) && secondaryCover;

  const date = new Date(post.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="bg-[var(--bg-page)] pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <Link
          href="/posts"
          className="group/back text-muted-foreground hover:text-foreground mb-4 -ml-2 inline-flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium transition-all duration-200 hover:border-border/70 hover:gap-2"
        >
          <ArrowLeft className="size-4 shrink-0 transition-transform duration-200 group-hover/back:-translate-x-0.5" aria-hidden />
          {t("backToList")}
        </Link>
      </div>

      <header className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="border-border/60 relative overflow-hidden rounded-[1.75rem] border shadow-[var(--shadow-md)]"
          style={{ background: heroGradient(post) }}
        >
          <div className="relative aspect-[21/10] max-h-[320px] min-h-[200px] sm:aspect-[3/1]">
            <Image
              src={heroCover}
              alt={heroAlt}
              fill
              className="object-cover opacity-35 mix-blend-multiply"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 space-y-3 p-6 sm:p-10">
              <div className="flex flex-wrap items-center gap-2">
                {post.is_sample ? (
                  <span className={POST_SAMPLE_BADGE_CLASS} title={t("sampleBadgeAria")}>
                    {t("sampleBadge")}
                  </span>
                ) : null}
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full font-medium">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="text-text-strong max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {post.title}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">{post.summary}</p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" aria-hidden />
                  {date}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden />
                  <span className="capitalize">{t(`region.${post.region_slug}` as "region.seoul")}</span>
                </span>
                {post.helpful_rating != null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="size-4 fill-rose-400/90 text-rose-400/90" aria-hidden />
                    {t("helpfulShort", { rating: post.helpful_rating.toFixed(1) })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-12">
        <div className="max-w-none lg:col-span-8">
          {showEnrichedPair ? (
            <figure className="border-border/60 relative mb-8 aspect-[16/10] overflow-hidden rounded-xl border sm:aspect-[21/9]">
              <Image
                src={secondaryCover!}
                alt={secondaryAlt ?? heroAlt}
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 66vw"
              />
            </figure>
          ) : null}
          <div className="text-foreground space-y-4 text-[15px] leading-relaxed sm:text-base">
            {post.body.split("\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        <PostDetailStickyAside>
          <PostAuthorAside post={post} />
        </PostDetailStickyAside>
      </div>

      {related.length > 0 ? (
        <section className="border-border/50 border-t bg-card/90">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-text-strong text-xl font-semibold">{t("relatedTitle")}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/posts/${r.id}`}
                    className="border-border/70 bg-card block h-full rounded-2xl border p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-primary/25"
                  >
                    <p className="line-clamp-2 font-semibold leading-snug">{r.title}</p>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{r.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </article>
  );
}
