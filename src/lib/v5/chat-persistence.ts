/**
 * v5 Chat Persistence — Supabase CRUD helpers
 *
 * 전제: supabase/migrations/20260402_v5_chat_tables.sql 적용 완료
 * 클라이언트: @supabase/ssr browser-client (쿠키 기반 세션)
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// ─── DB Row Types (스키마 1:1 매핑) ──────────────────────────────────────────

export interface DBConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  travel_plan: Record<string, unknown> | null;
  created_at: string;
}

export interface DBSavedPlan {
  id: string;
  user_id: string;
  from_conversation_id: string | null;
  plan_id: string;
  title: string;
  region: string;
  plan_data: Record<string, unknown>;
  saved_at: string;
}

// ─── Conversations ────────────────────────────────────────────────────────────

/** 사용자의 대화 목록 (최신순, 최대 50개) */
export async function loadConversations(userId: string): Promise<DBConversation[]> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("v5_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) { console.error("[v5] loadConversations:", error.message); return []; }
  return data ?? [];
}

/** 새 대화 생성 → 생성된 row 반환 */
export async function createConversation(
  userId: string,
  title = "새 대화"
): Promise<DBConversation | null> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("v5_conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) { console.error("[v5] createConversation:", error.message); return null; }
  return data;
}

/** 대화 제목 업데이트 */
export async function updateConversationTitle(convId: string, title: string): Promise<void> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return;
  const { error } = await sb
    .from("v5_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", convId);
  if (error) console.error("[v5] updateConversationTitle:", error.message);
}

/** 대화 삭제 (CASCADE → messages 자동 삭제) */
export async function deleteConversation(convId: string): Promise<void> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return;
  const { error } = await sb.from("v5_conversations").delete().eq("id", convId);
  if (error) console.error("[v5] deleteConversation:", error.message);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

/** 특정 대화의 메시지 전체 (시간순) */
export async function loadMessages(convId: string): Promise<DBMessage[]> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("v5_messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[v5] loadMessages:", error.message); return []; }
  return data ?? [];
}

/** 메시지 1건 저장 */
export async function saveMessage(
  convId: string,
  role: "user" | "assistant",
  content: string,
  travelPlan?: Record<string, unknown> | null
): Promise<DBMessage | null> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("v5_messages")
    .insert({ conversation_id: convId, role, content, travel_plan: travelPlan ?? null })
    .select()
    .single();
  if (error) { console.error("[v5] saveMessage:", error.message); return null; }
  // 대화 updated_at 갱신 (fire-and-forget)
  void sb
    .from("v5_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);
  return data;
}

// ─── Saved Plans ──────────────────────────────────────────────────────────────

/** 저장된 플랜 목록 (최신순) */
export async function loadSavedPlans(userId: string): Promise<DBSavedPlan[]> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("v5_saved_plans")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (error) { console.error("[v5] loadSavedPlans:", error.message); return []; }
  return data ?? [];
}

/** 플랜 저장 */
export async function savePlanToDB(
  userId: string,
  fromConvId: string,
  plan: Record<string, unknown> & { id: string; title: string; region: string }
): Promise<DBSavedPlan | null> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("v5_saved_plans")
    .insert({
      user_id: userId,
      from_conversation_id: fromConvId,
      plan_id: plan.id,
      title: plan.title,
      region: plan.region,
      plan_data: plan,
    })
    .select()
    .single();
  if (error) { console.error("[v5] savePlanToDB:", error.message); return null; }
  return data;
}

/** plan_id + user_id 기준 중복 저장 방지 체크 */
export async function isPlanAlreadySaved(
  userId: string,
  planId: string
): Promise<boolean> {
  const sb = createSupabaseBrowserClient();
  if (!sb) return false;
  const { count, error } = await sb
    .from("v5_saved_plans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("plan_id", planId);
  if (error) return false;
  return (count ?? 0) > 0;
}
