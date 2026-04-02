import type { Content } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini";
import {
  GEMINI_CHAT_HISTORY_LIMIT,
  insertChatMessage,
  loadRecentChatHistoryForGemini,
} from "@/lib/travel-chat/gemini-chat-db";
import { getServerSupabaseForUser, getSessionUserId } from "@/lib/supabase/server-user";

export const maxDuration = 60;

/** Gemini Developer API 모델 ID — 필요 시 `GEMINI_CHAT_MODEL`로 재정의 */
const CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3-flash-preview";

const TRAVEL_PLANNER_SYSTEM_INSTRUCTION = `너는 15년 경력의 베테랑 여행 플래너이자, 현지 맛집과 숨은 명소를 꿰고 있는 유쾌한 로컬 가이드야.

반드시 지킬 것:
- 사용자에게 친근하고 활기찬 톤앤매너로 답해줘. **존댓말**을 사용해.
- 이모지를 적당히 섞어서 분위기를 밝게 유지해.
- 일정·코스·추천을 할 때는 **타임라인**(예: 오전/오후/저녁)이나 **불릿 포인트**로 가독성 있게 정리해.
- 검색 결과처럼 뻔한 정보만 나열하지 말고, 매 응답마다 **현지인 꿀팁**을 최소 한 가지는 꼭 포함해 (시간대·자리·동선·비용·예약·피할 것 등).
- 안전·날씨·이동(도보·대중교통 등)을 여행 맥락에 맞게 자연스럽게 언급해도 좋아.`;

/** SSE `data:` 한 줄에 실을 JSON (클라이언트에서 JSON.parse) */
function sseData(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** 스트리밍 청크에서 텍스트 델타 추출 (누적 응답 vs 조각 응답 모두 대응) */
function extractTextDelta(chunkText: string | undefined, prevAccumulated: string): {
  delta: string;
  nextAccumulated: string;
} {
  if (chunkText === undefined || chunkText === "") {
    return { delta: "", nextAccumulated: prevAccumulated };
  }
  if (
    prevAccumulated.length > 0 &&
    chunkText.length >= prevAccumulated.length &&
    chunkText.startsWith(prevAccumulated)
  ) {
    return {
      delta: chunkText.slice(prevAccumulated.length),
      nextAccumulated: chunkText,
    };
  }
  return {
    delta: chunkText,
    nextAccumulated: prevAccumulated + chunkText,
  };
}

/** Gemini history는 user → model 교차 권장: 마지막이 user로 끝나면 다음 sendMessage와 이어짐 */
function trimHistoryForAlternatingUserStart(history: Content[]): Content[] {
  if (history.length === 0) return [];
  const last = history[history.length - 1];
  const lastRole = last?.role ?? "user";
  if (lastRole === "user") {
    return history.slice(0, -1);
  }
  return history;
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json(
      { error: "로그인이 필요합니다. 대화를 저장하려면 세션이 있어야 합니다." },
      { status: 401 },
    );
  }

  const sb = await getServerSupabaseForUser();
  if (!sb) {
    return Response.json(
      { error: "Supabase 서버 클라이언트를 만들 수 없습니다. 환경 변수를 확인하세요." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "요청 본문이 객체여야 합니다." }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>).message;
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message) {
    return Response.json(
      { error: "`message` 필드에 비어 있지 않은 문자열을 보내 주세요." },
      { status: 400 },
    );
  }

  const ai = getGeminiClient();
  if (!ai) {
    return Response.json(
      {
        error:
          "Gemini API가 설정되지 않았습니다. `GOOGLE_GENERATIVE_AI_API_KEY` 환경 변수를 확인하세요.",
      },
      { status: 503 },
    );
  }

  const historyRaw = await loadRecentChatHistoryForGemini(
    sb,
    userId,
    GEMINI_CHAT_HISTORY_LIMIT,
  );
  const history = trimHistoryForAlternatingUserStart(historyRaw);

  const savedUser = await insertChatMessage(sb, userId, message, "user");
  if (!savedUser.ok) {
    return Response.json(
      { error: `사용자 메시지 저장에 실패했습니다: ${savedUser.message}` },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const abortSignal = req.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const safeClose = () => {
        try {
          controller.close();
        } catch {
          /* 이미 닫힘 */
        }
      };

      const safeEnqueue = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk);
        } catch {
          /* 취소·백프레셔 */
        }
      };

      const sendSse = (payload: Record<string, unknown>) => {
        safeEnqueue(encoder.encode(sseData(payload)));
      };

      try {
        const chat = ai.chats.create({
          model: CHAT_MODEL,
          config: {
            systemInstruction: TRAVEL_PLANNER_SYSTEM_INSTRUCTION,
            temperature: 0.85,
            maxOutputTokens: 4096,
          },
          history: history.length > 0 ? history : undefined,
        });

        const streamGen = await chat.sendMessageStream({
          message,
          config: { abortSignal },
        });

        let accumulated = "";
        let streamStopped: "abort" | "blocked" | null = null;

        for await (const chunk of streamGen) {
          if (abortSignal.aborted) {
            streamStopped = "abort";
            sendSse({ type: "error", message: "요청이 취소되었습니다.", code: "ABORTED" });
            break;
          }

          if (chunk.promptFeedback?.blockReason) {
            streamStopped = "blocked";
            sendSse({
              type: "error",
              message: "콘텐츠 정책으로 응답이 제한되었습니다.",
              code: "BLOCKED",
            });
            break;
          }

          const { delta, nextAccumulated } = extractTextDelta(chunk.text, accumulated);
          accumulated = nextAccumulated;
          if (delta) {
            sendSse({ type: "delta", text: delta });
          }
        }

        if (streamStopped) {
          safeClose();
          return;
        }

        const trimmed = accumulated.trim();
        if (!trimmed) {
          sendSse({
            type: "error",
            message: "모델이 비어 있는 응답을 반환했습니다.",
            code: "EMPTY",
          });
          safeClose();
          return;
        }

        const savedAi = await insertChatMessage(sb, userId, trimmed, "assistant");
        if (!savedAi.ok) {
          sendSse({
            type: "done",
            warning: `AI 답변은 전송했으나 저장에 실패했습니다: ${savedAi.message}`,
          });
        } else {
          sendSse({ type: "done" });
        }
      } catch (e) {
        console.error("[api/chat] stream", e);
        const msg =
          e instanceof Error ? e.message : "Gemini 스트리밍 요청에 실패했습니다.";
        try {
          const payload = JSON.stringify({ message: msg });
          safeEnqueue(encoder.encode(`event: error\ndata: ${payload}\n\n`));
        } catch {
          /* ignore */
        }
      } finally {
        safeClose();
      }
    },
    cancel() {
      /* ReadableStream 취소 시 Gemini 쪽은 abortSignal로 중단 */
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
