import type { TravelerReview } from "@/types/domain";

export const mockTravelerReviews: TravelerReview[] = [
  {
    id: "tr1",
    booking_id: "past1",
    traveler_user_id: "t9",
    guardian_user_id: "g1",
    rating: 5,
    comment:
      "Minseo made the first day feel manageable. Clear boundaries and very patient with transit.",
    created_at: "2026-02-10T12:00:00.000Z",
  },
  {
    id: "tr2",
    booking_id: "past2",
    traveler_user_id: "t8",
    guardian_user_id: "g2",
    rating: 4,
    comment:
      "Great execution support for shops and cafes — exactly what I needed, not a lecture tour.",
    created_at: "2026-02-02T09:30:00.000Z",
  },
  {
    id: "tr3",
    booking_id: "past3",
    traveler_user_id: "t7",
    guardian_user_id: "g1",
    rating: 5,
    comment:
      "Felt like a calm local partner — boundaries were clear and the arrival plan actually worked.",
    created_at: "2026-01-18T11:00:00.000Z",
  },
];
