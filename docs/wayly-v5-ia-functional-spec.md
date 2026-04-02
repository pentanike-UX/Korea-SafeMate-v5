# Wayly v5 — 인포메이션 아키텍처 & 기능 정의서

> 작성 기준: 실제 배포 코드베이스 (Korea-SafeMate-v5) / 2026-04-02

---

## 1. 서비스 개요

**Wayly**는 AI 채팅 기반 국내 여행 동선 생성 서비스다. 사용자가 자연어 또는 구조화 슬롯으로 여행 조건을 입력하면, AI가 지역별 맞춤 동선(스팟 목록 + 이동 수단 + 시간 배분)을 즉시 생성한다. 생성된 동선은 지도 위에 시각화하고 저장할 수 있다.

**v3 → v5 핵심 변경점**

- 가디언 매칭, 안전 동행 기능 전면 제거
- 채팅이 유일한 진입점 (`/chat`)
- AI 응답이 단순 텍스트가 아닌 구조화된 JSON 동선 데이터
- 대화 히스토리 + 저장 플랜 Supabase 영속화
- 하이브리드 입력(칩 슬롯 + 자유 텍스트) 병행

---

## 2. 인포메이션 아키텍처

```
Wayly v5
├── / (홈)
│   ├── 지역 지도 (FullBleedAmbientMap)
│   ├── 분위기 칩 바로가기 → /chat?mood={k}
│   └── CTA 버튼 "AI 플래너 시작" → /chat
│
├── /chat (AI 채팅 플래너) ★ 핵심
│   ├── 좌측 사이드바 (lg+)
│   │   ├── 새 대화 버튼
│   │   ├── 대화 목록 (최신순, 최대 50개)
│   │   │   └── 대화 항목: 제목 / 삭제 버튼
│   │   └── 저장된 플랜 섹션
│   │       └── 플랜 카드: 지역 뱃지 / 지도 보기 버튼
│   ├── 채팅 영역
│   │   ├── 웰컴 화면 (대화 없을 때)
│   │   ├── 메시지 스레드 (user / assistant 버블)
│   │   │   └── 동선 카드 (assistant 응답 내 포함)
│   │   │       ├── 스팟 목록 (타입 아이콘 + 이름 + 소요시간)
│   │   │       ├── "동선 저장" 버튼
│   │   │       └── "지도로 보기" 버튼
│   │   └── 입력 영역 (HybridTripComposer)
│   │       ├── 모드 전환 토글 (칩 모드 / 자유 텍스트 모드)
│   │       ├── 칩 슬롯 8개 (구조화 입력)
│   │       └── 전송 버튼
│   └── 모달 레이어
│       ├── 지도 모달 (V5PlanMapModal) — MapLibre
│       ├── 요금제 모달 (V5ChatPricingModal) — 사용량 + Stripe
│       ├── 도움말 모달
│       ├── 서비스 정보 모달
│       ├── 언어 설정 모달
│       └── 계정 모달
│
├── /explore/routes (동선 탐색)
│   └── /explore/routes/{slug} (동선 상세)
│
├── /auth (인증)
│   ├── /auth/login
│   └── /auth/signup
│
└── /account (계정 설정)
    └── /account/billing (결제 관리)
```

---

## 3. 라우팅 구조

| 경로 | 레이아웃 | 설명 |
|------|---------|------|
| `/[locale]/(public)/(chat)/chat` | ChatLayout (크롬 없음) | v5 채팅 메인 |
| `/[locale]/(public)/` | PublicLayout (헤더+푸터) | 홈, 탐색 |
| `/[locale]/(auth)/` | AuthLayout | 로그인/가입 |

i18n: `next-intl`, `as-needed` 전략 (`/ko/`, `/en/` 없이 기본값 `/`)

---

## 4. AI 채팅 플로우 (2-Phase)

### Phase 1 — Gather (조건 수집)
```
사용자 입력 (자유 텍스트 or 칩)
    ↓
POST /api/v5/chat { mode: "gather", messages, slots }
    ↓
Gemini generateObject → gatherResponseSchema
    {
      assistantMessage: string,   // 추가 질문 or 확인 메시지
      chips: PreferenceChip[],    // 추출된 슬롯 칩
      readyToGenerateRoute: boolean
    }
    ↓
readyToGenerateRoute === false → Phase 1 반복 (칩 추가/수정)
readyToGenerateRoute === true  → Phase 2 자동 진입
```

### Phase 2 — Plan (동선 생성)
```
POST /api/v5/chat { mode: "plan", messages, slots }
    ↓
Gemini generateObject → planResponseSchema
    {
      assistantMessage: string,
      plan: TravelPlan {
        id, title, region, days, summary,
        spots: TravelSpot[3..12],
        weatherNote?, totalTime?, alternativeNote?
      }
    }
    ↓
동선 카드 렌더링 → "저장" / "지도 보기" 버튼 노출
```

### AI 모델 우선순위 (`POST /api/v5/chat` · 스트리밍 `POST /api/chat` 공통)
1. **Gemini** — `GEMINI_MODEL` → `GEMINI_CHAT_MODEL` → 코드 기본 모델 순
2. **OpenAI** — `OPENAI_API_KEY`가 있으면 Gemini 실패 직후 (`OPENAI_CHAT_MODEL`, 기본 `gpt-4o-mini`). 구조화 `generateObject`에서 Groq가 HTTP 400을 내는 경우가 있어 **OpenAI를 Groq보다 앞에** 둡니다.
3. **Groq** — `GROQ_API_KEY`가 있고 `shouldFallbackFromGeminiToGroq`가 참이면 OpenAI 실패·미설정 뒤 (`GROQ_CHAT_MODEL`, 기본 `openai/gpt-oss-20b`). V5 `generateObject`는 Groq `json_schema`를 쓰므로 [Structured Outputs 지원 모델](https://console.groq.com/docs/structured-outputs#supported-models)만 사용 가능(예: `llama-3.3-70b-versatile`는 미지원으로 400 발생).

`/api/chat`은 SSE 스트리밍이며, 폴백 시 `streamOpenAiTravelPlanner` → `streamGroqTravelPlanner` 순입니다.

**프로덕션**: `OPENAI_API_KEY`는 Vercel(또는 호스트) 환경 변수에 넣어야 하며, `.env.local`만 있으면 배포 URL 요청에서는 OpenAI가 호출되지 않습니다.

---

## 5. 하이브리드 입력 시스템 (HybridTripComposer)

8개 슬롯으로 구성된 구조화 입력. 칩 모드와 자유 텍스트 모드 전환 가능.

| 슬롯 ID | 레이블 | 예시 옵션 |
|--------|-------|---------|
| `region` | 여행 지역 | 제주, 부산·해운대, 경주, 서울, 강릉, 여수, 전주, 속초 … |
| `origin` | 출발지 | 서울역, 강남·신논현, 용산역, 인천공항 … |
| `destination` | 도착지 | region과 동일 옵션 |
| `schedule` | 일정 | 당일, 1박 2일, 2박 3일, 3박 4일 … |
| `people` | 인원 | 혼자, 2인, 3~4인, 가족, 단체 |
| `transport` | 이동 수단 | 자가용, 대중교통, 기차, 비행기 |
| `vibe` | 여행 분위기 | 힐링, 액티브, 미식, 감성, 역사·문화 … |
| `food` | 음식 선호 | 한식, 해산물, 카페·디저트, 특산물 … |

**최소 전송 조건**: `region` 또는 `destination` 중 하나 이상 선택 시 전송 버튼 활성화.

**왕복 로직**: `trip_departure_origin` 슬롯 감지 시 첫 스팟과 마지막 스팟을 출발지로 자동 설정.

---

## 6. 동선 데이터 스키마

```typescript
TravelSpot {
  id: string
  name: string
  type: "attraction" | "restaurant" | "cafe" | "accommodation" | "transport" | "activity" | "shopping"
  duration: string          // "약 1시간 30분"
  note?: string             // 추천 이유/팁
  transitToNext?: string    // 다음 스팟까지 이동 방법
  transitMode?: "surface" | "flight" | "ferry"
  lat?: number
  lng?: number
}

TravelPlan {
  id: string
  title: string
  region: string
  days: number
  summary: string
  spots: TravelSpot[]       // 최소 3개, 최대 12개
  weatherNote?: string
  totalTime?: string
  alternativeNote?: string
}
```

---

## 7. 스팟 정보 보강 (Wikipedia API)

동선 생성 후 스팟별 상세 정보를 비동기 보강.

```
GET /api/v5/spot-enrichment?name={스팟명}
    ↓
한국어 Wikipedia 검색 API → 제목 매칭
    ↓
Wikipedia Summary API → extract (요약) + thumbnail (이미지)
    ↓
캐시: next revalidate 24시간
```

---

## 8. 지도 모달 (V5PlanMapModal)

저장된 플랜 또는 생성된 동선의 "지도로 보기" 클릭 시 진입.

**지도 엔진**: MapLibre GL + OpenFreeMap (무료, API 키 없음, 한국어 지명 지원)

**기능**:
- 스팟 타입별 컬러 번호 마커
- 스팟 간 점선 경로 (Polyline)
- 스팟 목록 패널 (클릭 → `map.easeTo()` 애니메이션)
- 선택 스팟 툴팁 오버레이
- 레이아웃: 모바일 바텀시트 / 데스크톱 센터 모달

---

## 9. 데이터 영속화 (Supabase)

### DB 스키마

**`v5_conversations`** — 대화 세션
```sql
id            UUID PK
user_id       UUID → auth.users
title         TEXT
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ  -- 메시지 저장 시 자동 갱신 (trigger)
```

**`v5_messages`** — 채팅 메시지
```sql
id                UUID PK
conversation_id   UUID → v5_conversations (CASCADE DELETE)
role              TEXT  CHECK ('user' | 'assistant')
content           TEXT
travel_plan       JSONB  -- 동선 데이터 (assistant만 해당, nullable)
created_at        TIMESTAMPTZ
```

**`v5_saved_plans`** — 저장된 동선
```sql
id                    UUID PK
user_id               UUID → auth.users
from_conversation_id  UUID  (nullable)
plan_id               TEXT  (중복 저장 방지 체크용)
title                 TEXT
region                TEXT
plan_data             JSONB  -- 전체 TravelPlan 데이터
saved_at              TIMESTAMPTZ
```

**RLS 정책**: 모든 테이블 `auth.uid() = user_id` 조건으로 소유자만 CRUD.

### 클라이언트 전략
- `@supabase/ssr` browser client (쿠키 기반 세션)
- **Guest 모드**: 비로그인 시 메모리 only (IndexedDB/localStorage 미사용)
- **로그인 전환**: `useAuthUser()` userId 변경 감지 → DB 로드 자동 실행
- **Lazy Loading**: 대화 목록은 처음에 로드, 메시지는 대화 선택 시점에 로드
- **Optimistic Update**: UI 즉시 반영 → DB는 fire-and-forget

---

## 10. 인증 및 사용량 관리

### 인증
- Supabase Auth (이메일/소셜)
- `useAuthUser()` hook — 세션 감시, mock guardian 개발 모드 지원

### 사용량 추적 & 요금제 (V5ChatPricingModal)
| 항목 | 설명 |
|------|------|
| Gemini 요청 | 채팅 API 호출 횟수 |
| 라우팅 요청 | 경로 계산 API 호출 수 |
| Naver 지도 | 외부 지도 API 호출 수 |

사용량 경고 임계값: 50% (warn), 85% (danger)

**결제**: Stripe Checkout + Customer Portal 연동
- 무료 플랜 → 유료 플랜 업그레이드 흐름
- `/account/billing` 포털 페이지

---

## 11. 앱 셸 구조

### 데스크톱 (lg 이상)
```
┌─────────┬─────────────────────────────────────────┐
│         │                                         │
│  Icon   │            페이지 콘텐츠                  │
│  Rail   │         (WorkspaceLayout 등)             │
│ (72px)  │                                         │
└─────────┴─────────────────────────────────────────┘
```

**IconRail** (`/chat` 진입점 포함):
- 로고 (Compass 아이콘) → `/chat`
- Home 아이콘 → `/chat`
- 하단 유틸: Help / Info / 언어 / 계정

### 모바일 (lg 미만)
```
┌─────────────────────────────────────────┐
│            페이지 콘텐츠                  │
│                                         │
├─────────────────────────────────────────┤
│         하단 탭 바 (BottomTabBar)        │
└─────────────────────────────────────────┘
```

**BottomTabBar**: 단일 탭 (`/chat`)

---

## 12. 주요 환경 변수

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API |
| `GEMINI_MODEL` / `GEMINI_CHAT_MODEL` | Gemini 모델 ID (선택) |
| `GROQ_API_KEY` | Groq 폴백 (선택) |
| `GROQ_CHAT_MODEL` | Groq 모델 ID (선택) |
| `OPENAI_API_KEY` | OpenAI 폴백 (선택) |
| `OPENAI_CHAT_MODEL` | OpenAI 모델 ID (선택, 기본 `gpt-4o-mini`) |
| `STRIPE_SECRET_KEY` | Stripe 결제 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 클라이언트 |

---

## 13. 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI 라이브러리 | React 19, Tailwind CSS v4 |
| i18n | next-intl (ko/en) |
| AI SDK | Vercel AI SDK + @ai-sdk/google, @ai-sdk/groq, @ai-sdk/openai |
| DB/Auth | Supabase (@supabase/ssr) |
| 지도 | MapLibre GL + OpenFreeMap |
| 결제 | Stripe |
| 배포 | Vercel |
| 타입 검증 | Zod (API ↔ UI 공유 스키마) |

---

## 14. 미구현 / 백로그

| 항목 | 상태 |
|------|------|
| `/explore/routes` 동선 탐색 페이지 | 라우팅 존재, 콘텐츠 미구현 |
| 스팟 상세 페이지 | 미구현 |
| 소셜 공유 (카카오/링크 복사) | 미구현 |
| 푸시 알림 | 미구현 |
| 오프라인 모드 | 미구현 |
