import "server-only";

import type { Content } from "@google/genai";
import Groq from "groq-sdk";

/** `generateObject`(json_schema)와 호환되려면 Groq Structured Outputs 지원 모델이어야 함. @see https://console.groq.com/docs/structured-outputs#supported-models */
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

function groqModelId(): string {
  return process.env.GROQ_CHAT_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

function readGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

export function getGroqClient(): Groq | null {
  const apiKey = readGroqApiKey();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function contentToPlainText(c: Content): string {
  const parts = c.parts ?? [];
  return parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

/**
 * Gemini `Content[]` 히스토리 → Groq Chat messages (system은 별도 전달).
 */
export function geminiHistoryToGroqMessages(
  history: Content[],
): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const c of history) {
    const role = c.role === "model" ? "assistant" : "user";
    if (role !== "user" && role !== "assistant") continue;
    const text = contentToPlainText(c);
    if (!text) continue;
    out.push({ role, content: text });
  }
  return out;
}

/**
 * 여행 플래너 스트리밍 — `/api/chat`에서 Gemini 실패 시 호출.
 * `onDelta`로 SSE 델타를 그대로 보낼 수 있습니다.
 */
export async function streamGroqTravelPlanner(opts: {
  systemInstruction: string;
  history: Content[];
  userMessage: string;
  abortSignal: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<string> {
  const client = getGroqClient();
  if (!client) {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  const historyMsgs = geminiHistoryToGroqMessages(opts.history);
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.systemInstruction },
    ...historyMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: opts.userMessage },
  ];

  const stream = await client.chat.completions.create(
    {
      model: groqModelId(),
      messages,
      stream: true,
      temperature: 0.85,
      max_tokens: 4096,
    },
    { signal: opts.abortSignal },
  );

  let full = "";
  for await (const chunk of stream) {
    if (opts.abortSignal.aborted) break;
    const piece = chunk.choices[0]?.delta?.content ?? "";
    if (piece) {
      full += piece;
      opts.onDelta(piece);
    }
  }
  return full;
}
