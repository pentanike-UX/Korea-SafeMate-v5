# 06 — 데이터 스키마

## 클라이언트·API 공통 (Zod)

`src/lib/v5/travel-chat-schema.server.ts`:

- `travelPlan`: `id`, `title`, `region`, `days`, `summary`, `spots[]`, `weatherNote`, `totalTime`, `alternativeNote`.
- `spots[]`: `id`, `name`, `type` (attraction|food|cafe|transport|hotel), `duration`, `note`, `transitToNext`, `transitMode` (surface|flight|ferry), `lat`/`lng` (number | null).

## Supabase

- 마이그레이션: `supabase/migrations/*.sql`, `supabase/schema.sql` 요약.
- 대화·메시지·저장 플랜 테이블은 `v5-chat-shell` 및 API 사용처를 따라가며 확인 **(세부 컬럼은 마이그레이션 파일이 캐논)**.

## 외부 캐시

- 브라우저 `localStorage`: 게스트 대화/플랜 등 (코드 내 키 문자열 검색으로 확정 가능).

## TODO

- [ ] Wayly 관련 테이블만 발췌한 ERD 다이어그램
- [ ] RLS 정책 요약 (운영 필수)
