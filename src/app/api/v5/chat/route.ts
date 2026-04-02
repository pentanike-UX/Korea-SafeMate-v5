import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import type { z } from "zod";
import {
  isChatProviderAbortError,
  shouldFallbackFromGeminiToGroq,
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
- 사용자가 "동선 짜줘"만 말했을 때는 정보가 부족하면 칩을 최소화하고 질문 위주로 답하세요.`;

const PLAN_SYSTEM = `당신은 한국 **로컬 동선** 설계 AI입니다. 사용자가 고른 도시·권역 **안에서만** 스팟을 이어 짭니다.

규칙:
- 반드시 한국어 assistantMessage로 요약과 팁을 제시합니다.
- plan은 실제 관광 코스처럼 스팟을 3~12개 배치합니다. **다른 도시로 이동하거나 집·역으로 복귀하는 구간은 넣지 않습니다.**
- spots[].transitToNext: 스팟 사이 이동(도보/버스/지하철/택시/차 등)과 대략 소요 시간을 적습니다.
- spots[].transitMode: **선택**. 다음 스팟까지 이동이 항공이면 \`flight\`, 여객선·페리면 \`ferry\`, 그 외(도로·도보)는 생략하거나 \`surface\`.
- 각 스팟의 lat, lng는 **반드시** WGS84 실제 좌표(소수)로 채웁니다. 한국 내 장소는 위도 약 33~38, 경도 약 124~132 범위를 벗어나면 안 됩니다.
- weatherNote, alternativeNote, totalTime을 가능하면 채웁니다.`;

function formatHistory(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "사용자" : "어시스턴트"}: ${m.content}`)
    .join("\n\n");
}

/** `GEMINI_MODEL` → 없으면 `GEMINI_CHAT_MODEL` → 기본은 스트리밍 `/api/chat`과 동일 */
function model() {
  const id =
    process.env.GEMINI_MODEL?.trim() ||
    process.env.GEMINI_CHAT_MODEL?.trim() ||
    "gemini-3-flash-preview";
  return google(id);
}

/** Groq 무료 티어 백업 — `GROQ_CHAT_MODEL`로 재정의 (기본 llama-3.3-70b-versatile) */
function groqChatModel() {
  const id = process.env.GROQ_CHAT_MODEL?.trim() || "llama-3.3-70b-versatile";
  return groq(id);
}

/** OpenAI 백업 — `OPENAI_CHAT_MODEL`로 재정의 (기본 gpt-4o-mini, structured 출력에 적합) */
function openaiChatModel() {
  const id = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
  return openai(id);
}

async function generateObjectGeminiGroqOrOpenai<S extends z.ZodType>(args: {
  schema: S;
  system: string;
  prompt: string;
  temperature: number;
}): Promise<{ object: z.infer<S> }> {
  try {
    return await generateObject({
      model: model(),
      schema: args.schema,
      system: args.system,
      prompt: args.prompt,
      temperature: args.temperature,
    });
  } catch (geminiErr) {
    if (isChatProviderAbortError(geminiErr)) throw geminiErr;

    let lastErr: unknown = geminiErr;

    if (shouldFallbackFromGeminiToGroq(geminiErr)) {
      try {
        console.warn("[v5/chat] Gemini generateObject failed, falling back to Groq:", geminiErr);
        return await generateObject({
          model: groqChatModel(),
          schema: args.schema,
          system: args.system,
          prompt: args.prompt,
          temperature: args.temperature,
        });
      } catch (groqErr) {
        if (isChatProviderAbortError(groqErr)) throw groqErr;
        lastErr = groqErr;
        console.warn("[v5/chat] Groq generateObject failed:", groqErr);
      }
    }

    if (process.env.OPENAI_API_KEY?.trim()) {
      console.warn("[v5/chat] Falling back to OpenAI:", lastErr);
      return await generateObject({
        model: openaiChatModel(),
        schema: args.schema,
        system: args.system,
        prompt: args.prompt,
        temperature: args.temperature,
      });
    }

    throw lastErr;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as ChatMessage[];
    const confirmRoute = body.confirmRoute as
      | { slots: Array<{ id: string; label: string; value: string; category?: string }> }
      | undefined;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return jsonResponse(fallbackNoKey(messages, confirmRoute));
    }

    if (confirmRoute?.slots?.length) {
      const slotText = confirmRoute.slots
        .map((s) => `- ${s.label}: ${s.value}${s.category ? ` (${s.category})` : ""}`)
        .join("\n");

      const history = formatHistory(messages.slice(-24));

      const { object } = await generateObjectGeminiGroqOrOpenai({
        schema: planResponseSchema,
        system: PLAN_SYSTEM,
        prompt: `아래는 지금까지의 대화 맥락입니다.\n\n${history || "(이전 맥락 없음)"}\n\n---\n사용자가 다음 여행 조건을 확정했습니다. **같은 도시·권역 안에서만** 스팟을 이은 로컬 동선을 plan으로 구조화하세요. 다른 도시로 이동하거나 집·역으로 복귀하는 구간은 넣지 마세요.\n\n${slotText}`,
        temperature: 0.6,
      });

      const sbPlan = await getServerSupabaseForUser();
      const uidPlan = await getSessionUserId();
      if (uidPlan && sbPlan) {
        const promptLen =
          (history?.length ?? 0) + slotText.length + PLAN_SYSTEM.length + 400;
        recordWaylyUsageFireAndForget(sbPlan, {
          geminiGenerations: 1,
          geminiEstInputTokens: Math.ceil(promptLen / 4),
          geminiEstOutputTokens: Math.ceil(JSON.stringify(object).length / 4),
        });
      }

      return jsonResponse({
        content: object.assistantMessage,
        preferenceChips: null,
        readyToGenerateRoute: false,
        travelPlan: object.plan,
        usedMock: false,
      });
    }

    const history = formatHistory(messages.slice(-24));
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const { object } = await generateObjectGeminiGroqOrOpenai({
      schema: gatherResponseSchema,
      system: GATHER_SYSTEM,
      prompt: `대화 맥락:\n\n${history || "(첫 메시지)"}\n\n---\n마지막 사용자 발화:\n${lastUser}\n\n위를 반영해 assistantMessage, chips, readyToGenerateRoute를 생성하세요.`,
      temperature: 0.5,
    });

    const sbGather = await getServerSupabaseForUser();
    const uidGather = await getSessionUserId();
    if (uidGather && sbGather) {
      const promptLen =
        (history?.length ?? 0) + lastUser.length + GATHER_SYSTEM.length + 400;
      recordWaylyUsageFireAndForget(sbGather, {
        geminiGenerations: 1,
        geminiEstInputTokens: Math.ceil(promptLen / 4),
        geminiEstOutputTokens: Math.ceil(JSON.stringify(object).length / 4),
      });
    }

    return jsonResponse({
      content: object.assistantMessage,
      preferenceChips: object.chips,
      readyToGenerateRoute: object.readyToGenerateRoute,
      travelPlan: null,
      usedMock: false,
    });
  } catch (e) {
    console.error("[v5/chat]", e);
    return jsonResponse({
      content:
        "일시적으로 응답을 만들지 못했어요. 잠시 후 다시 시도해 주세요. (Gemini·Groq·OpenAI API 키와 모델 설정을 확인해 주세요.)",
      preferenceChips: [],
      readyToGenerateRoute: false,
      travelPlan: null,
      usedMock: true,
      error: e instanceof Error ? e.message : "unknown",
    });
  }
}

function jsonResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
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
          "경주 2박 3일 여행 동선 예시입니다. (GOOGLE_GENERATIVE_AI_API_KEY를 설정하면 Gemini가 실시간으로 맞춤 동선을 만듭니다.)",
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
        "여행 API 키가 없어 예시 동선만 제공해요. Vercel·로컬 환경에 GOOGLE_GENERATIVE_AI_API_KEY를 추가해 주세요.",
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
      "안녕하세요! 한국 여행 동선을 함께 짜 드릴게요. 지역·일정·인원·교통·분위기·음식 취향을 알려주시면 칩으로 정리해 드리고, 확인 후 동선을 만들어요. (실시간 AI는 GOOGLE_GENERATIVE_AI_API_KEY 설정 시 Gemini로 동작합니다.)",
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
