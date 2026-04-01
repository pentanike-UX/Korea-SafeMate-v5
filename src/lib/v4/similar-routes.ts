import type { CuratedRoute } from "@/domain/curated-experience";
import { listPublishedV4Routes } from "@/data/v4/routes";

export function listSimilarV4Routes(route: CuratedRoute, limit = 3): CuratedRoute[] {
  const all = listPublishedV4Routes().filter((r) => r.slug !== route.slug);
  const sameDistrict = all.filter((r) => r.district === route.district);
  const pool = sameDistrict.length >= limit ? sameDistrict : all;
  return pool.slice(0, limit);
}
