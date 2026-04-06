# 02 — 기술 셋업

## 요구 사항

- **Node.js 20.x** (`package.json` `engines`)
- **pnpm** 10.x (`packageManager` 필드)

## 설치

```bash
pnpm install
cp env.example .env.local
# .env.local 에 필수 키 입력 (아래 참고)
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | Next 개발 서버 |
| `pnpm build` / `pnpm start` | 프로덕션 빌드·실행 |
| `pnpm check` | `tsc` + eslint (일부 경로만 — `package.json` 확인) |
| `pnpm deploy` | `deploy.sh` (마이그레이션/푸시 옵션 있음) |

## 필수/권장 환경 변수

상세 키 목록·설명은 **`env.example`** 이 캐논이다. Wayly 동선 생성 최소:

- `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `GROQ_API_KEY` (둘 다 없으면 v5 채팅은 mock/폴백 경로)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (로그인·저장)
- Tour 스팟 보강: `TOUR_API_KEY` (없으면 Tour 라우트 실패 가능)

선택: OSRM, 네이버 맵, Stripe, Wayly 한도 배율 등 — `env.example` 주석 참고.

## Next.js 16 주의

`AGENTS.md`: 학습 데이터와 다른 Next 16 규약이 있을 수 있음 → `node_modules/next/dist/docs/` 참고.

## 문서 업데이트 시점

- 새 API 라우트·환경 변수 추가 시 → `07_api-env.md` 동기화
- 마이그레이션 추가 시 → `06_data-schema.md` 동기화
