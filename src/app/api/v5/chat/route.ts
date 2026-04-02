/**
 * v5 Travel AI Chat — Streaming Route Handler
 *
 * ──────────────────────────────────────────────────────────
 * SETUP (one-time):
 *   pnpm add ai @ai-sdk/openai
 *   # or for Anthropic/Claude:
 *   pnpm add ai @ai-sdk/anthropic
 *
 * ENV VARS (add to .env.local and Vercel project):
 *   OPENAI_API_KEY=sk-...          # https://platform.openai.com/api-keys
 *   # or
 *   ANTHROPIC_API_KEY=sk-ant-...   # https://console.anthropic.com/settings/keys
 *
 * To switch model, change the import below and the model() call.
 * ──────────────────────────────────────────────────────────
 */

// ── Uncomment ONE of these after installing the SDK ──────────────────────────
// import { openai } from "@ai-sdk/openai";
// import { anthropic } from "@ai-sdk/anthropic";
// import { streamText } from "ai";
// ─────────────────────────────────────────────────────────────────────────────

const TRAVEL_SYSTEM_PROMPT = `당신은 한국 여행 전문 AI입니다. 사용자의 여행 계획을 도와주세요.

역할:
- 지역별 최적 동선을 제안하는 여행 동선 전문가
- 이동 시간, 날씨, 혼잡도, 예산을 고려한 실용적 조언 제공
- 스팟 간 이동 수단과 소요 시간을 명확히 안내
- 우천·폭염 등 환경 변수에 따른 대안 동선 제시

응답 규칙:
1. 반드시 한국어로 답변
2. 동선 제안 시 JSON 형식으로 구조화된 플랜 포함 (아래 스키마 참조)
3. 스팟은 최소 3개, 최대 8개
4. 이동 수단과 예상 소요 시간을 각 스팟 사이에 명시
5. 날씨 주의사항과 대안 동선을 항상 포함

동선 플랜 JSON 스키마 (응답 내 \`\`\`json 코드블록으로 포함):
{
  "plan": {
    "id": "plan-{region}-{timestamp}",
    "title": "동선 제목",
    "region": "지역명",
    "days": 일수(숫자),
    "summary": "2-3문장 요약",
    "spots": [
      {
        "id": "s{n}",
        "name": "스팟명",
        "type": "attraction|food|cafe|transport|hotel",
        "duration": "약 N시간",
        "note": "실용적 팁 1-2문장",
        "transitToNext": "이동수단 + 시간 (마지막 스팟은 생략)",
        "lat": 위도(숫자),
        "lng": 경도(숫자)
      }
    ],
    "weatherNote": "날씨 관련 주의사항",
    "totalTime": "총 이동시간",
    "alternativeNote": "우천·혼잡 시 대안"
  }
}`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // ── When AI SDK is installed, replace this stub with: ──────────────────────
  //
  // OpenAI 예시:
  // const result = streamText({
  //   model: openai("gpt-4o-mini"),   // 저렴하고 빠름. 품질 필요 시 "gpt-4o"
  //   system: TRAVEL_SYSTEM_PROMPT,
  //   messages,
  //   maxTokens: 2048,
  // });
  // return result.toDataStreamResponse();
  //
  // Anthropic 예시:
  // const result = streamText({
  //   model: anthropic("claude-haiku-4-5-20251001"),  // 저렴+빠름
  //   system: TRAVEL_SYSTEM_PROMPT,
  //   messages,
  //   maxTokens: 2048,
  // });
  // return result.toDataStreamResponse();
  //
  // ──────────────────────────────────────────────────────────────────────────

  // Temporary stub — returns mock response until SDK is installed
  const lastUserMessage = messages.findLast(
    (m: { role: string }) => m.role === "user"
  )?.content as string ?? "";

  const mockContent = getMockTextResponse(lastUserMessage);

  return new Response(
    JSON.stringify({ role: "assistant", content: mockContent }),
    { headers: { "Content-Type": "application/json" } }
  );
}

function getMockTextResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("경주")) {
    return "경주 2박 3일 여행 동선을 준비했어요. 불국사 → 황리단길 → 첨성대 → 동궁과 월지 순으로 구성했어요. API 키를 설정하면 실시간 AI 응답이 활성화됩니다.";
  }
  return "안녕하세요! AI API 키가 설정되면 실시간 여행 동선 제안이 시작됩니다. /api/v5/chat/route.ts 파일을 참고해 주세요.";
}
