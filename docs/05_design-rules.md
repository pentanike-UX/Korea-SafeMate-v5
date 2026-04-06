# 05 — 디자인 규칙 (구현 관례)

## 원칙

1. **모바일 우선**: 터치 타깃 최소 높이(칩·버튼 ~44px) — `v5-hybrid-trip-composer` 등에서 관찰.
2. **상태 누락 금지**: 로딩(스켈레톤), 빈 상태(CTA), 에러(토스트/문구), 비활성(disabled 스타일).
3. **일관 토큰**: `var(--brand-primary)`, `var(--text-strong)` 등 CSS 변수 우선.
4. **한국어 우선 카피**: 제품 UI 문자열; i18n 키는 `messages/ko.json` 캐논.

## 컴포넌트

- 아이콘: `lucide-react`.
- 카드·버튼: shadcn 스타일 + 프로젝트 `components/ui/*`.

## 지도

- MapLibre: 마커 루트에 transform 금지 — 자식에만 스타일 (`v5-plan-map-modal` 주석 참고).

## 접근성 (현재 수준)

- 일부 `aria-label`, 시트 제목 연동. **전면 감사는 TODO.**

## Cursor 규칙 연동

- `.cursor/rules/wayly-project.mdc` — 에이전트가 UI 변경 시 본 규칙과 `04_screen-spec.md`를 참고하도록 함.
