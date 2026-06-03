# 특허명세서 자동작성 MVP

국내 특허출원용 명세서 **초안**을 생성하기 위한 Next.js + TypeScript 기반 MVP입니다. 현재 구현 범위는 1차 작업으로, 타입 정의, 프롬프트 모듈, API 스켈레톤, mock LLM 응답 기반 `/api/full-draft` 워크플로우 및 최소 UI를 포함합니다.

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하면 입력 화면과 결과 탭을 확인할 수 있습니다.

## 테스트

```bash
npm test
```

## 환경 변수

`.env.example`에 다음 항목을 제공합니다. 1차 작업에서는 mock LLM을 사용하므로 값이 없어도 동작합니다.

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## 주요 API

- `POST /api/analyze`: 입력자료를 받아 발명 분석표 JSON을 반환합니다.
- `POST /api/generate-spec`: 발명 분석표와 옵션을 받아 명세서 초안 JSON 및 Markdown을 반환합니다.
- `POST /api/review`: 명세서 초안을 받아 정합성 검토 JSON을 반환합니다.
- `POST /api/full-draft`: 입력자료를 받아 분석 → 명세서 생성 → 검토 순서의 mock 워크플로우 결과를 반환합니다.

## UI 동작

입력 화면에서 프로젝트명, 발명 내용, 첨부자료, 자료 유형, 청구항 수, 도면 수, 발명 유형을 입력한 뒤 `/api/full-draft 실행` 버튼을 누릅니다. 결과는 다음 탭으로 표시됩니다.

1. 발명 분석표
2. 명세서 초안
3. 청구항
4. 도면 프롬프트
5. 정합성 검토
6. Markdown 전체 결과

Markdown 탭에는 전체 결과 복사 버튼이 포함되어 있습니다.

## 구현 파일 요약

- `src/types/patentDraft.ts`: 입력, 분석표, 명세서, 청구항, 도면 프롬프트, 검토 결과, 전체 결과 타입 정의
- `src/prompts/*.ts`: 분석, 명세서 생성, 정합성 검토 프롬프트 모듈
- `src/lib/patentDraftService.ts`: mock LLM 기반 발명 분석, 명세서 생성, 검토, full-draft 서비스
- `src/lib/markdownFormatter.ts`: 명세서 및 전체 결과 Markdown 포맷터
- `src/lib/jsonSchema.ts`: 분석표 기본값 보정 및 JSON 파싱 fallback 유틸리티
- `src/app/api/**/route.ts`: API Route 스켈레톤
- `src/app/page.tsx`, `src/components/*.tsx`: 최소 탭형 UI
- `samples/full-draft-input.json`: 개발 및 테스트용 샘플 입력자료

## 남은 TODO

- OpenAI API 실제 연동 및 모델별 JSON 응답 옵션 적용
- JSON schema 기반 응답 검증 강화
- LLM 원문 fallback을 API 응답에 노출하는 에러 UX 정리
- 사용자별 초안 저장소 또는 DB 계층 연결
- 프롬프트 회귀 테스트 및 UI 접근성 개선
