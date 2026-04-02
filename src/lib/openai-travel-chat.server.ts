import "server-only";

import type { Content } from "@google/genai";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { geminiHistoryToGroqMessages } from "@/lib/groq-travel-chat.server";

function openaiModelId(): string {
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

/**
 * 여행 플래너 스트리밍 — `/api/chat`에서 Gemini(·Groq) 실패 후 OpenAI 폴백 시 호출.
 * `onDelta`로 SSE 델타를 그대로 보냅니다.
 */
export async function streamOpenAiTravelPlanner(opts: {
  systemInstruction: string;
  history: Content[];
  userMessage: string;
  abortSignal: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const historyMsgs = geminiHistoryToGroqMessages(opts.history);
  const messages = [
    ...historyMsgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: opts.userMessage },
  ];

  const result = streamText({
    model: openai(openaiModelId()),
    system: opts.systemInstruction,
    messages,
    temperature: 0.85,
    maxOutputTokens: 4096,
    abortSignal: opts.abortSignal,
  });

  let full = "";
  for await (const delta of result.textStream) {
    if (opts.abortSignal.aborted) break;
    if (delta) {
      full += delta;
      opts.onDelta(delta);
    }
  }
  return full;
}
