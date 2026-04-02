import type { Content } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";

/** `public.chats`에서 한 번에 가져와 Gemini `history`로 넘길 최대 메시지 수 */
export const GEMINI_CHAT_HISTORY_LIMIT = 10;

export type ChatSenderType = "user" | "assistant";

export type ChatRow = {
  id: string;
  user_id: string;
  message: string;
  sender_type: ChatSenderType;
  created_at: string;
};

/**
 * 최근 메시지를 시간순(오래된 것 먼저)으로 가져와 Gemini `chats.create({ history })`용 Content[]로 변환합니다.
 * - DB `assistant` → Gemini role `model`
 * - 맥락은 `sendMessage`에 넣을 **이번 사용자 메시지 이전**까지이므로, 호출 시점은 해당 메시지 insert 전이어야 합니다.
 */
export async function loadRecentChatHistoryForGemini(
  sb: SupabaseClient,
  userId: string,
  limit = GEMINI_CHAT_HISTORY_LIMIT,
): Promise<Content[]> {
  const { data, error } = await sb
    .from("chats")
    .select("message, sender_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[gemini-chat-db] loadRecentChatHistoryForGemini:", error.message);
    return [];
  }

  const rows = (data ?? []) as Pick<ChatRow, "message" | "sender_type" | "created_at">[];
  const chronological = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  let start = 0;
  while (start < chronological.length && chronological[start]!.sender_type !== "user") {
    start++;
  }

  const normalized: Content[] = [];
  for (let i = start; i < chronological.length; i++) {
    const row = chronological[i]!;
    const role = row.sender_type === "user" ? "user" : "model";
    const text = row.message?.trim();
    if (!text) continue;
    normalized.push({
      role,
      parts: [{ text }],
    });
  }

  return normalized;
}

export async function insertChatMessage(
  sb: SupabaseClient,
  userId: string,
  message: string,
  senderType: ChatSenderType,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, message: "메시지가 비어 있습니다." };
  }

  const { error } = await sb.from("chats").insert({
    user_id: userId,
    message: trimmed,
    sender_type: senderType,
  });

  if (error) {
    console.error("[gemini-chat-db] insertChatMessage:", error.message);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
