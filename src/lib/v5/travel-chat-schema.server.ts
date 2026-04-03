import { z } from "zod";

/**
 * Groq strict `json_schema`: `properties`의 모든 키가 `required`에 있어야 함.
 * AI SDK는 Zod `isOptional()`이 true인 필드(`.optional()`, `.default()` 등)를 required에서 빼므로
 * 여기서는 **.default() 없이** 필수 필드로 두고, 모델에 빈 문자열·null을 내도록 프롬프트에서 안내합니다.
 */
/** API ↔ UI 공통 — 스팟·플랜 형태 */
export const spotTypeSchema = z.enum(["attraction", "food", "cafe", "transport", "hotel"]);

export const travelSpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: spotTypeSchema,
  duration: z.string(),
  note: z.string(),
  transitToNext: z.string(),
  transitMode: z.enum(["surface", "flight", "ferry"]),
  lat: z.union([z.number(), z.null()]),
  lng: z.union([z.number(), z.null()]),
});

export const travelPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  region: z.string(),
  days: z.number(),
  summary: z.string(),
  /** 관광 스팟 2~12개 (모델이 2개만 줄 때도 한 번 더 통과시키고, 프롬프트에서 3개 이상 권장) */
  spots: z.array(travelSpotSchema).min(2).max(12),
  weatherNote: z.string(),
  totalTime: z.string(),
  alternativeNote: z.string(),
});

export const preferenceChipSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  category: z.string(),
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
