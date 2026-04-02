import { z } from "zod";

/** API ↔ UI 공통 — 스팟·플랜 형태 */
export const spotTypeSchema = z.enum(["attraction", "food", "cafe", "transport", "hotel"]);

export const travelSpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: spotTypeSchema,
  duration: z.string(),
  /** Groq/OpenAI strict json_schema: optional이면 properties≠required 불일치로 400 → 빈 문자열 허용 */
  note: z.string().default(""),
  transitToNext: z.string().default(""),
  /** 도로·도보 등은 surface, 미해당 시에도 surface 기본 */
  transitMode: z.enum(["surface", "flight", "ferry"]).default("surface"),
  lat: z.number().nullable().default(null),
  lng: z.number().nullable().default(null),
});

export const travelPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  region: z.string(),
  days: z.number(),
  summary: z.string(),
  /** 왕복 시 출발·복귀 지점 + 관광 스팟으로 12개까지 가능 */
  spots: z.array(travelSpotSchema).min(3).max(12),
  weatherNote: z.string().default(""),
  totalTime: z.string().default(""),
  alternativeNote: z.string().default(""),
});

export const preferenceChipSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  /** 없으면 "" — strict json_schema에서 properties 키는 모두 required에 포함되어야 함 */
  category: z.string().default(""),
});

/** 자유 대화: 키워드 추출 + 칩 + 동선 생성 준비 여부 */
export const gatherResponseSchema = z.object({
  assistantMessage: z.string(),
  chips: z.array(preferenceChipSchema),
  readyToGenerateRoute: z.boolean(),
});

/** 확정 슬롯 기반 동선 생성 */
export const planResponseSchema = z.object({
  assistantMessage: z.string(),
  plan: travelPlanSchema,
});

export type TravelPlanZ = z.infer<typeof travelPlanSchema>;
export type PreferenceChipZ = z.infer<typeof preferenceChipSchema>;
