# 07 — API & 환경 변수

> REST 라우트는 `src/app/api/**/route.ts` 기준. **Server Action**은 HTTP URL이 아님.

## Wayly v5 (핵심)

| 엔드포인트/액션 | 인증 | 설명 |
|------------------|------|------|
| `POST /api/v5/chat` | 선택 | gather / plan JSON; `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `GROQ_API_KEY` |
| `GET /api/v5/spot-enrichment?name=&region=` | 공개 | 위키백과 요약·썸네일 |
| `GET /api/tour/spot?...` | 공개 | KorService2 키워드 검색 + 상세 (`TOUR_API_KEY`) |
| `fetchV5PlanRouteGeometry` (server action) | 세션 연동 가능 | `src/lib/v5/fetch-v5-plan-route.server.ts` — OSRM/네이버 등 `resolveDirections` |

## 채팅 (레거시/보조)

| 엔드포인트 | 설명 |
|------------|------|
| `POST /api/chat` | 스트리밍 챗; Gemini→Groq→OpenAI 폴백 흔적 (`git` / 코드) |

## 계정·Wayly 과금

- `/api/wayly/usage`, `/api/wayly/billing/*` — Stripe·사용량 (`env.example`).

## 라우팅

- `/api/routing/osrm`, `/api/routing/directions` — OSRM/네이버, 시크릿·레이트리밋 (`DIRECTIONS_INTERNAL_SECRET` 등).

## 가디언·여행자·관리자 (레거시 API 다수)

`src/app/api` 아래 `guardian/`, `traveler/`, `admin/`, `matches/`, `bookings/` 등 — **현재 App `page.tsx` 3개만 존재**하여 UI 미연결 가능성 높음 **(inferred)**. 삭제 전 사용처 grep 권장.

## 환경 변수 캐논

**`env.example`** — 키 설명·기본값·주의사항 전부 여기에 맞출 것.
