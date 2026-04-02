import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WaylyUsagePatch = {
  geminiGenerations?: number;
  geminiEstInputTokens?: number;
  geminiEstOutputTokens?: number;
  routingLive?: number;
  naverLive?: number;
};

/**
 * 로그인 사용자 세션으로 RPC 호출 (RLS + auth.uid()).
 * 실패해도 메인 요청은 성공하도록 로그만 남김.
 */
export function recordWaylyUsageFireAndForget(
  sb: SupabaseClient | null,
  patch: WaylyUsagePatch,
): void {
  if (!sb) return;
  const {
    geminiGenerations = 0,
    geminiEstInputTokens = 0,
    geminiEstOutputTokens = 0,
    routingLive = 0,
    naverLive = 0,
  } = patch;
  if (
    geminiGenerations === 0 &&
    geminiEstInputTokens === 0 &&
    geminiEstOutputTokens === 0 &&
    routingLive === 0 &&
    naverLive === 0
  ) {
    return;
  }
  void sb
    .rpc("wayly_record_usage", {
      p_gemini_generations: geminiGenerations,
      p_gemini_est_in: geminiEstInputTokens,
      p_gemini_est_out: geminiEstOutputTokens,
      p_routing_live: routingLive,
      p_naver_live: naverLive,
    })
    .then(({ error }) => {
      if (error) console.error("[wayly_record_usage]", error.message);
    });
}
