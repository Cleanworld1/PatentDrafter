# 특허명세서 자동작성 MVP

국내 특허출원용 명세서 **초안**을 생성하기 위한 Next.js + TypeScript 기반 MVP입니다. ChatGPT형 작업 환경 UI를 제공하며, mock LLM 기반 API와 localStorage 히스토리를 지원합니다.

## 실행 방법

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다.

**접속이 안 될 때 (500 / 흰 화면):** dev가 켜진 상태에서 `npm run build`를 하면 `.next` 캐시가 깨집니다.

```bash
node scripts/dev-restart.mjs   # 또는 scripts\dev-restart.cmd
node scripts/verify-localhost.mjs
```

## 테스트

```bash
npm test
```

## OpenAI API Key (서버 설정)

API Key는 **UI에서 입력하지 않습니다.** 프로젝트 루트 `.env.local`에만 설정합니다.

### 환경 변수

`.env.example` 참고:

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI Platform Secret Key |
| `OPENAI_PROJECT_ID` | `sk-proj-` Key 발급 프로젝트 ID (`proj_…`) |
| `OPENAI_MODEL` | 기본 모델 (예: `gpt-4o`, `gpt-5.2`) |
| `ALLOW_SERVER_DEFAULT_OPENAI_KEY` | (선택) 레거시; `OPENAI_API_KEY`가 있으면 자동 사용 |
| `ALLOW_MOCK_WITHOUT_OPENAI_KEY` | 개발 mock (기본 허용) |

검증: `node scripts/test-openai-env.mjs` · 모델 자동 설정: `node scripts/configure-openai.mjs proj_xxx`

### API

- `GET /api/openai/config` — 권장 모델, 서버 Key 사용 가능 여부
- 생성 API — 클라이언트는 `model`만 전달 (선택). Key는 서버 env에서만 읽음

## UI 구조

화면은 ChatGPT와 유사한 3단 레이아웃으로 구성됩니다.

```
┌──────────────┬─────────────────────────────────────────────┐
│  사이드바     │  메인 작업 영역                               │
│  (260px)     │  ┌─────────────────────┬──────────────────┐ │
│              │  │  편집 영역 (~70%)    │  세팅 패널 (360px)│ │
│  · 로고      │  │  · 탭 (명세서/분석…) │  · 파일 업로드    │ │
│  · 새 작업   │  │  · 워드형 편집기     │  · 직접 입력      │ │
│  · 히스토리  │  │                     │  · 생성 옵션      │ │
│  · 검색      │  │                     │  · 실행 버튼      │ │
└──────────────┴──┴─────────────────────┴──────────────────┘
```

### 좌측 사이드바

- 앱 이름: **Patent Draft AI**
- **+ 새 명세서 작성** 버튼
- 작업 히스토리 목록 (프로젝트명, 생성일, 작성 상태)
- 검색창으로 과거 작업 필터링
- `localStorage` 기반 저장 (`src/lib/historyService.ts`)

### 우측 메인 작업 영역

**상단 헤더**

- 프로젝트명 편집
- 현재 상태 배지 (분석 전 / 분석 완료 / 명세서 작성 중 / 초안 완료)
- 저장, Markdown 복사, JSON 보기, Export(TODO)

**왼쪽 — 편집 영역 (탭)**

| 탭 | 내용 |
|---|---|
| 명세서 편집 | A4 문서형 contenteditable 편집기, 섹션별 AI 상태·액션 |
| 발명 분석표 | AI 분석 결과 JSON |
| 청구항 | 청구항 목록 |
| 도면 프롬프트 | 도 1~N 생성 프롬프트 |
| 정합성 검토 | 청구항 지지, 용어 일관성 등 |
| 전체 Markdown | 최종 Markdown + 복사 |
| JSON | 전체 구조화 데이터 |

**오른쪽 — 세팅 패널**

- 파일 드래그앤드롭 → **원본 파일 기반 멀티모달 AI 분석** (텍스트 추출은 fallback만)
  - 이미지 (png, jpg, webp…): `image_input` — 이미지 원본을 AI에 전달
  - PDF: `pdf_input` — PDF 원본을 AI 파일 입력으로 전달
  - DOCX/PPTX: `document_input` — 문서 원본 전달 (실패 시 텍스트 fallback)
  - XLSX/CSV: `spreadsheet_input` — 표 원본 전달 (실패 시 xlsx 파싱 fallback)
  - TXT/MD: `text_fallback`
  - HWP: 지원 불가 → DOCX/PDF 변환 권장
- 직접 입력 (발명 개요, 핵심 아이디어, 기존 문제점, 차별점, 실시예 메모, 기타)
- 생성 옵션 (발명 유형, 청구항 수, 도면 수, 상세도, 청구항 스타일 등)
- 실행 버튼 (1~3단계 + 전체 자동 작성)

## 사용 방법

1. **+ 새 명세서 작성**으로 새 프로젝트를 시작합니다.
2. 오른쪽 패널에서 발명 자료를 업로드하거나 직접 입력합니다.
3. 청구항 수, 도면 수 등 옵션을 설정합니다.
4. **워크플로우 전체 자동 작성** 또는 단계별 버튼을 실행합니다.
   - 1단계: 발명 분석하기 → `POST /api/analyze` (또는 `POST /api/analyze-materials`)
   - 전체: 실제 명세서 업무 순서로 순차 실행 → `POST /api/full-draft`
   - (레거시) 목차 순 일괄 생성 → `POST /api/generate-spec`, `POST /api/review`
5. **명세서 편집** 탭에서 AI가 생성한 각 섹션을 직접 수정합니다.
6. **저장** 버튼 또는 API 실행 완료 시 히스토리에 자동 저장됩니다.
7. **Markdown 복사** 또는 **전체 Markdown** 탭에서 결과를 복사합니다.

## 원본 파일 기반 멀티모달 분석

업로드 파일은 다음 순서로 처리됩니다.

1. MIME/확장자로 `aiInputMode` 결정 (image_input, pdf_input, document_input 등)
2. OpenAI API 연동 시 **원본 파일을 멀티모달 입력**으로 첨부
3. 원본 전달이 불가한 경우에만 `fallbackExtractText` (mammoth, pdf-parse, xlsx)
4. UI에 파일별 분석 방식 표시 (예: `발명제안서.pdf — PDF 원본 분석`)

```
src/lib/fileInput/     detectFileType, prepareAiFileInput, fallbackExtractText
src/lib/ai/            openaiClient, multimodalRequestBuilder, patentDraftAiService
src/lib/client/        fileBlobRegistry, buildAnalyzeFormData
```

`.env.local`에 `OPENAI_API_KEY`와 `ALLOW_SERVER_DEFAULT_OPENAI_KEY=true`를 설정하면 멀티모달 분석이 동작합니다.

## 명세서 작성 워크플로우 (업무 순서)

최종 명세서 **출력 순서**(발명의 명칭 → … → 청구항 → 요약)와 **작성 업무 순서**는 다릅니다.

| 업무 단계 | API | workflowStep |
|---|---|---|
| 1. 자료 원본 분석 | `POST /api/analyze-materials` | `analyzed` |
| 2. 청구항 초안 | `POST /api/generate-claim-draft` | `claims_drafted` |
| 3. 도면 구성 기획 | `POST /api/generate-drawing-plan` | `drawings_planned` |
| 4. 도면 프롬프트 | `POST /api/generate-drawing-prompts` | `drawing_prompts_done` |
| 5. 청구항↔도면 정합성 | `POST /api/review-claim-drawing-consistency` | `claim_drawing_reviewed` |
| 6. 구체적인 내용 | `POST /api/generate-detailed-description` | `detailed_description_done` |
| 7. 앞부분·요약 | `POST /api/generate-front-sections` | `front_sections_done` |
| 8. 최종 검토 | `POST /api/final-review` | `final_review_done` |
| 전체 순차 실행 | `POST /api/full-draft` | (위 단계 일괄) |

핵심: **청구항·도면 프롬프트를 먼저 확정**한 뒤 【발명을 실시하기 위한 구체적인 내용】을 작성합니다.

구현: `src/lib/workflow/patentWorkflowService.ts`, 상태 타입: `src/types/patentWorkflow.ts`

## 주요 API

- `POST /api/extract-file`: (보조) 텍스트 fallback 추출 전용
- `POST /api/analyze`: **multipart/form-data** — 직접 입력 + 업로드 파일 원본 → 발명 분석표
- `POST /api/analyze-materials`: 분석 + 보호 포인트 + `workflow` 초기 상태
- `POST /api/generate-claim-draft` … `POST /api/final-review`: 워크플로우 단계별 JSON API
- `POST /api/generate-spec`: (레거시) 분석표 → 목차 순 일괄 생성
- `POST /api/review`: 명세서 초안 → 정합성 검토 JSON
- `POST /api/full-draft`: **multipart/form-data** — 워크플로우 순서로 전체 초안 생성

## 항목별 작성 노하우 (Guidelines)

명세서 각 항목은 서로 다른 작성 전략을 사용합니다 (방식 C: 전체 생성 프롬프트에 포함, 코드는 항목별 분리).

```
src/knowledge/
  patentSectionGuidelines.ts   — getSectionGuideline(), getAllSectionGuidelines()
  claimDraftingGuidelines.ts
  drawingPromptGuidelines.ts
  specificationStyleRules.ts

src/prompts/guidelines/
  titleGuideline.ts, technicalFieldGuideline.ts, … (항목별 상세 지침)

src/prompts/
  generateSpecification.ts     — buildGenerateSpecificationPrompt({ analysis, options, sectionGuidelines })
  regenerateSection.ts         — buildRegenerateSectionPrompt({ sectionType, … })
```

- `POST /api/regenerate-section`: 특정 명세서 항목만 지침 기반 재작성
- 편집기 **다시 작성** 버튼 → 해당 항목 guideline + 발명 분석표 반영

## 컴포넌트 구조

```
src/components/layout/     AppShell, Sidebar, MainWorkspace, WorkspaceHeader
src/components/history/    HistoryList, HistoryItem, NewDraftButton
src/components/editor/     SpecificationEditor, SpecificationSectionBlock, SectionActionMenu
src/components/tabs/       WorkspaceTabs, AnalysisTab, ClaimsTab, …
src/components/settings/   RightSettingsPanel, FileDropzone, DraftOptionsForm, …
src/store/                 patentDraftStore.ts (Zustand)
src/lib/                   historyService, fileExtractService, specificationSections
src/types/                 patentDraft.ts
```

## 구현 파일 요약

- `src/types/patentDraft.ts`: 도메인 타입 + UI 상태 타입
- `src/store/patentDraftStore.ts`: Zustand 전역 상태 및 API 연동
- `src/lib/historyService.ts`: localStorage 히스토리 (추후 DB 교체 가능)
- `src/lib/fileInput/*`: 파일 유형 감지, AI 입력 준비, fallback 추출
- `src/lib/ai/*`: 멀티모달 OpenAI 클라이언트, 발명 분석 서비스
- `src/lib/contentAwareAnalysis.ts`: API 미연동 시 자료 메타 기반 mock 분석
- `src/lib/specificationSections.ts`: 명세서 ↔ 섹션 블록 변환
- `src/lib/patentDraftService.ts`: mock LLM 기반 서비스
- `src/lib/workflow/patentWorkflowService.ts`: 업무 순서 기반 단계별·전체 작성
- `src/prompts/*.ts`: 분석, 명세서 생성, 정합성 검토 프롬프트
- `src/app/api/**/route.ts`: API Route

## 배포 (Vercel)

Next.js 앱이므로 [Vercel](https://vercel.com) 배포를 권장합니다. GitHub 저장소: `https://github.com/Cleanworld1/PatentDrafter`

### 1. 사전 확인

```bash
npm install
npm test
npm run build
```

`npm run build` 전에 `localhost:3000` dev 서버는 종료하세요.

### 2. Vercel 환경 변수 (Production)

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | 예 | OpenAI Secret Key |
| `OPENAI_MODEL` | 권장 | 예: `gpt-4o`, `gpt-5.4` |
| `OPENAI_PROJECT_ID` | 권장 | `proj_…` (proj Key 사용 시) |
| `OPENAI_ORG_ID` | 선택 | 조직 ID |
| `ALLOW_MOCK_WITHOUT_OPENAI_KEY` | 선택 | production에서는 `false` 권장 |
| `GEMINI_API_KEY` | 도면 자동 생성 시 | Google AI Studio API Key (Nano Banana 2) |
| `GEMINI_IMAGE_MODEL` | 선택 | 기본 `gemini-3.1-flash-image` |
| `NEXT_PUBLIC_NANO_BANANA_URL` | 선택 | Key 없을 때 AI Studio URL |

`.env.local`은 Vercel에 올라가지 않습니다. Vercel 대시보드 → Project → Settings → Environment Variables에서 설정하세요.

### 3. CLI로 배포

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

또는 Vercel 대시보드에서 GitHub `PatentDrafter` 저장소를 Import → main(또는 작업 브랜치) 연결 → Deploy.

### 4. Gemini 도면 생성 (Nano Banana 2)

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API Key 발급 (이미지 모델은 **유료 결제가 연결된 Key**가 필요할 수 있음).
2. Vercel → **Settings → Environment Variables**에 추가:
   - `GEMINI_API_KEY` = 발급한 Key (Production·Preview·Development 모두 체크 권장)
   - (선택) `GEMINI_IMAGE_MODEL` = `gemini-3.1-flash-image`
3. **Redeploy** 후 우측 패널 「도면 생성 (Nano Banana 2)」에 **서버 Key 연결됨**이 보이면, 【도 N】의 **도면 생성** 버튼이 앱에서 이미지를 만들고 PNG로 내려받습니다.
4. Key가 없으면 이전과 같이 프롬프트 복사 + AI Studio 탭이 열립니다.

로컬: `.env.local`에 동일 변수를 넣고 `npm run dev`를 재시작하세요.

### 5. 주의

- `analyze` / `full-draft` / `regenerate-section` API는 최대 **300초** 실행을 가정합니다. Vercel **Pro** 플랜(또는 동등한 함수 시간 한도)이 필요할 수 있습니다.
- `generate-drawing-image`는 최대 **120초**입니다.
- 작업 히스토리는 브라우저 `localStorage`에만 저장됩니다(서버 DB 없음).

## 남은 TODO

- OpenAI API 실제 연동
- hwp 파일 파싱
- OpenAI 연동 시 명세서·검토 단계 전면 LLM화
- Export (docx, PDF)
- DB 기반 프로젝트 저장
- 섹션별 "더 구체화", "더 간결하게", "정합성 검토" 액션
- 실시간 스트리밍 생성
- 모바일 반응형 UI
