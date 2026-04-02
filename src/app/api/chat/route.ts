import type { Content } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini";
import {
  GEMINI_CHAT_HISTORY_LIMIT,
  insertChatMessage,
  loadRecentChatHistoryForGemini,
} from "@/lib/travel-chat/gemini-chat-db";
import { getServerSupabaseForUser, getSessionUserId } from "@/lib/supabase/server-user";
import { recordWaylyUsageFireAndForget } from "@/lib/wayly/record-usage.server";

export const maxDuration = 60;

/** Gemini Developer API 모델 ID — 필요 시 `GEMINI_CHAT_MODEL`로 재정의 */
const CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3-flash-preview";

/** `1`/`true`/`yes`면 Gemini 호출 없이 할당량 초과 샘플 스트림만 반환(로컬·데모용) */
function parseEnvBool(v: string | undefined): boolean {
  if (!v) return false;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

const GEMINI_CHAT_QUOTA_MOCK = parseEnvBool(process.env.GEMINI_CHAT_QUOTA_MOCK);

const QUOTA_MOCK_NOTICE =
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ **API 한도에 도달해 샘플 데이터로 제공합니다.**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

function isLikelyQuotaOrRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("resource exhausted") ||
    m.includes("resource_exhausted") ||
    m.includes("exceeded your current quota") ||
    m.includes("limit: 0") ||
    m.includes(" 429") ||
    m.startsWith("429") ||
    m.includes("too many requests")
  );
}

function buildDummyTokyoItinerary(userHint: string): string {
  const hint =
    userHint.length > 0
      ? `(참고: 질문에 「${userHint.slice(0, 80)}${userHint.length > 80 ? "…" : ""}」가 있었습니다 — 아래는 **샘플** 일정입니다.)\n\n`
      : "";
  return (
    `${hint}` +
    "더미 데이터로 생성된 **일본 도쿄 3박 4일** 일정입니다. 실제 예약·영업시간은 반드시 확인하세요.\n\n" +
    "## 1일차 — 시부야·하라주쿠\n" +
    "- 오전: 공항 → 숙소 체크인(시부야 권역 추천, **샘플**)\n" +
    "- 오후: 메이지 신궁 산책 → 하라주쿠 다케시타 거리\n" +
    "- 저녁: 시부야 스크램블 교차로 야경 · 이치란 라멘 등 가벼운 한 끼\n" +
    "- 💡 샘플 꿀팁: 스크램블 전망대는 해 질 무렵 예약/대기가 길 수 있어요.\n\n" +
    "## 2일차 — 아사쿠사·스카이트리\n" +
    "- 오전: 센소지·나카미세 상점가\n" +
    "- 오후: 스미다 강 루프 버스 또는 도보로 스카이트리\n" +
    "- 저녁: 솔라마치 식사 후 야간 조명 감상\n\n" +
    "## 3일차 — 시오도메·긴자\n" +
    "- 오전: teamLab Planets(사전 예약 필수 — **샘플 문구**)\n" +
    "- 오후: 긴자 윈도우 쇼핑 → 하마릭큐 가든\n" +
    "- 저녁: 스시 오마카세는 예산에 맞는 곳을 미리 검색하세요(더미).\n\n" +
    "## 4일차 — 출발\n" +
    "- 오전: 편의점 간단 식사 후 공항 이동(Narita/Haneda는 항공권 기준)\n" +
    "- ✈️ 여유 있게 **3시간 전** 공항 도착을 권장합니다(샘플 안내).\n\n" +
    "---\n" +
    "이 응답은 API 할당량 대응용 **더미 텍스트**입니다. 한도가 회복되면 실시간 AI 답변이 다시 제공됩니다."
  );
}

async function sleepWithAbort(
  ms: number,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted) return false;
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(true), ms);
    const onAbort = () => {
      clearTimeout(id);
      resolve(false);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** 가짜 스트리밍: 고정 지연 후 짧은 델타로 끊어서 전송 */
function chunkTextForMockStream(text: string, maxChunk = 36): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChunk) {
    out.push(text.slice(i, i + maxChunk));
  }
  return out.length ? out : [""];
}

async function streamQuotaMockResponse(opts: {
  sendSse: (payload: Record<string, unknown>) => void;
  sb: Awaited<ReturnType<typeof getServerSupabaseForUser>>;
  userId: string;
  userMessage: string;
  abortSignal: AbortSignal;
}): Promise<void> {
  const { sendSse, sb, userId, userMessage, abortSignal } = opts;

  const okDelay = await sleepWithAbort(1000, abortSignal);
  if (!okDelay || abortSignal.aborted) {
    sendSse({ type: "error", message: "요청이 취소되었습니다.", code: "ABORTED" });
    return;
  }

  const fullBody = QUOTA_MOCK_NOTICE + buildDummyTokyoItinerary(userMessage);
  const chunks = chunkTextForMockStream(fullBody);

  for (const piece of chunks) {
    if (abortSignal.aborted) {
      sendSse({ type: "error", message: "요청이 취소되었습니다.", code: "ABORTED" });
      return;
    }
    sendSse({ type: "delta", text: piece });
    const jitter = 45 + Math.floor(Math.random() * 75);
    const slept = await sleepWithAbort(jitter, abortSignal);
    if (!slept || abortSignal.aborted) {
      sendSse({ type: "error", message: "요청이 취소되었습니다.", code: "ABORTED" });
      return;
    }
  }

  const trimmed = fullBody.trim();
  if (!trimmed) {
    sendSse({ type: "error", message: "샘플 응답 생성에 실패했습니다.", code: "EMPTY" });
    return;
  }

  if (sb) {
    const savedAi = await insertChatMessage(sb, userId, trimmed, "assistant");
    if (!savedAi.ok) {
      sendSse({
        type: "done",
        warning: `샘플 답변은 전송했으나 저장에 실패했습니다: ${savedAi.message}`,
      });
      return;
    }
  }
  sendSse({
    type: "done",
    warning: "이 답변은 API 한도 대응용 샘플입니다. 실제 AI 응답이 아닙니다.",
  });
}

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
  if (!ai && !GEMINI_CHAT_QUOTA_MOCK) {
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
        if (GEMINI_CHAT_QUOTA_MOCK) {
          await streamQuotaMockResponse({
            sendSse,
            sb,
            userId,
            userMessage: message,
            abortSignal,
          });
          return;
        }

        if (!ai) {
          sendSse({
            type: "error",
            message:
              "Gemini 클라이언트를 만들 수 없습니다. `GOOGLE_GENERATIVE_AI_API_KEY`를 설정하거나 `GEMINI_CHAT_QUOTA_MOCK`을 끄세요.",
            code: "NO_CLIENT",
          });
          return;
        }

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
        recordWaylyUsageFireAndForget(sb, {
          geminiGenerations: 1,
          geminiEstInputTokens: Math.ceil(message.length / 4) + 1500,
          geminiEstOutputTokens: Math.ceil(trimmed.length / 4),
        });
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
        if (isLikelyQuotaOrRateLimitError(msg)) {
          try {
            await streamQuotaMockResponse({
              sendSse,
              sb,
              userId,
              userMessage: message,
              abortSignal,
            });
          } catch (mockErr) {
            console.error("[api/chat] quota mock", mockErr);
            try {
              const payload = JSON.stringify({
                message:
                  "샘플 응답을 보내는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
              });
              safeEnqueue(encoder.encode(`event: error\ndata: ${payload}\n\n`));
            } catch {
              /* ignore */
            }
          }
        } else {
          try {
            const payload = JSON.stringify({ message: msg });
            safeEnqueue(encoder.encode(`event: error\ndata: ${payload}\n\n`));
          } catch {
            /* ignore */
          }
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
