import type { ContentPost } from "@/types/domain";
import type { PublicGuardian } from "@/lib/guardian-public";
import { postContextFromContentPost } from "@/lib/guardian-request-post-context";

type RepIdSource = Pick<PublicGuardian, "representative_post_ids">;

/**
 * `representative_post_ids` 순서대로 카탈로그에서 풀 `ContentPost`를 해석한다.
 * 카탈로그에 없는 id는 건너뛴다(mock/DB 불일치 시 repCtx null에 가깝게).
 */
export function resolveRepresentativeContentPosts(
  guardian: RepIdSource,
  postCatalog: ContentPost[],
  limit = 3,
): ContentPost[] {
  const ids = guardian.representative_post_ids ?? [];
  const out: ContentPost[] = [];
  for (const id of ids) {
    if (!id || out.length >= limit) break;
    const p = postCatalog.find((x) => x.id === id);
    if (p) out.push(p);
  }
  return out;
}

export function resolveRepresentativeContentPost(
  guardian: RepIdSource,
  postCatalog: ContentPost[],
): ContentPost | null {
  return resolveRepresentativeContentPosts(guardian, postCatalog, 1)[0] ?? null;
}

/** 프리뷰 시트 `representativePosts` 슬롯용 — id 순서 유지 */
export function representativePostLinesForSheetPreview(
  guardian: RepIdSource,
  postCatalog: ContentPost[],
  limit = 3,
): Pick<ContentPost, "id" | "title" | "summary">[] {
  return resolveRepresentativeContentPosts(guardian, postCatalog, limit).map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
  }));
}

/** 대표 포스트 1건이 카탈로그에 있을 때만 요청 시트 맥락 생성 */
export function postContextFromGuardianRepresentative(
  guardian: RepIdSource,
  postCatalog: ContentPost[],
): ReturnType<typeof postContextFromContentPost> | null {
  const p = resolveRepresentativeContentPost(guardian, postCatalog);
  return p ? postContextFromContentPost(p) : null;
}
