import "server-only";

import { GoogleGenAI } from "@google/genai/node";

/**
 * `@google/genai`의 메인 진입 타입입니다. (문서·SDK에서 통칭하는 API 클라이언트)
 * @see https://googleapis.github.io/js-genai/
 */
export type GeminiClient = GoogleGenAI;

let singleton: GoogleGenAI | null = null;

function readApiKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || undefined;
}

/**
 * Gemini Developer API(ai.google.dev)용 싱글톤 `GoogleGenAI` 인스턴스.
 *
 * - **서버 전용**: `server-only`로 클라이언트 번들 포함을 막습니다.
 * - **Node 전용 엔트리**: `@google/genai/node`로 fs·Vertex 등 Node 런타임 구현을 사용합니다.
 * - 환경 변수 `GOOGLE_GENERATIVE_AI_API_KEY`가 없으면 `null`을 반환합니다.
 * - 백업 LLM: `GROQ_API_KEY` 등 — 일부 라우트에서 Gemini 실패 시 Groq 폴백.
 *
 * Route Handler / Server Action / 서버 컴포넌트에서만 import 하세요.
 */
export function getGeminiClient(): GeminiClient | null {
  const apiKey = readApiKey();
  if (!apiKey) return null;
  if (!singleton) {
    singleton = new GoogleGenAI({ apiKey });
  }
  return singleton;
}

/**
 * API 키가 필수인 코드 경로용. 미설정 시 명시적 오류를 던집니다.
 */
export function requireGeminiClient(): GeminiClient {
  const client = getGeminiClient();
  if (!client) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다. .env.local 또는 Vercel 환경 변수를 확인하세요.",
    );
  }
  return client;
}

/** 테스트 또는 키 교체 시에만 사용 */
export function resetGeminiClientForTests(): void {
  singleton = null;
}

/** Groq/OpenAI 폴백을 시도하면 안 되는 요청 취소 계열 오류 */
export function isChatProviderAbortError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("aborted") ||
    lower.includes("abort") ||
    lower.includes("the user aborted") ||
    lower.includes("request was aborted")
  );
}

function getErrorHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.status === "number") return e.status;
  const res = e.response as { status?: number } | undefined;
  if (typeof res?.status === "number") return res.status;
  const cause = e.cause as { status?: number } | undefined;
  if (cause && typeof cause.status === "number") return cause.status;
  return undefined;
}

/**
 * V5 등에서 Gemini **모델 체인**의 다음 단계로 넘길지 판별합니다.
 * 정책: HTTP **429·503·404** 및 동등한 할당량·일시 불가·모델 미존재 신호만 다음 Gemini로 이어갑니다.
 * (그 외 오류는 체인을 건너뛰고 Groq 등 후단으로 넘깁니다.)
 */
export function shouldAdvanceV5GeminiModelChain(error: unknown): boolean {
  if (isChatProviderAbortError(error)) return false;

  const status = getErrorHttpStatus(error);
  if (status === 429 || status === 503 || status === 404) return true;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (/\b429\b/.test(lower)) return true;
  if (/\b503\b/.test(lower)) return true;
  if (/\b404\b/.test(lower)) return true;
  if (lower.includes("resource_exhausted")) return true;
  return false;
}

/**
 * Gemini Developer API 호출이 실패했을 때 Groq 백업 호출을 시도할지 판별합니다.
 *
 * - `GROQ_API_KEY`가 없으면 항상 false.
 * - 요청 취소(Abort) 계열이면 false.
 * - 그 외에는 할당량(429)·서버 오류·일반 API 예외 등 Groq로 넘겨 개발/서비스 연속성을 우선합니다.
 *
 * @see `src/lib/groq-travel-chat.server.ts` — 스트리밍 `/api/chat` 폴백
 */
export function shouldFallbackFromGeminiToGroq(
  error: unknown,
  abortSignal?: AbortSignal,
): boolean {
  if (abortSignal?.aborted) return false;
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return false;

  if (isChatProviderAbortError(error)) return false;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  const status = (error as { status?: number })?.status;
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status === 500 || status === 502 || status === 503) return true;
  }

  if (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("exhausted")
  ) {
    return true;
  }

  return true;
}

/**
 * Gemini/OpenAI 등 1차 structured 호출이 실패한 뒤 Groq `generateObject`를 시도할지.
 * (키 있음 + 취소 계열 아님). OpenAI 실패 직후에도 동일 조건으로 Groq를 이어갈 때 사용합니다.
 */
export function canAttemptGroqStructuredFallback(
  error: unknown,
  abortSignal?: AbortSignal,
): boolean {
  if (abortSignal?.aborted) return false;
  if (!process.env.GROQ_API_KEY?.trim()) return false;
  if (isChatProviderAbortError(error)) return false;
  return true;
}
