import type { TravelerReview } from "@/types/domain";

export const mockTravelerReviews: TravelerReview[] = [
  {
    id: "tr1",
    booking_id: "past1",
    traveler_user_id: "t9",
    guardian_user_id: "mg14",
    rating: 5,
    comment:
      "홍서연 님 덕분에 첫날이 한결 수월했어요. 동선 설명이 명확하고 지하철·만남 장소 짚어 주시는 게 도움이 됐습니다.",
    created_at: "2026-02-10T12:00:00.000Z",
  },
  {
    id: "tr2",
    booking_id: "past2",
    traveler_user_id: "t8",
    guardian_user_id: "mg12",
    rating: 4,
    comment:
      "식당·카페 동선이 실용적이었고 설명 투어라기보다 실행 위주로 맞춰 주셔서 좋았어요.",
    created_at: "2026-02-02T09:30:00.000Z",
  },
  {
    id: "tr3",
    booking_id: "past3",
    traveler_user_id: "t7",
    guardian_user_id: "mg14",
    rating: 5,
    comment:
      "공항·엘리베이터 동선까지 세심하게 챙겨 주셔서 가족 이동이 편했습니다.",
    created_at: "2026-01-18T11:00:00.000Z",
  },
];
