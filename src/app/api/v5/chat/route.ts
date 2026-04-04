import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { z } from "zod";
import {
  canAttemptGroqStructuredFallback,
  isChatProviderAbortError,
  shouldAdvanceV5GeminiModelChain,
} from "@/lib/gemini";
import {
  gatherResponseSchema,
  planResponseSchema,
} from "@/lib/v5/travel-chat-schema.server";
import { getServerSupabaseForUser, getSessionUserId } from "@/lib/supabase/server-user";
import { recordWaylyUsageFireAndForget } from "@/lib/wayly/record-usage.server";

export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const GATHER_SYSTEM = `당신은 한국 **로컬 동선**(특정 도시·권역 안만)을 돕는 대화형 AI입니다.

역할:
- 사용자의 자연어에서 조건을 추출해 칩(chip) 형태로 정리합니다.
- 칩 예: **지역**(도시·권역), **동선 중심**(해변·한옥마을·시장 등), **탐색 스타일**(여유·촘촘·반나절 등), 일정(박수·당일), 인원, 교통(도보·대중교통·렌터카 등), 분위기·테마, 음식 취향, 예산 느낌.
- **출발지·귀경지·집으로 돌아오는 왕복**은 이 제품에서 사용하지 않습니다. 사용자가 역·공항을 말해도 "이미 그 지역에 도착했다"는 전제의 현지 코스만 다루고, 왕복 기준지 칩은 만들지 마세요.
- 아직 불명확하면 칩을 비우거나 추측 칩에 "(추정)"을 붙이고, readyToGenerateRoute는 false로 둡니다.
- 지역·대략 일정이 갖춰지면 readyToGenerateRoute를 true로 할 수 있습니다.

응답 규칙:
- assistantMessage: 한국어로 짧고 친근하게, 칩을 자연스럽게 언급하세요.
- chips: id는 영문 snake_case, label은 짧은 한글, value는 한글 값.
- **각 칩마다 category 필드는 반드시 포함** (짧은 한글 분류: 위치·일정·교통 등). 해당 없으면 빈 문자열 \`""\` — API 스키마상 생략 불가.
- 사용자가 "동선 짜줘"만 말했을 때는 정보가 부족하면 칩을 최소화하고 질문 위주로 답하세요.
- **지역 칩(trip_region 등)**: 사용자가 "경기도 · 파주"처럼 시·군·동네까지 말했으면 value에 **그 구체 표현을 그대로** 넣으세요. 광역(경기도)만 남기고 시·군을 버리지 마세요.`;

const PLAN_SYSTEM = `당신은 한국 **로컬 동선** 설계 AI입니다. 사용자가 고른 도시·권역 **안에서만** 스팟을 이어 짭니다.

규칙:
- 반드시 한국어 assistantMessage로 요약과 팁을 제시합니다.
- **지역 일치(매우 중요)**: 대화 맥락·확정 칩에 "파주", "수원", "가평" 등 **구체 시·군·읍면**이 있으면 그 범위의 스팟만 사용하세요. 같은 광역(예: 경기도) 안의 **다른 대표 도시로 바꿔 끼우지 마세요**(예: 파주 요청에 수원 성곽 코스 금지). 칩의 지역 값이 광역만 있어도 직전 사용자 발화에 더 구체적 지명이 있으면 **그 지명**을 기준으로 합니다.
- plan.region·plan.title·각 스팟 이름·좌표는 위에서 정한 **동일한 시·군 권역**과 일치해야 합니다.
- plan은 실제 관광 코스처럼 스팟을 **가능하면 3~12개**, 최소 2개는 반드시 채웁니다. **다른 도시로 이동하거나 집·역으로 복귀하는 구간은 넣지 않습니다.**
- spots[].transitToNext: 스팟 사이 이동(도보/버스/지하철/택시/차 등)과 대략 소요 시간. 마지막 스팟 등 없으면 \`""\`.
- spots[].note: 팁·주의. 없으면 \`""\`.
- spots[].transitMode: 다음 스팟까지 **항공**이면 \`flight\`, **페리**면 \`ferry\`, 그 외(도보·도로)는 \`surface\` (필수 enum, 생략 불가).

**스팟 이름 — 공식 명칭 사용(매우 중요)**:
- 한국관광공사·네이버지도에 등록된 **정식 명칭**으로 적으세요. 일상 표현이나 애칭은 피합니다.
  - 좋은 예: "해운대해수욕장" (O) / 나쁜 예: "해운대 해변" (X)
  - 좋은 예: "광장시장" (O) / 나쁜 예: "광장 전통시장" (X)
  - 좋은 예: "불국사" (O) / 나쁜 예: "경주 불국사 절" (X)
- 음식점·카페는 가급적 지역 대표 먹거리 거리명 또는 유명 상호명을 사용하세요.

**좌표 규칙**:
- lat, lng는 WGS84 좌표. 한국 내: 위도 33~38, 경도 124~132.
- **확실한 관광지**(불국사, 해운대해수욕장 등 유명 장소)만 좌표를 채우세요.
- **정확한 좌표를 모르는 경우**(개별 식당, 소규모 카페, 골목 등)에는 \`null\`로 두세요. 서버가 Tour API로 정확한 좌표를 보정합니다.
- weatherNote, totalTime, alternativeNote: 없으면 \`""\` 빈 문자열로 두세요 (필드 생략 불가).`;

function formatHistory(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "사용자" : "어시스턴트"}: ${m.content}`)
    .join("\n\n");
}

/**
 * V5 structured 전용 모델 체인.
 *
 * **gather** (키워드 추출·칩 생성): 가벼운 작업이므로 flash-lite 시작 → 무료 할당량 절약.
 * **plan** (동선 생성): 한국어 관광 도메인 지식과 structured output 품질이 필요 → 상위 모델 우선.
 *
 * 1.5-flash / 1.5-flash-8b는 structured output 준수율이 낮고 한국 로컬 지식이 부족하여 제거.
 * 429/503/404 시에만 다음 모델로 진행, 그 외 오류는 Groq로 직행.
 */
const V5_GEMINI_GATHER_CHAIN = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-04-17",
] as const;

const V5_GEMINI_PLAN_CHAIN = [
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

/**
 * Groq 최후 수단 — `generateObject`는 `response_format: json_schema`를 씁니다.
 * 기본: `openai/gpt-oss-20b` (Structured Outputs 지원)
 * @see https://console.groq.com/docs/structured-outputs#supported-models
 */
function groqChatModel() {
  const id = process.env.GROQ_CHAT_MODEL?.trim() || "openai/gpt-oss-20b";
  return groq(id);
}

type V5LlmProvider = "gemini" | "groq";

/**
 * Gemini 체인(429/503/404 시에만 다음 모델) → 실패/비재시도 오류 후 Groq.
 * `intent`에 따라 gather(가벼운 체인) vs plan(고품질 체인)을 선택합니다.
 * Google 키 없고 Groq만 있으면 Groq 단독.
 */
async function generateObjectWithLlmFallback<S extends z.ZodType>(args: {
  schema: S;
  system: string;
  prompt: string;
  temperature: number;
  intent?: "gather" | "plan";
}): Promise<{ object: z.infer<S>; provider: V5LlmProvider }> {
  const hasGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());

  const chain =
    args.intent === "gather" ? V5_GEMINI_GATHER_CHAIN : V5_GEMINI_PLAN_CHAIN;

  let lastErr: unknown = new Error("V5 LLM: no attempt");

  if (hasGoogle) {
    for (let i = 0; i < chain.length; i++) {
      const modelId = chain[i]!;
      try {
        const r = await generateObject({
          model: google(modelId),
          schema: args.schema,
          system: args.system,
          prompt: args.prompt,
          temperature: args.temperature,
        });
        return { object: r.object as z.infer<S>, provider: "gemini" };
      } catch (geminiErr) {
        if (isChatProviderAbortError(geminiErr)) throw geminiErr;
        lastErr = geminiErr;
        const advance =
          shouldAdvanceV5GeminiModelChain(geminiErr) &&
          i < chain.length - 1;
        if (advance) {
          console.warn(
            `[v5/chat] Gemini ${modelId} capacity/unavailable/model (429/503/404 등), trying ${chain[i + 1]}`,
            geminiErr,
          );
          continue;
        }
        console.warn(`[v5/chat] Gemini ${modelId} generateObject failed:`, geminiErr);
        break;
      }
    }
  } else {
    lastErr = new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");
  }

  if (hasGroq && canAttemptGroqStructuredFallback(lastErr)) {
    try {
      console.warn("[v5/chat] Falling back to Groq generateObject after Gemini chain:", lastErr);
      const r = await generateObject({
        model: groqChatModel(),
        schema: args.schema,
        system: args.system,
        prompt: args.prompt,
        temperature: args.temperature,
      });
      return { object: r.object as z.infer<S>, provider: "groq" };
    } catch (groqErr) {
      if (isChatProviderAbortError(groqErr)) throw groqErr;
      console.warn("[v5/chat] Groq generateObject failed:", groqErr);
      throw groqErr;
    }
  }

  throw lastErr;
}

function classifyV5ChatFailure(err: unknown): { code: string; userMessage: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("etimedout")) {
    return {
      code: "TIMEOUT",
      userMessage:
        "응답 시간이 초과됐어요. 잠시 후 다시 「이 정보로 동선 짜기」를 눌러 주세요.",
    };
  }

  if (
    lower.includes("zod") ||
    lower.includes("validation") ||
    lower.includes("no object") ||
    lower.includes("schema") ||
    lower.includes("did not match")
  ) {
    return {
      code: "SCHEMA_VALIDATION",
      userMessage:
        "AI 응답 형식이 맞지 않아 동선을 완성하지 못했어요. 조건을 조금 줄이거나 다시 시도해 주세요.",
    };
  }

  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return {
      code: "RATE_LIMIT",
      userMessage:
        "요청 한도에 걸렸을 수 있어요. 잠시 후 다시 시도하거나 다른 시간에 이용해 주세요.",
    };
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key")
  ) {
    return {
      code: "AUTH_CONFIG",
      userMessage:
        "API 키가 없거나 올바르지 않을 수 있어요. 서버 환경 변수(GOOGLE_GENERATIVE_AI_API_KEY·GROQ_API_KEY)를 확인해 주세요.",
    };
  }

  return {
    code: "LLM_FAILED",
    userMessage:
      "일시적으로 동선을 만들지 못했어요. 잠시 후 다시 시도해 주세요. 문제가 계속되면 GROQ_CHAT_MODEL·Gemini 모델 가용성을 확인해 주세요.",
  };
}

/**
 * 문자열 길이 → 토큰 수 추정.
 * 영어는 ~4자/토큰이지만 한글은 ~1.5~2자/토큰. 한글 비율에 따라 보정.
 */
function estimateTokens(charLen: number, text?: string): number {
  if (charLen <= 0) return 0;
  const sample = text?.slice(0, 500) ?? "";
  const koreanChars = (sample.match(/[\uAC00-\uD7AF\u3130-\u318F\u1100-\u11FF]/g) ?? []).length;
  const koreanRatio = sample.length > 0 ? koreanChars / sample.length : 0.5;
  // 한글 비율 0→4자/토큰, 한글 비율 1→1.8자/토큰, 선형 보간
  const charsPerToken = 4 - koreanRatio * 2.2;
  return Math.ceil(charLen / charsPerToken);
}

function jsonOk(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonFail(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: false, ...body }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonFail(400, {
      code: "INVALID_JSON",
      content: "요청 본문을 읽을 수 없어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
      error: "Invalid JSON body",
      preferenceChips: [],
      readyToGenerateRoute: false,
      travelPlan: null,
      usedMock: true,
    });
  }

  try {
    const messages = ((body as { messages?: ChatMessage[] }).messages ?? []) as ChatMessage[];
    const confirmRoute = (body as {
      confirmRoute?: {
        slots: Array<{ id: string; label: string; value: string; category?: string }>;
      };
    }).confirmRoute;

    const hasGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
    const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());

    if (!hasGoogle && !hasGroq) {
      return jsonOk(fallbackNoKey(messages, confirmRoute));
    }

    // confirmRoute가 있으면 gather 스키마를 건너뛰고 plan 스키마만 호출합니다.
    if (confirmRoute?.slots?.length) {
      const slotText = confirmRoute.slots
        .map((s) => `- ${s.label}: ${s.value}${s.category ? ` (${s.category})` : ""}`)
        .join("\n");

      const history = formatHistory(messages.slice(-24));

      const { object, provider } = await generateObjectWithLlmFallback({
        schema: planResponseSchema,
        system: PLAN_SYSTEM,
        prompt: `아래는 지금까지의 대화 맥락입니다.\n\n${history || "(이전 맥락 없음)"}\n\n---\n사용자가 다음 여행 조건을 확정했습니다. **같은 도시·권역 안에서만** 스팟을 이은 로컬 동선을 plan으로 구조화하세요. 다른 도시로 이동하거나 집·역으로 복귀하는 구간은 넣지 마세요.\n\n**지역 주의**: 확정 칩의 "지역"이 넓게만 적혀 있어도, 대화 속 사용자 문장에 "파주·가평·수원" 등 더 구체적인 시·군이 있으면 **반드시 그 시·군**에 속한 스팟만 배치하세요. 광역 단위만 보고 대표 도시로 바꾸지 마세요.\n\n${slotText}`,
        temperature: 0.6,
        intent: "plan",
      });

      const sbPlan = await getServerSupabaseForUser();
      const uidPlan = await getSessionUserId();
      if (uidPlan && sbPlan) {
        const promptLen =
          (history?.length ?? 0) + slotText.length + PLAN_SYSTEM.length + 400;
        const outputStr = JSON.stringify(object);
        recordWaylyUsageFireAndForget(sbPlan, {
          geminiGenerations: provider === "gemini" ? 1 : 0,
          geminiEstInputTokens: estimateTokens(promptLen, history),
          geminiEstOutputTokens: estimateTokens(outputStr.length, outputStr),
        });
      }

      return jsonOk({
        content: object.assistantMessage,
        preferenceChips: null,
        readyToGenerateRoute: false,
        travelPlan: object.plan,
        usedMock: false,
        llmProvider: provider,
      });
    }

    const history = formatHistory(messages.slice(-24));
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const { object, provider } = await generateObjectWithLlmFallback({
      schema: gatherResponseSchema,
      system: GATHER_SYSTEM,
      prompt: `대화 맥락:\n\n${history || "(첫 메시지)"}\n\n---\n마지막 사용자 발화:\n${lastUser}\n\n위를 반영해 assistantMessage, chips, readyToGenerateRoute를 생성하세요.`,
      temperature: 0.5,
      intent: "gather",
    });

    const sbGather = await getServerSupabaseForUser();
    const uidGather = await getSessionUserId();
    if (uidGather && sbGather) {
      const promptLen =
        (history?.length ?? 0) + lastUser.length + GATHER_SYSTEM.length + 400;
      const gatherOutputStr = JSON.stringify(object);
      recordWaylyUsageFireAndForget(sbGather, {
        geminiGenerations: provider === "gemini" ? 1 : 0,
        geminiEstInputTokens: estimateTokens(promptLen, history),
        geminiEstOutputTokens: estimateTokens(gatherOutputStr.length, gatherOutputStr),
      });
    }

    return jsonOk({
      content: object.assistantMessage,
      preferenceChips: object.chips,
      readyToGenerateRoute: object.readyToGenerateRoute,
      travelPlan: null,
      usedMock: false,
      llmProvider: provider,
    });
  } catch (e) {
    console.error("[v5/chat]", e);
    const { code, userMessage } = classifyV5ChatFailure(e);
    return jsonFail(502, {
      code,
      content: userMessage,
      error: e instanceof Error ? e.message : String(e),
      preferenceChips: [],
      readyToGenerateRoute: false,
      travelPlan: null,
      usedMock: true,
    });
  }
}

/** API 키 없을 때 최소 동작(로컬·미설정) */
function fallbackNoKey(
  messages: ChatMessage[],
  confirmRoute?: { slots: Array<{ label: string; value: string }> }
): Record<string, unknown> {
  if (confirmRoute?.slots?.length) {
    const t = confirmRoute.slots.map((s) => `${s.value}`).join(" ");
    const lower = t.toLowerCase();
    if (lower.includes("경주")) {
      return {
        content:
          "경주 2박 3일 여행 동선 예시입니다. (실시간 생성은 GOOGLE_GENERATIVE_AI_API_KEY 또는 GROQ_API_KEY가 필요해요.)",
        preferenceChips: null,
        readyToGenerateRoute: false,
        travelPlan: mockGyeongju(),
        usedMock: true,
      };
    }
    if (lower.includes("부산")) {
      return {
        content:
          "부산 당일 코스 예시입니다. API 키를 설정하면 더 정교한 동선을 받을 수 있어요.",
        preferenceChips: null,
        readyToGenerateRoute: false,
        travelPlan: mockBusan(),
        usedMock: true,
      };
    }
    if (lower.includes("제주")) {
      return {
        content: "제주 서쪽 코스 예시입니다. API 키 설정 후 다시 시도해 보세요.",
        preferenceChips: null,
        readyToGenerateRoute: false,
        travelPlan: mockJeju(),
        usedMock: true,
      };
    }
    return {
      content:
        "LLM API 키가 없어 예시 동선을 만들 수 없어요. GOOGLE_GENERATIVE_AI_API_KEY 또는 GROQ_API_KEY를 환경에 설정해 주세요.",
      preferenceChips: null,
      readyToGenerateRoute: false,
      travelPlan: null,
      usedMock: true,
    };
  }

  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lower = last.toLowerCase();
  const chips: Array<{ id: string; label: string; value: string; category?: string }> = [];
  if (last.trim()) {
    if (lower.includes("경주")) chips.push({ id: "region", label: "지역", value: "경주", category: "위치" });
    else if (lower.includes("부산")) chips.push({ id: "region", label: "지역", value: "부산", category: "위치" });
    else if (lower.includes("제주")) chips.push({ id: "region", label: "지역", value: "제주", category: "위치" });
    else if (lower.includes("서울")) chips.push({ id: "region", label: "지역", value: "서울", category: "위치" });
    if (lower.includes("혼자") || lower.includes("1인")) chips.push({ id: "party", label: "인원", value: "1명", category: "동행" });
    if (lower.includes("맛집") || lower.includes("음식")) chips.push({ id: "food", label: "취향", value: "맛집·음식", category: "테마" });
    if (lower.includes("대중교통") || lower.includes("지하철")) chips.push({ id: "transit", label: "교통", value: "대중교통", category: "이동" });
  }

  return {
    content:
      "안녕하세요! 한국 여행 동선을 함께 짜 드릴게요. 지역·일정·인원·교통·분위기·음식 취향을 알려주시면 칩으로 정리해 드리고, 확인 후 동선을 만들어요. (실시간 AI는 GOOGLE_GENERATIVE_AI_API_KEY 또는 GROQ_API_KEY가 있으면 동작합니다.)",
    preferenceChips: chips,
    readyToGenerateRoute: chips.length >= 2,
    travelPlan: null,
    usedMock: true,
  };
}

function mockGyeongju() {
  return {
    id: "plan-gyeongju-mock",
    title: "경주 역사·맛집 핵심 동선 (예시)",
    region: "경주",
    days: 2,
    summary: "불국사 → 황리단길 → 첨성대 권역을 압축한 예시 코스입니다.",
    spots: [
      { id: "s1", name: "불국사", type: "attraction" as const, duration: "약 2시간", note: "이른 입장 추천.", transitToNext: "택시 약 25분", lat: 35.79, lng: 129.3316 },
      { id: "s2", name: "황리단길 점심", type: "food" as const, duration: "약 1시간 30분", note: "지역 먹거리.", transitToNext: "도보 15분", lat: 35.8326, lng: 129.2134 },
      { id: "s3", name: "첨성대 · 계림", type: "attraction" as const, duration: "약 1시간", note: "해질 무렵 추천.", lat: 35.8353, lng: 129.2195 },
    ],
    weatherNote: "일교차에 대비해 겉옷을 챙기세요.",
    totalTime: "이동 합산 약 1시간",
    alternativeNote: "우천 시 실내 박물관으로 일부 대체 가능.",
  };
}

function mockBusan() {
  return {
    id: "plan-busan-mock",
    title: "부산 남포·시장 코스 (예시)",
    region: "부산",
    days: 1,
    summary: "시장·도심 위주 당일 예시입니다.",
    spots: [
      { id: "b1", name: "자갈치시장", type: "food" as const, duration: "약 1시간", transitToNext: "도보 5분", lat: 35.0971, lng: 129.0304 },
      { id: "b2", name: "국제시장·BIFF광장", type: "attraction" as const, duration: "약 1시간 30분", transitToNext: "버스 15분", lat: 35.0989, lng: 129.0258 },
      { id: "b3", name: "감천문화마을", type: "attraction" as const, duration: "약 1시간 30분", lat: 35.098, lng: 129.0097 },
    ],
    weatherNote: "해안가는 바람이 강할 수 있어요.",
    totalTime: "이동 합산 약 2시간",
    alternativeNote: "체력에 따라 해운대 권역으로 분할 가능.",
  };
}

function mockJeju() {
  return {
    id: "plan-jeju-mock",
    title: "제주 서쪽 해안 (예시)",
    region: "제주",
    days: 1,
    summary: "서쪽 해변·오설록 일대 예시입니다.",
    spots: [
      { id: "j1", name: "협재해수욕장", type: "attraction" as const, duration: "약 1시간", transitToNext: "차로 10분", lat: 33.3938, lng: 126.2397 },
      { id: "j2", name: "한림공원", type: "attraction" as const, duration: "약 1시간 30분", transitToNext: "차로 25분", lat: 33.4138, lng: 126.263 },
      { id: "j3", name: "오설록 티뮤지엄", type: "cafe" as const, duration: "약 1시간", lat: 33.3064, lng: 126.2881 },
    ],
    weatherNote: "바람과 기온 변화에 유의하세요.",
    totalTime: "이동 합산 약 1시간 15분",
    alternativeNote: "비 오면 실내 전시·카페 위주로 조정.",
  };
}
