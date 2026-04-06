# Wayly (Korea-SafeMate-v5)

한국 **로컬 동선**을 AI 채팅으로 짜는 웹앱입니다. (브랜드명 Wayly — 패키지명은 레거시 `korea-safemate`.)

## 빠른 시작

```bash
pnpm install
cp env.example .env.local
pnpm dev
```

- Node **20**, **pnpm 10** 권장.
- 필수 키: `GOOGLE_GENERATIVE_AI_API_KEY` 또는 `GROQ_API_KEY`, Supabase 공개 키 등 — 자세한 항목은 `env.example`.

## 문서

| 문서 | 내용 |
|------|------|
| [docs/00_project-overview.md](docs/00_project-overview.md) | 개요·스택 |
| [docs/02_tech-setup.md](docs/02_tech-setup.md) | 셋업 |
| [docs/11_release-log.md](docs/11_release-log.md) | 릴리스 이력 (git 복원) |
| [docs/wayly-v5-ia-functional-spec.md](docs/wayly-v5-ia-functional-spec.md) | v5 IA (일부 레거시 경로와 불일치 가능) |

## 스크립트

- `scripts/log-work.sh` — 작업 로그
- `scripts/log-release.sh` — 릴리스 블록 추가
- `scripts/new-adr.sh` — ADR 생성

## 라이선스 / 원격

`package.json`의 `repository` URL이 구버전을 가리킬 수 있습니다. 실제 원격은 사용 중인 GitHub 저장소를 기준으로 하세요.
