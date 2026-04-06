# 09 — 의사결정 로그 (추론 가능한 것만)

> **확실하지 않은 항목은 (추정)** 표기. 근거 없는 내용은 넣지 않음.

## ADR 작성

- 신규: `scripts/new-adr.sh`로 `docs/adr/NNN-title.md` 생성 권장.

---

### D-001 — 구조화 출력에 Groq + Zod strict (추정 근거: 커밋 메시지 + 스키마 주석)

- **맥락**: `travel-chat-schema.server.ts` 주석에 Groq `json_schema`의 required 규칙 명시.
- **결정**: optional/default 대신 빈 문자열·null을 프롬프트로 유도.
- **근거**: 커밋 `8ce4e08`, `32c3e52` 등.

### D-002 — Gemini 모델 체인 후 Groq 폴백 (추정 근거: route.ts + git)

- **맥락**: 무료 할당량·가용성.
- **결정**: gather는 가벼운 모델부터, plan은 상위 모델 우선; 429/503/404 시 체인 진행.
- **근거**: `V5_GEMINI_*_CHAIN`, 커밋 `5da3e99`, `fbbdea0`.

### D-003 — 지도: MapLibre + OpenFreeMap 스타일 (추정 근거: 코드)

- **맥락**: `v5-plan-map-modal.tsx`에서 MapLibre, Liberty 타일 URL.
- **결정**: 키 없이 베이스맵 사용; 스프라이트 누락 시 스텁 핸들러 (커밋 메시지 `c9d9583`).
- **불확실**: 초기에 MapLibre를 고른 **제품/라이선스 논의 기록**은 repo에 없음 **(추정: 비용·키 최소화)**.

### D-004 — 스팟 보강: Tour API + 위키 (추정 근거: API 파일 존재)

- **결정**: 공공 KorService2 + 위키 요약; Google Places 미사용.
- **근거**: `api/tour/spot`, `api/v5/spot-enrichment`, `wiki-spot-relevance.ts`.

### D-005 — UI에서 미사용 화면 제거 (추정 근거: 커밋)

- **근거**: `09d6f31` 메시지 “Wayly 안쓰는 기능과 화면 제거”.
- **현재**: App Router `page.tsx` 3개만 존재 — 탐색 등 일부 IA 문서와 불일치 가능.

### D-006 — 하이브리드 vs 자유 입력 세그먼트 상호 배타 (추정 근거: 코드)

- **근거**: `showHybridComposer` / `showFreeComposer` 조건 분기 (`v5-chat-shell.tsx`).

---

## 열린 질문 (기록만)

- [ ] 레거시 `api/guardian/*` 등을 단계적으로 제거할지, BFF로 유지할지
- [ ] Places API 도입 시점·소유권
