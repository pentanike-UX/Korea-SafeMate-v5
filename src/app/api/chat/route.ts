import type { Content } from "@google/genai";
import {
  getGeminiClient,
  isChatProviderAbortError,
  shouldFallbackFromGeminiToGroq,
} from "@/lib/gemini";
import { getGroqClient, streamGroqTravelPlanner } from "@/lib/groq-travel-chat.server";
import { streamOpenAiTravelPlanner } from "@/lib/openai-travel-chat.server";
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

/** Gemini 실패·할당량·키 미설정 시 스트리밍하는 고정 샘플 (UI 테스트용) */
const DUMMY_TRAVEL_GUIDE_KR =
  "안녕하세요! 15년 차 로컬 가이드입니다. 🗺️ 요청하신 경주 2박 3일 동선을 짜드릴게요!\n" +
  "* 1일차: 경주역 도착 ➡️ 황리단길 맛집 투어 ➡️ 첨성대 야경\n" +
  "* 2일차: 불국사 ➡️ 석굴암 ➡️ 동궁과 월지\n" +
  "\n" +
  "💡 현지인 꿀팁: 황리단길은 주말에 주차가 매우 힘드니 대중교통을 적극 추천합니다!";

function buildDummyStreamBody(userMessage: string, opts: { quotaBanner: boolean }): string {
  let out = "";
  if (opts.quotaBanner) out += QUOTA_MOCK_NOTICE;
  const u = userMessage.trim();
  if (u.length > 0) {
    out +=
      `(참고로 질문에 「${u.slice(0, 80)}${u.length > 80 ? "…" : ""}」가 있었어요. 아래는 **샘플** 동선이에요.)\n\n`;
  }
  out += DUMMY_TRAVEL_GUIDE_KR;
  return out;
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

/** Gemini 미사용·오류 시에도 동일 SSE 형식으로 델타를 나눠 보냄 */
async function streamDummyTravelGuideSse(opts: {
  sendSse: (payload: Record<string, unknown>) => void;
  sb: Awaited<ReturnType<typeof getServerSupabaseForUser>>;
  userId: string;
  userMessage: string;
  abortSignal: AbortSignal;
  quotaBanner: boolean;
  doneWarning?: string;
}): Promise<void> {
  const { sendSse, sb, userId, userMessage, abortSignal, quotaBanner, doneWarning } =
    opts;

  const okDelay = await sleepWithAbort(1000, abortSignal);
  if (!okDelay || abortSignal.aborted) {
    sendSse({ type: "error", message: "요청이 취소되었습니다.", code: "ABORTED" });
    return;
  }

  const fullBody = buildDummyStreamBody(userMessage, { quotaBanner });
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
    warning:
      doneWarning ??
      (quotaBanner
        ? "이 답변은 API 한도 대응용 샘플입니다. 실제 AI 응답이 아닙니다."
        : "샘플 동선 안내입니다. API가 복구되면 질문에 맞는 실시간 답변이 제공돼요."),
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

      const fallbackDummy = async (doneWarning?: string) => {
        await streamDummyTravelGuideSse({
          sendSse,
          sb,
          userId,
          userMessage: message,
          abortSignal,
          quotaBanner: false,
          doneWarning,
        });
      };

      try {
        if (GEMINI_CHAT_QUOTA_MOCK) {
          await streamDummyTravelGuideSse({
            sendSse,
            sb,
            userId,
            userMessage: message,
            abortSignal,
            quotaBanner: true,
          });
          return;
        }

        const aiClient = getGeminiClient();
        if (!aiClient) {
          await fallbackDummy(
            "API 키가 없어 샘플 동선으로 안내했어요. `GOOGLE_GENERATIVE_AI_API_KEY`를 설정하면 실시간 답변이 돌아와요.",
          );
          return;
        }

        const streamFallbackOpts = {
          systemInstruction: TRAVEL_PLANNER_SYSTEM_INSTRUCTION,
          history,
          userMessage: message,
          abortSignal,
          onDelta: (t: string) => sendSse({ type: "delta", text: t }),
        };

        /** Gemini 실패 시 Groq → OpenAI 순 (`/api/v5/chat`와 동일) */
        const tryFallbackProviders = async (
          err: unknown,
          errorLabel: string,
        ): Promise<{ text: string; source: "groq" | "openai" } | null> => {
          if (abortSignal.aborted || isChatProviderAbortError(err)) return null;

          if (shouldFallbackFromGeminiToGroq(err, abortSignal) && getGroqClient()) {
            try {
              const groqText = (await streamGroqTravelPlanner(streamFallbackOpts)).trim();
              if (groqText) return { text: groqText, source: "groq" };
            } catch (ge) {
              console.error(`[api/chat] Groq fallback ${errorLabel}`, ge);
            }
          }

          if (process.env.OPENAI_API_KEY?.trim()) {
            try {
              const openaiText = (await streamOpenAiTravelPlanner(streamFallbackOpts)).trim();
              if (openaiText) return { text: openaiText, source: "openai" };
            } catch (oe) {
              console.error(`[api/chat] OpenAI fallback ${errorLabel}`, oe);
            }
          }

          return null;
        };

        const persistAssistantAndDone = async (
          trimmed: string,
          opts?: { fallbackSource?: "groq" | "openai" },
        ) => {
          const savedAi = await insertChatMessage(sb, userId, trimmed, "assistant");
          recordWaylyUsageFireAndForget(sb, {
            geminiGenerations: 1,
            geminiEstInputTokens: Math.ceil(message.length / 4) + 1500,
            geminiEstOutputTokens: Math.ceil(trimmed.length / 4),
          });
          const parts: string[] = [];
          if (opts?.fallbackSource === "groq") {
            parts.push("Gemini API 한도·오류로 Groq 백업 모델이 응답했습니다.");
          } else if (opts?.fallbackSource === "openai") {
            parts.push("Gemini·Groq를 쓰지 못해 OpenAI 백업 모델이 응답했습니다.");
          }
          if (!savedAi.ok) {
            parts.push(`AI 답변은 전송했으나 저장에 실패했습니다: ${savedAi.message}`);
          }
          sendSse({
            type: "done",
            ...(parts.length ? { warning: parts.join(" ") } : {}),
          });
        };

        let chat;
        try {
          chat = aiClient.chats.create({
            model: CHAT_MODEL,
            config: {
              systemInstruction: TRAVEL_PLANNER_SYSTEM_INSTRUCTION,
              temperature: 0.85,
              maxOutputTokens: 4096,
            },
            history: history.length > 0 ? history : undefined,
          });
        } catch (e) {
          console.error("[api/chat] chats.create", e);
          const fb = await tryFallbackProviders(e, "after chats.create");
          if (fb) {
            await persistAssistantAndDone(fb.text, { fallbackSource: fb.source });
          } else {
            await fallbackDummy();
          }
          return;
        }

        let streamGen: AsyncGenerator<{ text?: string; promptFeedback?: { blockReason?: string } }>;
        try {
          streamGen = await chat.sendMessageStream({
            message,
            config: { abortSignal },
          });
        } catch (e) {
          console.error("[api/chat] sendMessageStream", e);
          const fb = await tryFallbackProviders(e, "after sendMessageStream");
          if (fb) {
            await persistAssistantAndDone(fb.text, { fallbackSource: fb.source });
          } else {
            await fallbackDummy();
          }
          return;
        }

        let accumulated = "";
        let aborted = false;

        try {
          for await (const chunk of streamGen) {
            if (abortSignal.aborted) {
              aborted = true;
              sendSse({ type: "error", message: "요청이 취소되었습니다.", code: "ABORTED" });
              break;
            }

            if (chunk.promptFeedback?.blockReason) {
              if (accumulated.trim().length > 0) {
                sendSse({
                  type: "done",
                  warning:
                    "일부만 전달됐어요. 정책 제한이 있어 샘플 동선은 생략했습니다. 표현을 바꿔 다시 시도해 보세요.",
                });
              } else {
                await fallbackDummy("콘텐츠 정책으로 자동 응답이 제한되어 샘플 동선을 보여 드렸어요.");
              }
              return;
            }

            const { delta, nextAccumulated } = extractTextDelta(chunk.text, accumulated);
            accumulated = nextAccumulated;
            if (delta) {
              sendSse({ type: "delta", text: delta });
            }
          }
        } catch (e) {
          console.error("[api/chat] stream iteration", e);
          if (accumulated.trim().length > 0) {
            sendSse({
              type: "done",
              warning:
                "응답이 중간에 끊겼어요. 아래까지는 전달됐고, API 할당량·네트워크를 확인해 주세요.",
            });
            return;
          }
          const fb = await tryFallbackProviders(e, "after stream error");
          if (fb) {
            await persistAssistantAndDone(fb.text, { fallbackSource: fb.source });
          } else {
            await fallbackDummy();
          }
          return;
        }

        if (aborted) {
          return;
        }

        const trimmed = accumulated.trim();
        if (!trimmed) {
          const fb = await tryFallbackProviders(
            new Error("empty gemini response"),
            "after empty Gemini",
          );
          if (fb) {
            await persistAssistantAndDone(fb.text, { fallbackSource: fb.source });
          } else {
            await fallbackDummy("모델이 빈 응답을 돌려줘서 샘플 동선으로 대체했어요.");
          }
          return;
        }

        await persistAssistantAndDone(trimmed);
      } catch (e) {
        console.error("[api/chat] stream", e);
        try {
          await streamDummyTravelGuideSse({
            sendSse,
            sb,
            userId,
            userMessage: message,
            abortSignal,
            quotaBanner: false,
          });
        } catch (mockErr) {
          console.error("[api/chat] dummy fallback", mockErr);
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
