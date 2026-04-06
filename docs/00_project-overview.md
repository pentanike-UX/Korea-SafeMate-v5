# 00 — 프로젝트 개요

> 기준 시점: 코드베이스 스캔 + git `main` (2026-04-06 근처). 불확실한 항목은 **(inferred)** 표기.

## 서비스 한 줄

**Wayly** — 한국 **로컬 동선**(특정 도시·권역 안 스팟 순서·이동·시간)을 AI 채팅으로 생성·저장·지도로 보는 웹앱. 브랜드 상수는 `src/lib/constants.ts`의 `BRAND` (패키지명은 레거시 `korea-safemate`).

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | **Next.js 16** (App Router), **React 19** |
| 언어 | TypeScript 5 |
| 스타일 | Tailwind CSS 4, shadcn/ui 계열 컴포넌트 |
| i18n | **next-intl** (`messages/ko|en|ja.json`) |
| 인증·DB | **Supabase** (SSR 클라이언트, 대화/플랜 등) |
| AI | **Vercel AI SDK** + `@ai-sdk/google` (Gemini) + `@ai-sdk/groq` (Groq 폴백) |
| 지도 | **MapLibre GL** (기본 타일: OpenFreeMap Liberty 스타일 등) |
| 결제 | Stripe (Wayly+ — env에 키 정의, `env.example` 참고) |
| 배포 | **Vercel** 전제 (`AGENTS.md`에 Vercel 베스트 프랙티스) |

## 리포지토리 루트 구조 (요약)

```
src/app/              # Next App Router — 현재 라우트는 소수(홈·채팅·로그인)
src/components/     # v5 채팅·지도, v4/레거시 UI 혼재 가능
src/lib/            # API 클라이언트, 라우팅, v5 스키마, Tour API, Supabase 헬퍼
messages/           # next-intl 번역
supabase/migrations # DB 마이그레이션
scripts/            # 시드, 이미지 스캔, 로그 유틸(신규)
docs/               # 본 문서군 + wayly-v5-ia-functional-spec.md
env.example         # 환경 변수 캐논
AGENTS.md           # 에이전트/배포 관련 규칙
```

## 상태 관리

- **서버 상태**: Supabase (대화, 메시지, 저장 플랜 등 — `v5-chat-shell` 등에서 로드).
- **클라이언트**: React `useState` / `useMemo` / `useCallback` 중심; 별도 Redux/Zustand 없음 **(코드 기준)**.

## API 연동 흔적

- `/api/v5/chat` — 구조화 gather/plan (Gemini 체인 → Groq).
- `/api/v5/spot-enrichment` — 한국어 위키백과 요약·썸네일.
- `/api/tour/spot` — 한국관광공사 KorService2 (키워드 검색 + 상세).
- `/api/chat` — 레거시/보조 스트리밍 챗 (Groq·OpenAI 폴백 등, 코드 참고).
- `/api/routing/*`, OSRM, 네이버 맵 — `env.example` 및 `src/lib/routing` (탐색·지도 기능이 남아 있는 범위에서 사용).

## 운영 문서·자동화

| 경로 | 상태 |
|------|------|
| `docs/` | 본 시리즈(00–11) + `wayly-v5-ia-functional-spec.md` |
| `scripts/` | 시드·스캔 + `log-work.sh`, `log-release.sh`, `new-adr.sh` |
| `.github/` | **없음** (CI 워크플로 미확인) |
| `.cursor/` | 프로젝트 규칙 파일 **신규 추가** |

## 관련 문서

- `01_product-prd.md` — 제품 범위
- `02_tech-setup.md` — 로컬/빌드
- `03_information-architecture.md` — 화면·데이터 흐름
- `11_release-log.md` — 커밋 기반 릴리스 요약
