import type { ContentPost } from "@/types/domain";
import { getGuardianSeedBundle } from "./guardian-seed-bundle";

/** 포스트 목록 — `guardian-seed-posts` 단일 소스 (가디언 시드와 author 연결). */
export const mockContentPosts: ContentPost[] = getGuardianSeedBundle().posts;
