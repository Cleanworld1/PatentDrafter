import { create } from "zustand";
import { defaultDraftOptions } from "@/lib/defaultDraftOptions";
import { buildJsonWithOpenAi } from "@/lib/client/appendOpenAiFields";
import { buildMaterialsFormData } from "@/lib/client/buildAnalyzeFormData";
import { validateMaterialsForAnalyze } from "@/lib/client/validateMaterialsUpload";
import { formatFetchError, parseApiErrorResponse } from "@/lib/client/parseApiError";
import { assertCanRunAi } from "@/store/sessionApiKeyStore";
import { clearFileBlobs, getFileBlob, removeFileBlob } from "@/lib/client/fileBlobRegistry";
import { materialTypeToSourceType } from "@/lib/fileInput/fileInputTypes";
import {
  buildReviewSupplementInstruction,
  clearSectionReviewFlags,
  markSectionsForClaimChange,
  markSectionsForDrawingChange
} from "@/lib/claimDrawingImpact";
import { buildCurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import {
  createProjectId,
  deleteHistoryEntry,
  listHistory,
  saveHistoryEntry
} from "@/lib/historyService";
import {
  getClaimSectionNumbers,
  getDrawingSectionNumbers,
  insertClaimSection,
  insertDrawingSection
} from "@/lib/specificationSectionOrder";
import { normalizeDrawingPrompts, normalizeInventionAnalysis } from "@/lib/jsonSchema";
import { formatFullDraftMarkdown } from "@/lib/markdownFormatter";
import { createEmptySections, sectionsToSpecification, specificationToSections } from "@/lib/specificationSections";
import { buildDetailedDescriptionElaborateInstruction } from "@/prompts/drawingFigureDescription";
import {
  buildPostFullDraftRefinementPlan,
  resolveRefinementInstruction
} from "@/lib/workflow/postFullDraftRefinement";
import { sectionIdToTitle, sectionIdToType } from "@/types/specificationSection";
import type {
  ClaimDraft,
  DraftOptions,
  DrawingPrompt,
  FullDraftResult,
  InventionAnalysis,
  InventionInput,
  LoadingStage,
  PatentDraftSnapshot,
  ProjectRecord,
  SpecificationReview,
  SpecificationSection,
  TextInputs,
  UploadedFile,
  WorkspaceTab
} from "@/types/patentDraft";
import { PROJECT_STATUS_LABELS } from "@/types/patentDraft";
import type { WorkflowState } from "@/types/patentWorkflow";
import { WORKFLOW_STEP_LABELS, createEmptyWorkflowState } from "@/types/patentWorkflow";

function createDefaultProject(): ProjectRecord {
  const now = new Date().toISOString();
  return {
    id: createProjectId(),
    title: "새 명세서",
    createdAt: now,
    updatedAt: now,
    status: "before_analysis"
  };
}

function defaultTextInputs(): TextInputs {
  return {
    overview: "",
    coreIdea: "",
    existingProblems: "",
    differentiators: "",
    embodimentNotes: "",
    otherNotes: ""
  };
}

function defaultOptions(): DraftOptions {
  return defaultDraftOptions();
}

function buildInventionContent(textInputs: TextInputs): string {
  const parts = [
    textInputs.overview && `발명 개요: ${textInputs.overview}`,
    textInputs.coreIdea && `핵심 아이디어: ${textInputs.coreIdea}`,
    textInputs.existingProblems && `기존 문제점: ${textInputs.existingProblems}`,
    textInputs.differentiators && `차별점: ${textInputs.differentiators}`,
    textInputs.embodimentNotes && `실시예 메모: ${textInputs.embodimentNotes}`,
    textInputs.otherNotes && `기타 참고사항: ${textInputs.otherNotes}`
  ].filter(Boolean);
  return parts.join("\n\n");
}

function buildAttachmentText(uploadedFiles: UploadedFile[]): string {
  return uploadedFiles
    .map(
      (f) =>
        `[${f.materialType}] ${f.name} (${f.aiInputMode}${f.fallbackUsed ? ", fallback" : ""})\n${f.analysisNotes}${f.extractedText ? `\n${f.extractedText}` : ""}`
    )
    .join("\n\n");
}

function buildInventionInput(
  project: ProjectRecord,
  textInputs: TextInputs,
  uploadedFiles: UploadedFile[],
  options: DraftOptions
): InventionInput {
  const primaryMaterial = uploadedFiles[0]?.materialType ?? "발명제안서";
  return {
    projectName: project.title,
    inventionContent: buildInventionContent(textInputs),
    attachmentText: buildAttachmentText(uploadedFiles),
    materialType: primaryMaterial,
    desiredClaimCount: options.claimCount,
    desiredDrawingCount: options.drawingCount,
    inventionType: options.inventionType,
    inventionMakingEnabled: options.inventionMakingEnabled
  };
}

function buildJsonPayload(state: PatentDraftState): Record<string, unknown> {
  const specification = sectionsToSpecification(state.specificationSections);
  return {
    project: state.currentProject,
    input: state.input,
    textInputs: state.textInputs,
    uploadedFiles: state.uploadedFiles.map(({ id, name, materialType, status }) => ({ id, name, materialType, status })),
    options: state.options,
    analysis: state.analysis,
    workflow: state.workflow,
    specification,
    claims: state.claims,
    drawingPrompts: state.drawingPrompts,
    review: state.review,
    markdown: state.markdown
  };
}

function getSnapshot(state: PatentDraftState): PatentDraftSnapshot {
  return {
    currentProject: state.currentProject,
    input: state.input,
    textInputs: state.textInputs,
    uploadedFiles: state.uploadedFiles,
    options: state.options,
    analysis: state.analysis,
    workflow: state.workflow,
    specificationSections: state.specificationSections,
    claims: state.claims,
    drawingPrompts: state.drawingPrompts,
    review: state.review,
    markdown: state.markdown
  };
}

let saveHintClearTimer: ReturnType<typeof setTimeout> | null = null;

function commitSave(
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void
): void {
  const state = get();
  const now = new Date().toISOString();
  const updatedProject = { ...state.currentProject, updatedAt: now };
  const snapshot = getSnapshot({
    ...state,
    currentProject: updatedProject,
    specificationSections: state.specificationSections.map((s) => ({ ...s, isModified: false }))
  });
  saveHistoryEntry(snapshot);

  const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  set({
    currentProject: updatedProject,
    specificationSections: state.specificationSections.map((s) => ({ ...s, isModified: false })),
    historyVersion: state.historyVersion + 1,
    lastSavedAt: now,
    saveHint: `저장됨 ${time}`
  });

  if (saveHintClearTimer) clearTimeout(saveHintClearTimer);
  saveHintClearTimer = setTimeout(() => {
    if (get().saveHint.startsWith("저장됨")) {
      set({ saveHint: "" });
    }
    saveHintClearTimer = null;
  }, 2500);
}

function flushEditableThenSave(
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void
): void {
  if (typeof document === "undefined") {
    commitSave(get, set);
    return;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.classList.contains("spec-section-content")) {
    active.blur();
    setTimeout(() => commitSave(get, set), 0);
    return;
  }
  commitSave(get, set);
}

interface PatentDraftState {
  currentProject: ProjectRecord;
  input: InventionInput;
  textInputs: TextInputs;
  uploadedFiles: UploadedFile[];
  options: DraftOptions;
  analysis: InventionAnalysis | null;
  workflow: WorkflowState;
  specificationSections: SpecificationSection[];
  claims: ClaimDraft[];
  drawingPrompts: DrawingPrompt[];
  review: SpecificationReview | null;
  markdown: string;
  activeTab: WorkspaceTab;
  loadingStage: LoadingStage;
  refiningProgress: string;
  error: string;
  historyVersion: number;
  lastSavedAt: string | null;
  saveHint: string;

  setProjectTitle: (title: string) => void;
  setTextInputs: (inputs: Partial<TextInputs>) => void;
  setOptions: (options: Partial<DraftOptions>) => void;
  addUploadedFile: (file: UploadedFile) => void;
  updateUploadedFile: (id: string, patch: Partial<UploadedFile>) => void;
  removeUploadedFile: (id: string) => void;
  updateUploadedFileMaterialType: (id: string, materialType: UploadedFile["materialType"]) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  updateSectionContent: (sectionId: string, content: string) => void;
  setSectionGenerating: (sectionId: string, isGenerating: boolean) => void;

  createNewProject: () => void;
  loadProject: (snapshot: PatentDraftSnapshot) => void;
  deleteHistoryProject: (projectId: string) => void;
  saveCurrentProject: () => void;
  refreshHistory: () => void;

  runAnalyze: () => Promise<void>;
  runGenerateSpec: () => Promise<void>;
  runReview: () => Promise<void>;
  runFullDraft: () => Promise<void>;
  addClaimSection: () => void;
  addDrawingSection: () => void;
  writeDraftSection: (sectionId: string) => Promise<void>;
  regenerateSection: (
    sectionId: string,
    options?: {
      userInstruction?: string;
      mode?: "rewrite" | "elaborate" | "supplement";
      markRelatedSectionsForReview?: "claim" | "drawing";
    }
  ) => Promise<void>;

  getStatusLabel: () => string;
  getWorkflowStepLabel: () => string;
  getJsonPayload: () => Record<string, unknown>;
}

function emptyReview(): SpecificationReview {
  return {
    claim_support_check: [],
    term_consistency_check: [],
    drawing_spec_consistency_check: [],
    effect_causality_check: [],
    over_narrowing_risk: [],
    over_abstraction_risk: [],
    additional_questions: []
  };
}

function applyFullDraftResult(
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void,
  get: () => PatentDraftState,
  result: FullDraftResult
) {
  const { options } = get();
  const sections = specificationToSections(result.specification, options.claimCount, options.drawingCount);
  set({
    analysis: normalizeInventionAnalysis(result.analysis),
    workflow: result.workflow ?? createEmptyWorkflowState(),
    specificationSections: sections,
    claims: result.claims,
    drawingPrompts: normalizeDrawingPrompts(result.drawing_prompts),
    review: result.review,
    markdown: result.markdown,
    currentProject: {
      ...get().currentProject,
      title: result.specification.invention_title || get().currentProject.title,
      updatedAt: new Date().toISOString(),
      status: "spec_writing"
    }
  });
}

function syncSpecificationDerived(
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void,
  get: () => PatentDraftState
) {
  const state = get();
  if (!state.analysis) return;
  const specification = sectionsToSpecification(state.specificationSections);
  const markdown = formatFullDraftMarkdown({
    analysis: state.analysis,
    specification,
    claims: specification.claims,
    drawing_prompts: specification.drawing_prompts,
    review: state.review ?? emptyReview()
  });
  set({
    claims: specification.claims,
    drawingPrompts: specification.drawing_prompts,
    markdown,
    currentProject: {
      ...state.currentProject,
      title: specification.invention_title || state.currentProject.title,
      updatedAt: new Date().toISOString(),
      status: "draft_complete"
    }
  });
}

async function callRegenerateSection(
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void,
  sectionId: string,
  userInstruction?: string
): Promise<void> {
  const state = get();
  if (!state.analysis) throw new Error("발명 분석이 없습니다.");
  const current = state.specificationSections.find((s) => s.section_id === sectionId);
  if (!current) return;

  const response = await fetch("/api/regenerate-section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildJsonWithOpenAi({
      sectionId,
      sectionType: sectionIdToType(sectionId),
      currentContent: current.content,
      analysis: state.analysis,
      relatedClaims: state.claims,
      userInstruction,
      drawingContext: buildCurrentDrawingContext(
        state.specificationSections,
        state.drawingPrompts
      ),
      inventionMakingEnabled: state.options.inventionMakingEnabled,
      chemicalInventionEnabled: state.options.chemicalInventionEnabled
    })
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorResponse(response, "섹션 재생성에 실패했습니다"));
  }
  const data = (await response.json()) as { content: string };
  const now = new Date().toISOString();
  set((state) => ({
    specificationSections: state.specificationSections.map((s) =>
      s.section_id === sectionId
        ? { ...s, content: data.content, lastUpdatedAt: now }
        : s
    )
  }));
}

async function runPostFullDraftRefinement(
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void,
  get: () => PatentDraftState
) {
  const state = get();
  if (!state.analysis) return;

  const { claimCount, drawingCount } = state.options;
  const plan = buildPostFullDraftRefinementPlan(claimCount, drawingCount);
  const figureDescriptions: string[] = [];

  for (const step of plan) {
    const label = sectionIdToTitle(step.sectionId);
    const modeLabel = step.mode === "rewrite" ? "다시 작성" : "더 구체화";
    set({ refiningProgress: `${label} — ${modeLabel}` });
    get().setSectionGenerating(step.sectionId, true);

    try {
      if (step.userInstruction === "__DETAILED_WITH_FIGURES__") {
        figureDescriptions.length = 0;
        for (let n = 1; n <= drawingCount; n += 1) {
          set({ refiningProgress: `【도 ${n}】 명세서용 상세 설명 생성 중…` });
          const drawingSection = get().specificationSections.find((s) => s.section_id === `drawing_${n}`);
          const drawingPrompt = get().drawingPrompts.find((d) => d.figure_number === n);
          const figRes = await fetch("/api/generate-figure-description", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: buildJsonWithOpenAi({
              figureNumber: n,
              drawingMaterial: drawingSection?.content ?? "",
              analysis: state.analysis,
              relatedClaims: get().claims,
              priorFigureDescriptions: [...figureDescriptions],
              drawingPrompt
            })
          });
          if (!figRes.ok) {
            throw new Error(await parseApiErrorResponse(figRes, `도 ${n} 상세 설명 생성 실패`));
          }
          const figData = (await figRes.json()) as { content: string };
          figureDescriptions.push(figData.content);
        }
        const instruction = buildDetailedDescriptionElaborateInstruction(figureDescriptions);
        await callRegenerateSection(get, set, "detailed_description", instruction);
      } else {
        const instruction = resolveRefinementInstruction(step);
        await callRegenerateSection(get, set, step.sectionId, instruction);
      }
    } finally {
      get().setSectionGenerating(step.sectionId, false);
    }
  }

  syncSpecificationDerived(set, get);
}

export const usePatentDraftStore = create<PatentDraftState>((set, get) => {
  const project = createDefaultProject();
  const options = defaultOptions();

  return {
    currentProject: project,
    input: buildInventionInput(project, defaultTextInputs(), [], options),
    textInputs: defaultTextInputs(),
    uploadedFiles: [],
    options,
    analysis: null,
    workflow: createEmptyWorkflowState(),
    specificationSections: createEmptySections(options.claimCount, options.drawingCount),
    claims: [],
    drawingPrompts: [],
    review: null,
    markdown: "",
    activeTab: "spec_edit",
    loadingStage: "",
    refiningProgress: "",
    error: "",
    historyVersion: 0,
    lastSavedAt: null,
    saveHint: "",

    setProjectTitle: (title) => {
      set((state) => ({
        currentProject: { ...state.currentProject, title, updatedAt: new Date().toISOString() },
        input: { ...state.input, projectName: title }
      }));
    },

    setTextInputs: (inputs) => {
      set((state) => {
        const textInputs = { ...state.textInputs, ...inputs };
        return {
          textInputs,
          input: buildInventionInput(state.currentProject, textInputs, state.uploadedFiles, state.options)
        };
      });
    },

    setOptions: (opts) => {
      set((state) => {
        const options = { ...state.options, ...opts };
        const claimCount = options.claimCount;
        const drawingCount = options.drawingCount;
        let sections = state.specificationSections;

        const currentClaims = sections.filter((s) => s.section_id.startsWith("claim_")).length;
        const currentDrawings = sections.filter((s) => s.section_id.startsWith("drawing_")).length;

        if (claimCount !== currentClaims || drawingCount !== currentDrawings) {
          const preserved = new Map(sections.map((s) => [s.section_id, s]));
          sections = createEmptySections(claimCount, drawingCount).map((s) => preserved.get(s.section_id) ?? s);
        }

        return {
          options,
          specificationSections: dedupeSpecificationSections(sections),
          input: buildInventionInput(state.currentProject, state.textInputs, state.uploadedFiles, options)
        };
      });
    },

    addUploadedFile: (file) => {
      set((state) => {
        const uploadedFiles = [...state.uploadedFiles, file];
        return {
          uploadedFiles,
          input: buildInventionInput(state.currentProject, state.textInputs, uploadedFiles, state.options)
        };
      });
    },

    updateUploadedFile: (id, patch) => {
      set((state) => {
        const uploadedFiles = state.uploadedFiles.map((f) => (f.id === id ? { ...f, ...patch } : f));
        return {
          uploadedFiles,
          input: buildInventionInput(state.currentProject, state.textInputs, uploadedFiles, state.options)
        };
      });
    },

    removeUploadedFile: (id) => {
      removeFileBlob(id);
      set((state) => {
        const uploadedFiles = state.uploadedFiles.filter((f) => f.id !== id);
        return {
          uploadedFiles,
          input: buildInventionInput(state.currentProject, state.textInputs, uploadedFiles, state.options)
        };
      });
    },

    updateUploadedFileMaterialType: (id, materialType) => {
      set((state) => ({
        uploadedFiles: state.uploadedFiles.map((f) =>
          f.id === id
            ? { ...f, materialType, sourceType: materialTypeToSourceType(materialType) }
            : f
        )
      }));
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    updateSectionContent: (sectionId, content) => {
      set((state) => ({
        specificationSections: state.specificationSections.map((s) =>
          s.section_id === sectionId
            ? {
                ...clearSectionReviewFlags(s),
                content,
                isModified: true,
                lastUpdatedAt: new Date().toISOString()
              }
            : s
        )
      }));
    },

    addClaimSection: () => {
      const state = get();
      if (!state.analysis) {
        set({ error: "먼저 발명 분석을 실행해 주세요." });
        return;
      }
      const base = dedupeSpecificationSections(state.specificationSections);
      const nums = getClaimSectionNumbers(base);
      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      if (base.some((s) => s.section_id === `claim_${nextNum}`)) return;
      const sections = markSectionsForClaimChange(insertClaimSection(base, nextNum), nextNum);
      set({
        specificationSections: sections,
        options: { ...state.options, claimCount: nextNum },
        claims: [
          ...state.claims,
          {
            claim_number: nextNum,
            category: "종속항",
            text: "",
            dependency: nums.length > 0 ? 1 : undefined
          }
        ],
        error: ""
      });
    },

    addDrawingSection: () => {
      const state = get();
      if (!state.analysis) {
        set({ error: "먼저 발명 분석을 실행해 주세요." });
        return;
      }
      const base = dedupeSpecificationSections(state.specificationSections);
      const nums = getDrawingSectionNumbers(base);
      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      if (base.some((s) => s.section_id === `drawing_${nextNum}`)) return;
      const sections = markSectionsForDrawingChange(insertDrawingSection(base, nextNum), nextNum);
      set({
        specificationSections: sections,
        options: { ...state.options, drawingCount: nextNum },
        drawingPrompts: [
          ...state.drawingPrompts,
          {
            figure_number: nextNum,
            title: `도면 ${nextNum}`,
            drawing_type: "시스템도",
            purpose: "",
            required_elements: [],
            relative_layout: "",
            arrows_or_connections: "",
            reference_number_guidance: "",
            style_instruction: ""
          }
        ],
        error: ""
      });
    },

    writeDraftSection: async (sectionId) => {
      const num = sectionId.startsWith("claim_")
        ? sectionId.replace("claim_", "")
        : sectionId.replace("drawing_", "");
      const label = sectionId.startsWith("claim_") ? `【청구항 ${num}】` : `【도 ${num}】`;
      const extra = sectionId.startsWith("claim_")
        ? `${label} 신규 청구항 본문만 작성하라. "청구항 ${num}." / 【청구항 ${num}】 같은 머리말은 넣지 말고, 독립항은 "…에 있어서,"로 바로 시작하라. 종속항이면 인용 청구항에 대해 "청구항 M에 있어서,"로 시작하라.`
        : `${label} 신규 도면 작성 프롬프트를 작성하라. 이미지 생성 AI가 특허 도면을 그릴 수 있도록 상세히 기재하라.`;
      await get().regenerateSection(sectionId, {
        mode: "rewrite",
        userInstruction: extra,
        markRelatedSectionsForReview: sectionId.startsWith("claim_") ? "claim" : "drawing"
      });
    },

    setSectionGenerating: (sectionId, isGenerating) => {
      set((state) => ({
        specificationSections: state.specificationSections.map((s) =>
          s.section_id === sectionId ? { ...s, isGenerating } : s
        )
      }));
    },

    createNewProject: () => {
      clearFileBlobs();
      const project = createDefaultProject();
      const options = defaultOptions();
      set({
        currentProject: project,
        textInputs: defaultTextInputs(),
        uploadedFiles: [],
        options,
        input: buildInventionInput(project, defaultTextInputs(), [], options),
        analysis: null,
        workflow: createEmptyWorkflowState(),
        specificationSections: createEmptySections(options.claimCount, options.drawingCount),
        claims: [],
        drawingPrompts: [],
        review: null,
        markdown: "",
        activeTab: "spec_edit",
        loadingStage: "",
        error: "",
        lastSavedAt: null
      });
    },

    deleteHistoryProject: (projectId) => {
      const state = get();
      const target = listHistory().find((e) => e.id === projectId);
      const label = target?.title ?? "이 작업";
      if (
        typeof window !== "undefined" &&
        !window.confirm(`"${label}"을(를) 삭제할까요?\n저장된 내용은 복구할 수 없습니다.`)
      ) {
        return;
      }

      deleteHistoryEntry(projectId);

      if (state.currentProject.id === projectId) {
        const remaining = listHistory();
        if (remaining.length > 0) {
          get().loadProject(remaining[0].snapshot);
        } else {
          get().createNewProject();
        }
      }

      set({ historyVersion: get().historyVersion + 1, error: "" });
    },

    loadProject: (snapshot) => {
      const uploadedFiles = (snapshot.uploadedFiles ?? []).map((f) => {
        const hasBlob = Boolean(getFileBlob(f.id));
        return {
          ...f,
          extension: f.extension ?? "",
          sourceType: f.sourceType ?? materialTypeToSourceType(f.materialType),
          aiInputMode: f.aiInputMode ?? "text_fallback",
          fileObjectRef: f.fileObjectRef ?? f.id,
          analysisNotes: hasBlob
            ? f.analysisNotes
            : "히스토리에서 복원됨 — 원본 분석을 위해 파일을 다시 업로드해 주세요.",
          fallbackUsed: f.fallbackUsed ?? !hasBlob,
          status: hasBlob ? (f.status ?? "native_ready") : ("unsupported" as const)
        };
      });
      set({
        currentProject: snapshot.currentProject,
        input: snapshot.input,
        textInputs: snapshot.textInputs,
        uploadedFiles,
        options: { ...defaultOptions(), ...snapshot.options },
        analysis: snapshot.analysis ? normalizeInventionAnalysis(snapshot.analysis) : null,
        workflow: snapshot.workflow ?? createEmptyWorkflowState(),
        specificationSections:
          snapshot.specificationSections.length > 0
            ? dedupeSpecificationSections(snapshot.specificationSections)
            : createEmptySections(snapshot.options.claimCount, snapshot.options.drawingCount),
        claims: snapshot.claims,
        drawingPrompts: normalizeDrawingPrompts(snapshot.drawingPrompts),
        review: snapshot.review,
        markdown: snapshot.markdown,
        activeTab: "spec_edit",
        error: "",
        lastSavedAt: snapshot.currentProject.updatedAt ?? null
      });
    },

    saveCurrentProject: () => {
      flushEditableThenSave(get, set);
    },

    refreshHistory: () => set({ historyVersion: get().historyVersion + 1 }),

    runAnalyze: async () => {
      const state = get();
      set({ loadingStage: "analyze", error: "" });
      try {
        assertCanRunAi();
        const uploadError = validateMaterialsForAnalyze(state.uploadedFiles, getFileBlob);
        if (uploadError) {
          set({ error: uploadError, loadingStage: "" });
          return;
        }
        const input = buildInventionInput(state.currentProject, state.textInputs, state.uploadedFiles, state.options);
        const formData = buildMaterialsFormData(state);
        const response = await fetch("/api/analyze", { method: "POST", body: formData });
        if (!response.ok) {
          throw new Error(
            await parseApiErrorResponse(response, "발명 분석에 실패했습니다", "runAnalyze")
          );
        }
        const data = (await response.json()) as {
          invention_analysis: InventionAnalysis;
          materials_meta?: Array<{
            fileId: string;
            aiInputMode: UploadedFile["aiInputMode"];
            fallbackUsed: boolean;
            analysisNotes: string;
            extractedText?: string;
          }>;
        };
        const uploadedFiles = data.materials_meta
          ? state.uploadedFiles.map((f) => {
              const meta = data.materials_meta?.find((m) => m.fileId === f.id);
              if (!meta) return f;
              return {
                ...f,
                aiInputMode: meta.aiInputMode,
                fallbackUsed: meta.fallbackUsed,
                analysisNotes: meta.analysisNotes,
                extractedText: meta.extractedText ?? f.extractedText,
                status: meta.fallbackUsed ? ("fallback_ready" as const) : ("native_ready" as const)
              };
            })
          : state.uploadedFiles;
        const workflow = createEmptyWorkflowState();
        workflow.workflowStep = "analyzed";
        set({
          analysis: normalizeInventionAnalysis(data.invention_analysis),
          workflow,
          uploadedFiles,
          input,
          currentProject: {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            status: "analysis_complete"
          },
          activeTab: "analysis"
        });
        get().saveCurrentProject();
      } catch (err) {
        set({ error: formatFetchError(err, "발명 분석 중 오류가 발생했습니다.", "runAnalyze") });
      } finally {
        set({ loadingStage: "" });
      }
    },

    runGenerateSpec: async () => {
      const state = get();
      if (!state.analysis) {
        set({ error: "먼저 발명 분석을 실행해 주세요." });
        return;
      }
      set({ loadingStage: "generate", error: "" });
      try {
        assertCanRunAi();
      } catch (err) {
        set({
          error: formatFetchError(err, "API Key가 필요합니다."),
          loadingStage: ""
        });
        return;
      }
      const sectionIds = get().specificationSections.map((s) => s.section_id);
      sectionIds.forEach((id) => get().setSectionGenerating(id, true));

      try {
        const input = buildInventionInput(state.currentProject, state.textInputs, state.uploadedFiles, state.options);
        const response = await fetch("/api/generate-spec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: buildJsonWithOpenAi({
            analysis: state.analysis,
            options: {
              desiredClaimCount: state.options.claimCount,
              desiredDrawingCount: state.options.drawingCount,
              projectName: state.currentProject.title
            }
          })
        });
        if (!response.ok) {
          throw new Error(await parseApiErrorResponse(response, "명세서 생성에 실패했습니다"));
        }
        const data = (await response.json()) as { specification: FullDraftResult["specification"]; markdown: string };
        const sections = specificationToSections(data.specification, state.options.claimCount, state.options.drawingCount);
        set({
          specificationSections: sections,
          claims: data.specification.claims,
          drawingPrompts: normalizeDrawingPrompts(data.specification.drawing_prompts),
          markdown: data.markdown,
          input,
          currentProject: {
            ...state.currentProject,
            title: data.specification.invention_title || state.currentProject.title,
            updatedAt: new Date().toISOString(),
            status: "spec_writing"
          },
          activeTab: "spec_edit"
        });
        get().saveCurrentProject();
      } catch (err) {
        set({ error: formatFetchError(err, "명세서 생성 중 오류가 발생했습니다.") });
      } finally {
        sectionIds.forEach((id) => get().setSectionGenerating(id, false));
        set({ loadingStage: "" });
      }
    },

    runReview: async () => {
      const state = get();
      const specification = sectionsToSpecification(state.specificationSections);
      if (!specification.invention_title && !specification.technical_field) {
        set({ error: "먼저 명세서 초안을 생성해 주세요." });
        return;
      }
      set({ loadingStage: "review", error: "" });
      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specification })
        });
        if (!response.ok) throw new Error(`정합성 검토 API 오류: ${response.status}`);
        const data = (await response.json()) as { review: SpecificationReview };
        set({
          review: data.review,
          currentProject: {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            status: "draft_complete"
          },
          activeTab: "review"
        });
        get().saveCurrentProject();
      } catch (err) {
        set({ error: formatFetchError(err, "정합성 검토 중 오류가 발생했습니다.") });
      } finally {
        set({ loadingStage: "" });
      }
    },

    runFullDraft: async () => {
      const state = get();
      set({ loadingStage: "full", refiningProgress: "", error: "", activeTab: "analysis" });

      try {
        assertCanRunAi();
        const uploadError = validateMaterialsForAnalyze(state.uploadedFiles, getFileBlob);
        if (uploadError) {
          set({ error: uploadError, loadingStage: "" });
          return;
        }
        const input = buildInventionInput(state.currentProject, state.textInputs, state.uploadedFiles, state.options);
        const formData = buildMaterialsFormData(state);
        const response = await fetch("/api/full-draft", { method: "POST", body: formData });
        if (!response.ok) {
          throw new Error(await parseApiErrorResponse(response, "전체 자동 작성에 실패했습니다"));
        }
        const result = (await response.json()) as FullDraftResult;
        applyFullDraftResult(set, get, result);
        set({ input, loadingStage: "refine" });
        await runPostFullDraftRefinement(set, get);
        set({ activeTab: "spec_edit" });
        get().saveCurrentProject();
      } catch (err) {
        set({ error: formatFetchError(err, "전체 자동 작성 중 오류가 발생했습니다.") });
      } finally {
        get().specificationSections.forEach((s) => get().setSectionGenerating(s.section_id, false));
        set({ loadingStage: "", refiningProgress: "" });
      }
    },

    regenerateSection: async (sectionId, options) => {
      const state = get();
      if (!state.analysis) {
        set({ error: "먼저 발명 분석을 실행해 주세요." });
        return;
      }
      const current = state.specificationSections.find((s) => s.section_id === sectionId);
      if (!current) return;

      const mode = options?.mode ?? "rewrite";
      const userInstruction =
        options?.userInstruction ??
        (mode === "supplement"
          ? buildReviewSupplementInstruction(
              sectionId,
              current,
              state.claims,
              state.drawingPrompts
            )
          : mode === "rewrite"
            ? resolveRefinementInstruction({ sectionId, mode: "rewrite" })
            : resolveRefinementInstruction({ sectionId, mode: "elaborate" }));

      get().setSectionGenerating(sectionId, true);
      set({ error: "" });
      try {
        assertCanRunAi();

        if (mode === "elaborate" && sectionId === "detailed_description") {
          const drawingNums = getDrawingSectionNumbers(get().specificationSections);
          const figureDescriptions: string[] = [];
          for (const n of drawingNums) {
            const drawingSection = get().specificationSections.find((s) => s.section_id === `drawing_${n}`);
            const drawingPrompt = get().drawingPrompts.find((d) => d.figure_number === n);
            const figRes = await fetch("/api/generate-figure-description", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: buildJsonWithOpenAi({
                figureNumber: n,
                drawingMaterial: drawingSection?.content ?? "",
                analysis: state.analysis,
                relatedClaims: get().claims,
                priorFigureDescriptions: [...figureDescriptions],
                drawingPrompt
              })
            });
            if (!figRes.ok) {
              throw new Error(await parseApiErrorResponse(figRes, `도 ${n} 상세 설명 생성 실패`));
            }
            const figData = (await figRes.json()) as { content: string };
            figureDescriptions.push(figData.content);
          }
          await callRegenerateSection(
            get,
            set,
            sectionId,
            buildDetailedDescriptionElaborateInstruction(figureDescriptions)
          );
        } else {
          await callRegenerateSection(get, set, sectionId, userInstruction);
        }

        syncSpecificationDerived(set, get);
        const markReview = options?.markRelatedSectionsForReview;
        const claimNum = sectionId.startsWith("claim_")
          ? Number(sectionId.replace("claim_", ""))
          : NaN;
        const figureNum = sectionId.startsWith("drawing_")
          ? Number(sectionId.replace("drawing_", ""))
          : NaN;

        set((s) => {
          let nextSections = s.specificationSections.map((sec) => {
            if (sec.section_id === sectionId) {
              const cleared = clearSectionReviewFlags(sec);
              return { ...cleared, isModified: false, isDraft: false };
            }
            return sec;
          });

          if (markReview === "claim" && !Number.isNaN(claimNum)) {
            nextSections = markSectionsForClaimChange(nextSections, claimNum);
          } else if (markReview === "drawing" && !Number.isNaN(figureNum)) {
            nextSections = markSectionsForDrawingChange(nextSections, figureNum);
          }

          return { specificationSections: nextSections };
        });
      } catch (err) {
        set({ error: formatFetchError(err, "섹션 재작성 중 오류가 발생했습니다.") });
      } finally {
        get().setSectionGenerating(sectionId, false);
      }
    },

    getStatusLabel: () => PROJECT_STATUS_LABELS[get().currentProject.status],
    getWorkflowStepLabel: () => WORKFLOW_STEP_LABELS[get().workflow.workflowStep],
    getJsonPayload: () => buildJsonPayload(get())
  };
});

export function useHistoryEntries() {
  const historyVersion = usePatentDraftStore((s) => s.historyVersion);
  void historyVersion;
  return listHistory();
}
