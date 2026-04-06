# 03 — 인포메이션 아키텍처

## 라우팅 (현재 `page.tsx` 존재 기준)

| 경로 | 파일 | 역할 |
|------|------|------|
| `/` | `[locale]/(public)/page.tsx` | 홈·진입 |
| `/chat` | `[locale]/(public)/(chat)/chat/page.tsx` | Wayly v5 채팅 메인 |
| `/login` | `[locale]/(public)/login/page.tsx` | Google 로그인 |

`next-intl` 로케일 프리픽스 정책은 앱 설정 따름 (`src/i18n`).

## v5 채팅 데이터 흐름 (요약)

```mermaid
flowchart LR
  UI[V5ChatShell] -->|POST messages / confirmRoute| API[/api/v5/chat]
  API -->|JSON| UI
  UI -->|저장| SB[(Supabase)]
  UI -->|지도| Modal[V5PlanMapModal]
  Modal --> Tour[/api/tour/spot]
  Modal --> Wiki[/api/v5/spot-enrichment]
  Modal --> Route[/api/v5/plan route 또는 fetch 클라이언트]
```

## 주요 컴포넌트 (파일 앵커)

- `src/components/v5/v5-chat-shell.tsx` — 채팅·사이드바·동선 카드·입력 독.
- `src/components/v5/v5-hybrid-trip-composer.tsx` — 8슬롯 칩, 일정 프리셋.
- `src/components/v5/v5-plan-map-modal.tsx` — MapLibre, 스팟 목록, Tour/위키 상세.
- `src/lib/v5/travel-chat-schema.server.ts` — Zod 스키마 (Groq strict 호환).

## 레거시/공존 코드

- `src/components/v4/`, `map-shell/`, `explore/` 등 — 탐색·지도 셸용. **현재 App Router 페이지는 3개뿐**이라 일부는 미연결·레거시일 수 있음 **(inferred: 미사용 트리 죽은 코드 가능)**.

## 보강 문서

- 상세 IA는 `wayly-v5-ia-functional-spec.md` (2026-04-02 기준)와 대조하되, **라우트 축소 이후는 본 문서·코드 우선**.
