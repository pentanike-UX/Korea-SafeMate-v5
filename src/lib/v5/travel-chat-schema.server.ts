import { z } from "zod";

/** API ↔ UI 공통 — 스팟·플랜 형태 */
export const spotTypeSchema = z.enum(["attraction", "food", "cafe", "transport", "hotel"]);

export const travelSpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: spotTypeSchema,
  duration: z.string(),
  note: z.string().optional(),
  transitToNext: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const travelPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  region: z.string(),
  days: z.number(),
  summary: z.string(),
  spots: z.array(travelSpotSchema).min(3).max(8),
  weatherNote: z.string().optional(),
  totalTime: z.string().optional(),
  alternativeNote: z.string().optional(),
});

export const preferenceChipSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  category: z.string().optional(),
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
