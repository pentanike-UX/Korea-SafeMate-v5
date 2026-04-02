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
