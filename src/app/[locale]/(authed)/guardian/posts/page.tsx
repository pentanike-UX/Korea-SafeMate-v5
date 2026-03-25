import Link from "next/link";
import { redirect } from "@/i18n/navigation";
import { listPostsForGuardian } from "@/lib/posts-public";
import { getContentPostFormat, postHasRouteJourney } from "@/lib/content-post-route";
import { getSessionUserId } from "@/lib/supabase/server-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatLabel(format: ReturnType<typeof getContentPostFormat>) {
  if (format === "hybrid") return "하이브리드";
  if (format === "route") return "루트";
  if (format === "spot") return "스팟";
  return "아티클";
}

export default async function GuardianMyPostsPage({
  searchParams,
  params,
}: {
  searchParams?: Promise<{ saved?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    redirect({ href: "/login", locale });
  }
  const posts = listPostsForGuardian(sessionUserId as string);
  const sp = searchParams ? await searchParams : {};

  return (
    <div className="space-y-8">
      {sp.saved ? (
        <p className="border-primary/20 bg-primary/5 text-foreground rounded-xl border px-4 py-3 text-sm">
          게시 흐름이 기록되었습니다. (MVP: 실제 저장 API는 연결 예정)
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-[10px] font-bold tracking-widest uppercase">Content</p>
          <h1 className="text-2xl font-semibold tracking-tight">내 포스트</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            스팟 · 루트 · 하이브리드 포맷을 구분해 표시합니다. (MVP: 로그인·임시 로그인 계정 기준)
          </p>
        </div>
        <Button asChild className="rounded-2xl">
          <Link href="/guardian/posts/new">새 루트 포스트</Link>
        </Button>
      </div>

      <ul className="space-y-3">
        {posts.map((p) => {
          const format = getContentPostFormat(p);
          const route = postHasRouteJourney(p);
          return (
            <li
              key={p.id}
              className="border-border/60 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/90 p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
                    {formatLabel(format)}
                  </Badge>
                  {route ? (
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      지도 {p.route_journey!.spots.length}스팟
                    </Badge>
                  ) : null}
                  <Badge
                    variant={p.status === "approved" ? "default" : "secondary"}
                    className="rounded-full text-[10px] capitalize"
                  >
                    {p.status}
                  </Badge>
                </div>
                <p className="text-foreground mt-2 font-semibold">{p.title || "(제목 없음)"}</p>
                <p className="text-muted-foreground line-clamp-1 text-sm">{p.summary}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {route ? (
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link href={`/guardian/posts/${p.id}/edit`}>편집</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" disabled>
                    루트 전용
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
