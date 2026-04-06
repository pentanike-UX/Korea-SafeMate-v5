# 08 — 프롬프트 로그

## 복원 한계

- 과거 프롬프트 **원문 전체 이력**은 git에 별도 아카이브로 남아 있지 않음.
- **현재 캐논**은 소스 트리 내 문자열만 추적 가능.

## 현재 위치 (캐논)

| 용도 | 파일 | 비고 |
|------|------|------|
| V5 gather 시스템 | `src/app/api/v5/chat/route.ts` | `GATHER_SYSTEM` |
| V5 plan 시스템 | 동일 | `PLAN_SYSTEM` |
| 모델 체인 | 동일 | `V5_GEMINI_GATHER_CHAIN`, `V5_GEMINI_PLAN_CHAIN`, Groq 폴백 |

## 커밋으로 알려진 변경 (요약)

- Groq strict JSON 스키마 호환: Zod에서 `.default()` 제거, chips `category` 필수 등 (`2026-04-02` 전후 커밋 메시지).
- 지역 정확도·파주/수원 혼동 방지 문구 추가 (`PLAN_SYSTEM` — git diff로 시점 확인 가능).
- 좌표 규칙: LLM null 허용, 클라이언트 Tour 보완 언급으로 수정됨 **(최근 커밋)**.

## 앞으로 기록 방법

1. `PLAN_SYSTEM` / `GATHER_SYSTEM` 변경 시 본 문서에 **날짜 + 한 줄 요약 + 커밋 해시** 추가.
2. 또는 `scripts/log-work.sh`로 작업 로그에 “프롬프트 조정” 항목 기록.

## TODO

- [ ] 주요 프롬프트 버전을 `v1`, `v2` 식으로 태깅할지 팀 합의
