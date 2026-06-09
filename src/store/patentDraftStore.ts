import { create } from "zustand";
import { defaultDraftOptions } from "@/lib/defaultDraftOptions";
import { buildJsonWithOpenAi } from "@/lib/client/appendOpenAiFields";
import {
  buildChemicalEmbodimentFormData,
  buildMaterialsFormData
} from "@/lib/client/buildAnalyzeFormData";
import { buildSupplementChatFormData } from "@/lib/client/buildSupplementChatFormData";
import {
  clearSupplementChatBlobs,
  getSupplementChatBlob,
  removeSupplementChatBlob
} from "@/lib/client/supplementChatBlobRegistry";
import { validateMaterialsForAnalyze } from "@/lib/client/validateMaterialsUpload";
import { buildReviewSummary, buildSpecContextSummary } from "@/lib/supplement/buildSpecContextSummary";
import { ensureSectionsForSupplementUpdates } from "@/lib/supplement/ensureSectionsForSupplementUpdates";
import {
  cleanSupplementReplyForDisplay,
  coerceSupplementSectionUpdates
} from "@/lib/supplement/parseSupplementSectionUpdates";
import { formatFetchError, parseApiErrorResponse } from "@/lib/client/parseApiError";
import { assertCanRunAi } from "@/store/sessionApiKeyStore";
import {
  clearFileBlobs,
  getFileBlob,
  removeFileBlob,
  registerFileBlob,
  scheduleProjectFileRestore,
  setFileBlobProjectContext,
  waitForProjectFileRestore
} from "@/lib/client/fileBlobRegistry";
import {
  deleteAllPersistedFilesForProject,
  restoreProjectFileBlobs
} from "@/lib/client/fileBlobPersistence";
import { materialTypeToSourceType } from "@/lib/fileInput/fileInputTypes";
import {
  buildReviewSupplementInstruction,
  clearSectionReviewFlags,
  markSectionsForClaimChange,
  markSectionsForDrawingChange
} from "@/lib/claimDrawingImpact";
import { buildCurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import {
  buildLiveClaimsFromSections,
  resolveSectionConciseInstruction,
  resolveSectionRewriteInstruction
} from "@/lib/regenerateSectionContext";
import {
  shouldReplaceSectionFresh,
  streamRegenerateSectionRequest,
  type SectionRegenerateMode
} from "@/lib/client/regenerateSectionStreaming";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import { downloadBlobFile, sanitizeDownloadBaseName } from "@/lib/downloadTextFile";
import {
  buildProjectExportZip,
  importProjectBundleFromZip
} from "@/lib/client/projectExportBundle";
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
import {
  normalizeChemicalEmbodimentAnalysis,
  normalizeDrawingPrompts,
  normalizeInventionAnalysis
} from "@/lib/jsonSchema";
import { buildChemicalFormulaCatalog } from "@/lib/chemicalFormulaCatalog";
import { finalizeChemicalFormulaSectionContent } from "@/lib/chemicalFormulaContent";
import {
  clearChemicalFormulaObjectUrls,
  syncChemicalFormulaObjectUrlsFromFiles,
  unregisterChemicalFormulaFile
} from "@/lib/client/syncChemicalFormulaObjectUrls";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import { formatFullDraftMarkdown } from "@/lib/markdownFormatter";
import { createEmptySections, sectionsToSpecification, specificationToSections } from "@/lib/specificationSections";
import { buildDetailedDescriptionElaborateInstruction } from "@/prompts/drawingFigureDescription";
import { buildPostFullDraftRefinementPlan } from "@/lib/workflow/postFullDraftRefinement";
import { buildGuidedDraftPlan, type GuidedDraftSession } from "@/lib/workflow/guidedDraftPlan";
import { resetGuidedDraftAbort, requestGuidedDraftAbort } from "@/lib/workflow/guidedDraftAbort";
import {
  advanceGuidedDraftIndex,
  executeGuidedDraftStep
} from "@/lib/workflow/executeGuidedDraftStep";
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
import type {
  SupplementChatMessage,
  SupplementChatResponsePayload,
  SupplementSectionUpdate
} from "@/types/supplementChat";

function createSupplementMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

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
    markdown: state.markdown,
    supplementChatMessages: state.supplementChatMessages,
    chemicalEmbodimentAnalysis: state.chemicalEmbodimentAnalysis
  };
}

async function fetchChemicalEmbodimentAnalysis(
  get: () => PatentDraftState
): Promise<ChemicalEmbodimentAnalysis | null> {
  const state = get();
  if (!state.analysis || !isChemicalInventionEnabled(state.options.chemicalInventionEnabled)) {
    return null;
  }

  await waitForProjectFileRestore(state.currentProject.id);
  const uploadError = validateMaterialsForAnalyze(get().uploadedFiles, getFileBlob);
  if (uploadError) {
    throw new Error(uploadError);
  }

  const formData = buildChemicalEmbodimentFormData(get(), state.analysis);
  const response = await fetch("/api/analyze-chemical-embodiments", {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error(
      await parseApiErrorResponse(
        response,
        "실시예/비교예 분석에 실패했습니다",
        "fetchChemicalEmbodimentAnalysis"
      )
    );
  }
  const data = (await response.json()) as {
    chemical_embodiment_analysis: ChemicalEmbodimentAnalysis;
  };
  return normalizeChemicalEmbodimentAnalysis(data.chemical_embodiment_analysis);
}

async function applyChemicalEmbodimentStage(
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void
): Promise<void> {
  set({ loadingStage: "chemical_embodiment", error: "" });
  try {
    assertCanRunAi();
    const chemicalEmbodimentAnalysis = await fetchChemicalEmbodimentAnalysis(get);
    set((s) => ({
      chemicalEmbodimentAnalysis,
      workflow: {
        ...s.workflow,
        workflowStep: "embodiment_analyzed"
      }
    }));
    get().saveCurrentProject();
  } catch (err) {
    set({
      error: formatFetchError(
        err,
        "실시예/비교예 분석(2단계) 중 오류가 발생했습니다.",
        "runChemicalEmbodimentAnalyze"
      )
    });
  } finally {
    set({ loadingStage: "" });
  }
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
  supplementChatMessages: SupplementChatMessage[];
  supplementChatAttachments: UploadedFile[];
  chemicalEmbodimentAnalysis: ChemicalEmbodimentAnalysis | null;
  guidedDraft: GuidedDraftSession | null;

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
  exportCurrentProject: () => Promise<void>;
  importProjectBundle: (file: File) => Promise<void>;
  refreshHistory: () => void;

  runAnalyze: () => Promise<void>;
  runChemicalEmbodimentAnalyze: () => Promise<void>;
  runGenerateSpec: () => Promise<void>;
  runReview: () => Promise<void>;
  runFullDraft: () => Promise<void>;
  continueGuidedDraft: () => void;
  stopGuidedDraft: () => void;
  addClaimSection: () => void;
  addDrawingSection: () => void;
  writeDraftSection: (sectionId: string) => Promise<void>;
  regenerateSection: (
    sectionId: string,
    options?: {
      userInstruction?: string;
      mode?: "rewrite" | "elaborate" | "supplement" | "concise";
      markRelatedSectionsForReview?: "claim" | "drawing";
    }
  ) => Promise<void>;

  initSupplementChatWelcome: () => void;
  addSupplementAttachment: (file: UploadedFile) => void;
  removeSupplementAttachment: (id: string) => void;
  sendSupplementMessage: (text: string) => Promise<void>;
  applySupplementUpdates: (updates: SupplementSectionUpdate[], messageId?: string) => void;
  clearSupplementChat: () => void;

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

function applyChemicalFormulaToSections(
  sections: SpecificationSection[],
  chemicalInventionEnabled: boolean
): SpecificationSection[] {
  if (!isChemicalInventionEnabled(chemicalInventionEnabled)) return sections;
  const formulaSections = new Set([
    "detailed_description",
    "means_for_solving",
    "background_art",
    "effects"
  ]);
  return sections.map((s) => {
    if (!formulaSections.has(s.section_id) && !s.section_id.startsWith("claim_")) return s;
    if (!s.content?.includes("<img") && !s.content?.includes("chemimg:")) return s;
    return {
      ...s,
      content: finalizeChemicalFormulaSectionContent(s.content, true)
    };
  });
}

function applyFullDraftResult(
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void,
  get: () => PatentDraftState,
  result: FullDraftResult
) {
  const { options } = get();
  let sections = specificationToSections(result.specification, options.claimCount, options.drawingCount);
  sections = applyChemicalFormulaToSections(sections, options.chemicalInventionEnabled);
  if (isChemicalInventionEnabled(options.chemicalInventionEnabled)) {
    syncChemicalFormulaObjectUrlsFromFiles(
      get().uploadedFiles,
      getFileBlob,
      true
    );
  }
  set({
    analysis: normalizeInventionAnalysis(result.analysis),
    workflow: result.workflow ?? createEmptyWorkflowState(),
    specificationSections: sections,
    claims: result.claims,
    drawingPrompts: normalizeDrawingPrompts(result.drawing_prompts),
    review: result.review,
    markdown: result.markdown,
    chemicalEmbodimentAnalysis: result.chemical_embodiment_analysis
      ? normalizeChemicalEmbodimentAnalysis(result.chemical_embodiment_analysis)
      : null,
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
  userInstruction?: string,
  options?: { mode?: SectionRegenerateMode; previousContent?: string }
): Promise<void> {
  const state = get();
  if (!state.analysis) throw new Error("발명 분석이 없습니다.");
  const current = state.specificationSections.find((s) => s.section_id === sectionId);
  if (!current) return;

  const mode = options?.mode ?? "rewrite";
  const previousContent = options?.previousContent ?? current.content;
  const replaceFresh = shouldReplaceSectionFresh(mode);

  if (replaceFresh) {
    set((s) => ({
      specificationSections: s.specificationSections.map((sec) =>
        sec.section_id === sectionId ? { ...sec, content: "" } : sec
      )
    }));
  }

  const slice = {
    analysis: state.analysis,
    specificationSections: get().specificationSections,
    claims: state.claims,
    drawingPrompts: state.drawingPrompts,
    options: state.options,
    chemicalEmbodimentAnalysis: state.chemicalEmbodimentAnalysis,
    uploadedFiles: state.uploadedFiles
  };

  await streamRegenerateSectionRequest(
    slice,
    sectionId,
    { mode, userInstruction, previousContent },
    (display) => {
      const now = new Date().toISOString();
      set((s) => ({
        specificationSections: s.specificationSections.map((sec) =>
          sec.section_id === sectionId ? { ...sec, content: display, lastUpdatedAt: now } : sec
        )
      }));
    }
  );
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
              relatedClaims: buildLiveClaimsFromSections(
                get().specificationSections,
                get().claims
              ),
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
        await callRegenerateSection(get, set, "detailed_description", instruction, {
          mode: "elaborate"
        });
      } else {
        const instruction = resolveSectionRewriteInstruction(
          step.sectionId,
          { ...get(), analysis: get().analysis! },
          step.mode
        );
        await callRegenerateSection(get, set, step.sectionId, instruction, {
          mode: step.mode,
          previousContent: get().specificationSections.find((s) => s.section_id === step.sectionId)
            ?.content
        });
        if (step.sectionId.startsWith("claim_")) {
          set((s) => ({
            claims: buildLiveClaimsFromSections(s.specificationSections, s.claims)
          }));
        }
      }
    } finally {
      get().setSectionGenerating(step.sectionId, false);
    }
  }

  syncSpecificationDerived(set, get);
}

async function runGuidedDraftStepEngine(
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void
): Promise<void> {
  try {
    await executeGuidedDraftStep(
      get as () => import("@/lib/workflow/executeGuidedDraftStep").GuidedDraftStoreSlice,
      set as import("@/lib/workflow/executeGuidedDraftStep").SetState,
      {
      buildMaterialsFormData: () => buildMaterialsFormData(get()),
      buildChemicalFormData: () => {
        const state = get();
        if (!state.analysis) throw new Error("발명 분석이 없습니다.");
        return buildChemicalEmbodimentFormData(state, state.analysis);
      },
      setSectionGenerating: (sectionId, isGenerating) => get().setSectionGenerating(sectionId, isGenerating),
      onComplete: () => finishGuidedDraft(get, set)
    });
  } catch (err) {
    get().specificationSections.forEach((s) => get().setSectionGenerating(s.section_id, false));
    set((state) => ({
      error: formatFetchError(err, "단계별 작성 중 오류가 발생했습니다."),
      loadingStage: "",
      refiningProgress: "",
      guidedDraft: state.guidedDraft
        ? { ...state.guidedDraft, active: false, stopped: true, awaitingContinue: false }
        : null
    }));
  }
}

function finishGuidedDraft(
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void
): void {
  syncSpecificationDerived(set, get);
  get().supplementChatAttachments.forEach((f) => removeSupplementChatBlob(f.id));
  clearSupplementChatBlobs();
  set({
    supplementChatMessages: [],
    supplementChatAttachments: [],
    guidedDraft: null,
    loadingStage: "",
    refiningProgress: "",
    activeTab: "supplement_chat"
  });
  get().initSupplementChatWelcome();
  get().saveCurrentProject();
}

function uploadedFileAfterBlobRestore(file: UploadedFile): UploadedFile {
  const isHwp = file.extension === ".hwp" || file.extension === ".hwpx";
  let status = file.status;
  if (isHwp) {
    status = "unsupported";
  } else if (file.aiInputMode === "text_fallback") {
    status = "fallback_ready";
  } else {
    status = "native_ready";
  }
  return {
    ...file,
    fileObjectRef: file.fileObjectRef || file.id,
    analysisNotes: file.analysisNotes?.includes("히스토리")
      ? "브라우저 저장소에서 파일을 복원했습니다."
      : file.analysisNotes || "서버에서 원본 파일 기반 AI 분석을 수행합니다.",
    fallbackUsed: isHwp || file.fallbackUsed,
    status
  };
}

function scheduleUploadedFilesRestore(
  projectId: string,
  files: UploadedFile[],
  get: () => PatentDraftState,
  set: (partial: Partial<PatentDraftState> | ((state: PatentDraftState) => Partial<PatentDraftState>)) => void
): void {
  if (files.length === 0) return;
  scheduleProjectFileRestore(projectId, async () => {
    const restored = await restoreProjectFileBlobs(
      projectId,
      files.map((f) => f.id)
    );
    if (restored.size === 0) return;
    if (get().currentProject.id !== projectId) return;

    for (const [id, blob] of restored) {
      registerFileBlob(id, blob);
    }

    set((state) => {
      if (state.currentProject.id !== projectId) return state;
      const expectedIds = new Set(files.map((f) => f.id));
      const uploadedFiles = state.uploadedFiles.map((f) => {
        if (restored.has(f.id)) return uploadedFileAfterBlobRestore(f);
        if (!expectedIds.has(f.id)) return f;
        return {
          ...f,
          analysisNotes: "이 브라우저에 저장된 원본이 없습니다. 파일을 다시 업로드해 주세요.",
          fallbackUsed: true,
          status: "unsupported" as const
        };
      });
      return {
        uploadedFiles,
        input: buildInventionInput(state.currentProject, state.textInputs, uploadedFiles, state.options)
      };
    });

    syncChemicalFormulaObjectUrlsFromFiles(
      get().uploadedFiles,
      getFileBlob,
      get().options.chemicalInventionEnabled
    );
  });
}

export const usePatentDraftStore = create<PatentDraftState>((set, get) => {
  const project = createDefaultProject();
  const options = defaultOptions();
  setFileBlobProjectContext(project.id);

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
    supplementChatMessages: [],
    supplementChatAttachments: [],
    chemicalEmbodimentAnalysis: null,
    guidedDraft: null,

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
          input: buildInventionInput(state.currentProject, state.textInputs, state.uploadedFiles, options),
          ...(opts.chemicalInventionEnabled === false ? { chemicalEmbodimentAnalysis: null } : {})
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
      unregisterChemicalFormulaFile(id);
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
      resetGuidedDraftAbort();
      clearFileBlobs();
      clearSupplementChatBlobs();
      clearChemicalFormulaObjectUrls();
      const project = createDefaultProject();
      setFileBlobProjectContext(project.id);
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
        lastSavedAt: null,
        supplementChatMessages: [],
        supplementChatAttachments: [],
        chemicalEmbodimentAnalysis: null,
        guidedDraft: null
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
      void deleteAllPersistedFilesForProject(projectId);

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
      resetGuidedDraftAbort();
      const projectId = snapshot.currentProject.id;
      setFileBlobProjectContext(projectId);
      clearFileBlobs();

      const uploadedFiles = (snapshot.uploadedFiles ?? []).map((f) => ({
        ...f,
        extension: f.extension ?? "",
        sourceType: f.sourceType ?? materialTypeToSourceType(f.materialType),
        aiInputMode: f.aiInputMode ?? "text_fallback",
        fileObjectRef: f.fileObjectRef ?? f.id,
        analysisNotes:
          f.analysisNotes?.includes("히스토리") || !f.analysisNotes
            ? "저장된 파일을 불러오는 중…"
            : f.analysisNotes,
        fallbackUsed: f.fallbackUsed ?? false,
        status: (f.status ?? "native_ready") as UploadedFile["status"]
      }));
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
        lastSavedAt: snapshot.currentProject.updatedAt ?? null,
        supplementChatMessages: snapshot.supplementChatMessages ?? [],
        supplementChatAttachments: [],
        chemicalEmbodimentAnalysis: snapshot.chemicalEmbodimentAnalysis
          ? normalizeChemicalEmbodimentAnalysis(snapshot.chemicalEmbodimentAnalysis)
          : null,
        guidedDraft: null
      });
      clearSupplementChatBlobs();
      scheduleUploadedFilesRestore(projectId, uploadedFiles, get, set);
    },

    initSupplementChatWelcome: () => {
      const { supplementChatMessages } = get();
      if (supplementChatMessages.length > 0) return;
      const at = new Date().toISOString();
      set({
        supplementChatMessages: [
          {
            id: createSupplementMessageId(),
            role: "system",
            content: "명세서 초안 보완 모드입니다. 수정 요청·추가 자료를 입력하세요.",
            at
          },
          {
            id: createSupplementMessageId(),
            role: "assistant",
            content:
              "자동 작성이 완료되었습니다. 보완이 필요한 항목이나 추가 실험·비교 자료가 있으면 메시지와 파일을 보내 주세요. AI가 답변하고, 필요 시 「명세서에 반영」으로 항목을 업데이트할 수 있습니다.",
            at
          }
        ]
      });
    },

    addSupplementAttachment: (file) => {
      set((state) => ({
        supplementChatAttachments: [...state.supplementChatAttachments, file]
      }));
    },

    removeSupplementAttachment: (id) => {
      set((state) => ({
        supplementChatAttachments: state.supplementChatAttachments.filter((f) => f.id !== id)
      }));
    },

    clearSupplementChat: () => {
      get().supplementChatAttachments.forEach((f) => removeSupplementChatBlob(f.id));
      clearSupplementChatBlobs();
      set({ supplementChatMessages: [], supplementChatAttachments: [] });
      get().initSupplementChatWelcome();
    },

    applySupplementUpdates: (updates, messageId) => {
      if (!updates.length) {
        set({ error: "반영할 수정안이 없습니다." });
        return;
      }

      const state = get();
      const ensured = ensureSectionsForSupplementUpdates(
        state.specificationSections,
        updates,
        state.options,
        state.claims,
        state.drawingPrompts
      );
      const now = new Date().toISOString();
      const appliedIds: string[] = [];

      const nextSections = ensured.sections.map((s) => {
        const hit = updates.find((u) => u.section_id === s.section_id);
        if (!hit?.content?.trim()) return s;
        appliedIds.push(s.section_id);
        return { ...s, content: hit.content.trim(), lastUpdatedAt: now, isModified: true };
      });

      if (!appliedIds.length) {
        set({
          error:
            "명세서 항목을 찾지 못했습니다. AI가 제안한 section_id가 올바른지 확인하거나, 다시 요청해 주세요."
        });
        return;
      }

      set({
        specificationSections: nextSections,
        options: { ...state.options, ...ensured.options },
        claims: ensured.claims,
        drawingPrompts: ensured.drawingPrompts,
        error: "",
        supplementChatMessages: messageId
          ? state.supplementChatMessages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    appliedSectionIds: [
                      ...new Set([...(m.appliedSectionIds ?? []), ...appliedIds])
                    ]
                  }
                : m
            )
          : state.supplementChatMessages
      });
      syncSpecificationDerived(set, get);
      get().saveCurrentProject();
    },

    sendSupplementMessage: async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const state = get();
      if (!state.analysis) {
        set({ error: "먼저 발명 분석 또는 전체 자동 작성을 실행해 주세요." });
        return;
      }

      const attachmentNames = state.supplementChatAttachments.map((f) => f.name);
      const userMsg: SupplementChatMessage = {
        id: createSupplementMessageId(),
        role: "user",
        content: trimmed,
        at: new Date().toISOString(),
        attachmentNames: attachmentNames.length ? attachmentNames : undefined
      };

      set({
        supplementChatMessages: [...state.supplementChatMessages, userMsg],
        loadingStage: "supplement_chat",
        error: ""
      });

      try {
        assertCanRunAi();
        const uploadError = validateMaterialsForAnalyze(
          state.supplementChatAttachments,
          getSupplementChatBlob
        );
        if (uploadError) {
          set({ error: uploadError, loadingStage: "" });
          return;
        }

        const latest = get();
        const chatForApi = latest.supplementChatMessages.filter((m) => m.role !== "system");
        const payload = {
          projectName: latest.currentProject.title,
          messages: chatForApi.map((m) => ({ role: m.role, content: m.content })),
          specContext: buildSpecContextSummary(
            latest.specificationSections,
            latest.claims,
            latest.drawingPrompts,
            latest.analysis,
            latest.review,
            latest.chemicalEmbodimentAnalysis
          ),
          reviewSummary: buildReviewSummary(latest.review),
          options: {
            inventionMakingEnabled: latest.options.inventionMakingEnabled,
            chemicalInventionEnabled: latest.options.chemicalInventionEnabled
          },
          materials: latest.supplementChatAttachments.map((f) => ({
            fileId: f.id,
            name: f.name,
            mimeType: f.mimeType,
            extension: f.extension,
            size: f.size,
            materialType: f.materialType
          }))
        };

        const formData = buildSupplementChatFormData(
          payload,
          trimmed,
          latest.supplementChatAttachments
        );
        const response = await fetch("/api/supplement-chat", { method: "POST", body: formData });
        if (!response.ok) {
          throw new Error(
            await parseApiErrorResponse(response, "보완 채팅에 실패했습니다", "sendSupplementMessage")
          );
        }
        const data = (await response.json()) as SupplementChatResponsePayload;
        const reply = data.reply?.trim() || "응답을 받지 못했습니다.";
        const updates = coerceSupplementSectionUpdates(reply, data.section_updates);
        const assistantMsg: SupplementChatMessage = {
          id: createSupplementMessageId(),
          role: "assistant",
          content: cleanSupplementReplyForDisplay(reply, updates),
          at: new Date().toISOString(),
          sectionUpdates: updates.length ? updates : undefined
        };

        latest.supplementChatAttachments.forEach((f) => removeSupplementChatBlob(f.id));
        set({
          supplementChatMessages: [...get().supplementChatMessages, assistantMsg],
          supplementChatAttachments: []
        });
        get().saveCurrentProject();
      } catch (err) {
        set({
          error: formatFetchError(err, "보완 채팅 중 오류가 발생했습니다.", "sendSupplementMessage")
        });
      } finally {
        set({ loadingStage: "" });
      }
    },

    saveCurrentProject: () => {
      flushEditableThenSave(get, set);
    },

    exportCurrentProject: async () => {
      flushEditableThenSave(get, set);
      const state = get();
      const snapshot = getSnapshot(state);
      try {
        const zipData = await buildProjectExportZip({
          projectId: state.currentProject.id,
          snapshot,
          getMemoryFile: getFileBlob
        });
        const base = sanitizeDownloadBaseName(state.currentProject.title);
        const blob = new Blob([new Uint8Array(zipData)], { type: "application/zip" });
        downloadBlobFile(blob, `${base}.pdraft.zip`);
        set({ error: "" });
      } catch (err) {
        set({
          error: formatFetchError(err, "프로젝트보내기 중 오류가 발생했습니다.", "exportCurrentProject")
        });
      }
    },

    importProjectBundle: async (file: File) => {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const existingIds = listHistory().map((entry) => entry.id);
        const { snapshot, renamed } = await importProjectBundleFromZip(data, existingIds);
        saveHistoryEntry(snapshot);
        get().loadProject(snapshot);
        set({
          historyVersion: get().historyVersion + 1,
          error: "",
          saveHint: renamed ? "가져온 프로젝트를 새 작업으로 열었습니다" : "프로젝트를 가져왔습니다"
        });
      } catch (err) {
        set({
          error: formatFetchError(err, "프로젝트 가져오기 중 오류가 발생했습니다.", "importProjectBundle")
        });
      }
    },

    refreshHistory: () => set({ historyVersion: get().historyVersion + 1 }),

    runAnalyze: async () => {
      const state = get();
      set({ loadingStage: "analyze", error: "" });
      try {
        assertCanRunAi();
        await waitForProjectFileRestore(state.currentProject.id);
        const uploadError = validateMaterialsForAnalyze(get().uploadedFiles, getFileBlob);
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
        const analysis = normalizeInventionAnalysis(data.invention_analysis);
        const workflow = createEmptyWorkflowState();
        workflow.workflowStep = "analyzed";
        set({
          analysis,
          workflow,
          uploadedFiles,
          input,
          chemicalEmbodimentAnalysis: null,
          currentProject: {
            ...state.currentProject,
            updatedAt: new Date().toISOString(),
            status: "analysis_complete"
          },
          activeTab: "analysis"
        });

        syncChemicalFormulaObjectUrlsFromFiles(
          get().uploadedFiles,
          getFileBlob,
          get().options.chemicalInventionEnabled
        );
        get().saveCurrentProject();

        if (isChemicalInventionEnabled(get().options.chemicalInventionEnabled)) {
          await applyChemicalEmbodimentStage(get, set);
          return;
        }
      } catch (err) {
        set({ error: formatFetchError(err, "발명 분석 중 오류가 발생했습니다.", "runAnalyze") });
      } finally {
        set({ loadingStage: "" });
      }
    },

    runChemicalEmbodimentAnalyze: async () => {
      const state = get();
      if (!isChemicalInventionEnabled(state.options.chemicalInventionEnabled)) {
        set({ error: "화학 발명 옵션을 먼저 활성화해 주세요." });
        return;
      }
      if (!state.analysis) {
        set({ error: "먼저 1단계 발명 분석을 실행해 주세요." });
        return;
      }
      await applyChemicalEmbodimentStage(get, set);
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
      try {
        assertCanRunAi();
        await waitForProjectFileRestore(get().currentProject.id);
        const uploadError = validateMaterialsForAnalyze(get().uploadedFiles, getFileBlob);
        if (uploadError) {
          set({ error: uploadError });
          return;
        }

        resetGuidedDraftAbort();
        const steps = buildGuidedDraftPlan(get().options);
        set({
          guidedDraft: {
            active: true,
            stepIndex: 0,
            totalSteps: steps.length,
            steps,
            awaitingContinue: false,
            currentStepLabel: steps[0]?.label ?? "",
            focusSectionId: null,
            figureDescriptions: [],
            stopped: false
          },
          error: "",
          refiningProgress: "",
          activeTab: "analysis"
        });
        await runGuidedDraftStepEngine(get, set);
      } catch (err) {
        set({
          error: formatFetchError(err, "전체 자동 작성 중 오류가 발생했습니다."),
          guidedDraft: null,
          loadingStage: ""
        });
      }
    },

    continueGuidedDraft: () => {
      const gd = get().guidedDraft;
      if (!gd?.active || !gd.awaitingContinue || get().loadingStage === "guided_step") return;
      syncSpecificationDerived(set, get);
      get().saveCurrentProject();
      advanceGuidedDraftIndex(
        get as () => import("@/lib/workflow/executeGuidedDraftStep").GuidedDraftStoreSlice,
        set as import("@/lib/workflow/executeGuidedDraftStep").SetState
      );
      void runGuidedDraftStepEngine(get, set);
    },

    stopGuidedDraft: () => {
      requestGuidedDraftAbort();
      get().specificationSections.forEach((s) => get().setSectionGenerating(s.section_id, false));
      set((state) => ({
        guidedDraft: state.guidedDraft
          ? { ...state.guidedDraft, active: false, stopped: true, awaitingContinue: false }
          : null,
        loadingStage: "",
        refiningProgress: ""
      }));
      get().saveCurrentProject();
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
      const previousContent = current.content;

      const userInstruction =
        options?.userInstruction ??
        (mode === "supplement"
          ? buildReviewSupplementInstruction(
              sectionId,
              current,
              buildLiveClaimsFromSections(state.specificationSections, state.claims),
              state.drawingPrompts
            )
          : mode === "concise"
            ? resolveSectionConciseInstruction(
                sectionId,
                { ...state, analysis: state.analysis },
                previousContent
              )
            : resolveSectionRewriteInstruction(
                sectionId,
                { ...state, analysis: state.analysis },
                mode === "elaborate" ? "elaborate" : "rewrite"
              ));

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
                relatedClaims: buildLiveClaimsFromSections(
                  get().specificationSections,
                  get().claims
                ),
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
            buildDetailedDescriptionElaborateInstruction(figureDescriptions),
            { mode: "elaborate" }
          );
        } else {
          await callRegenerateSection(get, set, sectionId, userInstruction, {
            mode,
            previousContent
          });
        }

        if (sectionId.startsWith("claim_")) {
          set((s) => ({
            claims: buildLiveClaimsFromSections(s.specificationSections, s.claims)
          }));
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
