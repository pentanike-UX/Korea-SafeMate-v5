import { cache } from "react";
import { mockContentPosts } from "@/data/mock";
import { postHasRouteJourney } from "@/lib/content-post-route";
import type { ContentPost, ContentPostKind, ContentPostStatus } from "@/types/domain";
import type { RouteJourney } from "@/types/domain";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";

type RawPost = {
  id: string;
  author_user_id: string;
  region_id: string;
  category_id: string;
  kind: string;
  title: string;
  summary: string | null;
  body: string;
  tags: string[];
  status: string;
  created_at: string;
  usefulness_votes: number;
  helpful_rating: number | null;
  popular_score: number;
  recommended_score: number;
  featured: boolean;
  post_format: string | null;
  cover_image_url: string | null;
  route_journey: RouteJourney | null;
  route_highlights: unknown;
};

function mapToContentPost(
  row: RawPost,
  region_slug: string,
  category_slug: string,
  author_display_name: string,
): ContentPost {
  const highlights = Array.isArray(row.route_highlights)
    ? row.route_highlights.filter((x): x is string => typeof x === "string")
    : [];
  const rj = row.route_journey ?? undefined;
  return {
    id: row.id,
    author_user_id: row.author_user_id,
    author_display_name,
    region_slug,
    category_slug,
    kind: row.kind as ContentPostKind,
    title: row.title,
    body: row.body,
    summary: row.summary ?? "",
    status: row.status as ContentPostStatus,
    created_at: row.created_at,
    tags: row.tags ?? [],
    usefulness_votes: row.usefulness_votes,
    helpful_rating: row.helpful_rating,
    popular_score: row.popular_score,
    recommended_score: row.recommended_score,
    featured: row.featured,
    post_format: row.post_format as ContentPost["post_format"],
    cover_image_url: row.cover_image_url,
    route_journey: rj,
    route_highlights: highlights,
    is_sample: false,
    has_route: Boolean(rj?.spots?.length),
  };
}

async function mapRowsToPosts(rows: RawPost[]): Promise<ContentPost[]> {
  const sb = createServiceRoleSupabase();
  if (!sb || rows.length === 0) return [];

  const regionIds = [...new Set(rows.map((r) => r.region_id))];
  const categoryIds = [...new Set(rows.map((r) => r.category_id))];
  const authorIds = [...new Set(rows.map((r) => r.author_user_id))];

  const [{ data: regions }, { data: categories }, { data: guardians }] = await Promise.all([
    sb.from("regions").select("id, slug").in("id", regionIds),
    sb.from("content_categories").select("id, slug").in("id", categoryIds),
    sb.from("guardian_profiles").select("user_id, display_name").in("user_id", authorIds),
  ]);

  const regionSlug = new Map((regions ?? []).map((r) => [r.id, r.slug as string]));
  const categorySlug = new Map((categories ?? []).map((c) => [c.id, c.slug as string]));
  const authorName = new Map((guardians ?? []).map((g) => [g.user_id, g.display_name as string]));

  const out: ContentPost[] = [];
  for (const row of rows) {
    const rs = regionSlug.get(row.region_id);
    const cs = categorySlug.get(row.category_id);
    if (!rs || !cs) continue;
    out.push(
      mapToContentPost(row, rs, cs, authorName.get(row.author_user_id)?.trim() || "Guardian"),
    );
  }
  return out;
}

/** 승인된 퍼블릭 포스트 — DB + 시드 mock 병합(동일 id는 DB 우선) */
export const listApprovedPostsMerged = cache(async (): Promise<ContentPost[]> => {
  const sb = createServiceRoleSupabase();
  const mockApproved = mockContentPosts.filter((p) => p.status === "approved");
  if (!sb) return mockApproved;

  const { data: rows, error } = await sb
    .from("content_posts")
    .select("*")
    .eq("status", "approved")
    .order("recommended_score", { ascending: false })
    .limit(400);

  if (error) {
    console.error("[listApprovedPostsMerged]", error);
    return mockApproved;
  }

  const dbPosts = await mapRowsToPosts((rows ?? []) as RawPost[]);
  const dbIds = new Set(dbPosts.map((p) => p.id));
  const mockOnly = mockApproved.filter((m) => !dbIds.has(m.id));
  return [...dbPosts, ...mockOnly].sort((a, b) => {
    if (b.recommended_score !== a.recommended_score) return b.recommended_score - a.recommended_score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
});

export async function getPublicPostByIdMerged(id: string): Promise<ContentPost | null> {
  const sb = createServiceRoleSupabase();
  if (sb) {
    const { data: row, error } = await sb.from("content_posts").select("*").eq("id", id).eq("status", "approved").maybeSingle();
    if (!error && row) {
      const mapped = await mapRowsToPosts([row as RawPost]);
      if (mapped[0]) return mapped[0];
    }
  }
  const mock = mockContentPosts.find((x) => x.id === id);
  return mock && mock.status === "approved" ? mock : null;
}

const mockApprovedById = (): Map<string, ContentPost> => {
  const m = new Map<string, ContentPost>();
  for (const p of mockContentPosts) {
    if (p.status === "approved") m.set(p.id, p);
  }
  return m;
};

/**
 * 대표 포스트 id들만 승인본으로 조회 — 전체 `listApprovedPostsMerged` 대신 카드/시트용.
 * id 순서는 첫 인자 배열의 고유 순서를 따른다.
 */
export async function listApprovedPostsByIdsMerged(ids: string[]): Promise<ContentPost[]> {
  const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const mockMap = mockApprovedById();
  const sb = createServiceRoleSupabase();

  if (!sb) {
    return unique.map((id) => mockMap.get(id)).filter((p): p is ContentPost => Boolean(p));
  }

  const { data: rows, error } = await sb
    .from("content_posts")
    .select("*")
    .in("id", unique)
    .eq("status", "approved");

  if (error) {
    console.error("[listApprovedPostsByIdsMerged]", error);
    return unique.map((id) => mockMap.get(id)).filter((p): p is ContentPost => Boolean(p));
  }

  const dbPosts = await mapRowsToPosts((rows ?? []) as RawPost[]);
  const dbById = new Map(dbPosts.map((p) => [p.id, p]));

  const out: ContentPost[] = [];
  for (const id of unique) {
    const fromDb = dbById.get(id);
    if (fromDb) {
      out.push(fromDb);
      continue;
    }
    const fromMock = mockMap.get(id);
    if (fromMock) out.push(fromMock);
  }
  return out;
}

/** 대표 id가 비었거나 승인 목록에 없을 때 — 해당 가디언의 최신 승인 포스트 1건 */
export async function getLatestApprovedPostForGuardianMerged(authorUserId: string): Promise<ContentPost | null> {
  if (!authorUserId.trim()) return null;
  const mockApproved = mockContentPosts.filter((p) => p.status === "approved" && p.author_user_id === authorUserId);
  const bestMock = mockApproved.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const sb = createServiceRoleSupabase();
  if (!sb) return bestMock ?? null;

  const { data: row, error } = await sb
    .from("content_posts")
    .select("*")
    .eq("author_user_id", authorUserId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLatestApprovedPostForGuardianMerged]", error);
    return bestMock ?? null;
  }

  if (row) {
    const mapped = await mapRowsToPosts([row as RawPost]);
    if (mapped[0]) return mapped[0];
  }
  return bestMock ?? null;
}

export async function listApprovedRoutePostsMerged(): Promise<ContentPost[]> {
  const all = await listApprovedPostsMerged();
  return all.filter((p) => postHasRouteJourney(p));
}

export async function listPostsForGuardianMerged(authorUserId: string): Promise<ContentPost[]> {
  const all = await listApprovedPostsMerged();
  return all.filter((p) => p.author_user_id === authorUserId);
}

export async function relatedPostsForMerged(current: ContentPost, limit = 4): Promise<ContentPost[]> {
  const all = await listApprovedPostsMerged();
  return all
    .filter((p) => p.id !== current.id)
    .filter((p) => p.region_slug === current.region_slug || p.category_slug === current.category_slug)
    .sort((a, b) => b.recommended_score - a.recommended_score)
    .slice(0, limit);
}
