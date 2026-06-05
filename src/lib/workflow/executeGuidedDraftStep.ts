import { buildJsonWithOpenAi } from "@/lib/client/appendOpenAiFields";
import { consumePlainTextSseStream } from "@/lib/client/consumePlainTextStream";
import { buildMaterialsFormData } from "@/lib/client/buildAnalyzeFormData";
import { parseApiErrorResponse } from "@/lib/client/parseApiError";
import { assembleSpecificationFromWorkflow } from "@/lib/workflow/assembleSpecification";
import { isGuidedDraftAborted } from "@/lib/workflow/guidedDraftAbort";
import type { GuidedDraftSession, GuidedDraftStep } from "@/lib/workflow/guidedDraftPlan";
import {
  buildLiveClaimsFromSections,
  resolveSectionRewriteInstruction
} from "@/lib/regenerateSectionContext";
import {
  buildDetailedIntroInstruction,
  buildDetailedOutroOnlyInstruction
} from "@/prompts/guidedDetailedDescription";
import { buildCurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import { normalizeDrawingPrompts, normalizeInventionAnalysis, normalizeChemicalEmbodimentAnalysis } from "@/lib/jsonSchema";
import { buildChemicalFormulaCatalog } from "@/lib/chemicalFormulaCatalog";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import { specificationToSections } from "@/lib/specificationSections";
import type {
  ClaimDraft,
  InventionAnalysis,
  SpecificationSection,
  UploadedFile
} from "@/types/patentDraft";
import type { WorkflowState } from "@/types/patentWorkflow";
import { sectionIdToType } from "@/types/specificationSection";

export interface GuidedDraftStoreSlice {
  currentProject: { id: string; title: string; updatedAt: string; status: string };
  textInputs: import("@/types/patentDraft").TextInputs;
  uploadedFiles: UploadedFile[];
  options: import("@/types/patentDraft").DraftOptions;
  analysis: InventionAnalysis | null;
  workflow: WorkflowState;
  specificationSections: SpecificationSection[];
  claims: ClaimDraft[];
  drawingPrompts: import("@/types/patentDraft").DrawingPrompt[];
  chemicalEmbodimentAnalysis: import("@/types/chemicalEmbodimentAnalysis").ChemicalEmbodimentAnalysis | null;
  activeTab: import("@/types/patentDraft").WorkspaceTab;
  loadingStage: import("@/types/patentDraft").LoadingStage;
  refiningProgress: string;
  guidedDraft: GuidedDraftSession | null;
}

export type SetState = (
  partial:
    | Partial<GuidedDraftStoreSlice>
    | ((s: GuidedDraftStoreSlice) => Partial<GuidedDraftStoreSlice>)
) => void;

type GetState = () => GuidedDraftStoreSlice;

function workflowPayload(state: GuidedDraftStoreSlice) {
  return {
    analysis: state.analysis!,
    options: state.options,
    projectName: state.currentProject.title,
    workflow: state.workflow,
    claimDrafts: state.claims.length ? state.claims : state.workflow.claimDrafts,
    drawingPlan: state.workflow.drawingPlan,
    drawingPrompts: state.drawingPrompts.length ? state.drawingPrompts : state.workflow.drawingPrompts,
    detailedDescription:
      state.specificationSections.find((s) => s.section_id === "detailed_description")?.content ??
      state.workflow.detailedDescription
  };
}

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildJsonWithOpenAi(payload)
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorResponse(response, `${url} 요청 실패`));
  }
  return (await response.json()) as T;
}

function setSectionContent(set: SetState, sectionId: string, content: string): void {
  const now = new Date().toISOString();
  set((s) => ({
    specificationSections: s.specificationSections.map((sec) =>
      sec.section_id === sectionId ? { ...sec, content, lastUpdatedAt: now } : sec
    )
  }));
}

/** 기존 본문을 유지한 채 뒤에 이어 붙임 */
function appendSectionContent(set: SetState, get: GetState, sectionId: string, addition: string): void {
  const trimmed = addition.trim();
  if (!trimmed) return;
  const current =
    get().specificationSections.find((s) => s.section_id === sectionId)?.content?.trimEnd() ?? "";
  const merged = current ? `${current}\n${trimmed}` : trimmed;
  setSectionContent(set, sectionId, merged);
}

function buildRegenerateSectionPayload(get: GetState, sectionId: string, userInstruction: string) {
  const state = get();
  if (!state.analysis) throw new Error("발명 분석이 없습니다.");
  const current = state.specificationSections.find((s) => s.section_id === sectionId);
  if (!current) throw new Error(`섹션 ${sectionId} 없음`);

  const liveClaims = buildLiveClaimsFromSections(state.specificationSections, state.claims);

  return {
    sectionId,
    sectionType: sectionIdToType(sectionId),
    currentContent: current.content,
    analysis: state.analysis,
    relatedClaims: liveClaims,
    specificationSections: state.specificationSections.map((s) => ({
      section_id: s.section_id,
      content: s.content
    })),
    userInstruction,
    drawingContext: buildCurrentDrawingContext(state.specificationSections, state.drawingPrompts),
    inventionMakingEnabled: state.options.inventionMakingEnabled,
    chemicalInventionEnabled: state.options.chemicalInventionEnabled,
    chemicalEmbodimentAnalysis: state.chemicalEmbodimentAnalysis,
    chemicalFormulaCatalog: isChemicalInventionEnabled(state.options.chemicalInventionEnabled)
      ? buildChemicalFormulaCatalog(state.uploadedFiles)
      : []
  };
}

async function regenerateSectionContent(
  get: GetState,
  set: SetState,
  sectionId: string,
  userInstruction: string,
  options?: { contentPrefix?: string }
): Promise<string> {
  const prefix = options?.contentPrefix?.trimEnd() ?? "";
  const response = await fetch("/api/regenerate-section/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildJsonWithOpenAi(buildRegenerateSectionPayload(get, sectionId, userInstruction))
  });

  return consumePlainTextSseStream(response, (streamed) => {
    const display = prefix ? `${prefix}\n${streamed}` : streamed;
    setSectionContent(set, sectionId, display);
  });
}

async function regenerateSection(
  get: GetState,
  set: SetState,
  sectionId: string,
  userInstruction: string
): Promise<void> {
  await regenerateSectionContent(get, set, sectionId, userInstruction);
}

async function streamFigureDescription(
  get: GetState,
  set: SetState,
  sectionId: string,
  figureNumber: number,
  contentPrefix: string
): Promise<string> {
  const state = get();
  const drawingSection = state.specificationSections.find((s) => s.section_id === `drawing_${figureNumber}`);
  const drawingPrompt = state.drawingPrompts.find((d) => d.figure_number === figureNumber);
  const prefix = contentPrefix.trimEnd();

  const response = await fetch("/api/generate-figure-description/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildJsonWithOpenAi({
      figureNumber,
      drawingMaterial: drawingSection?.content ?? "",
      analysis: state.analysis,
      relatedClaims: buildLiveClaimsFromSections(state.specificationSections, state.claims),
      priorFigureDescriptions: state.guidedDraft?.figureDescriptions ?? [],
      drawingPrompt
    })
  });

  return consumePlainTextSseStream(response, (streamed) => {
    const display = prefix ? `${prefix}\n${streamed}` : streamed;
    setSectionContent(set, sectionId, display);
  });
}

function applyBootstrapToState(
  set: SetState,
  get: GetState,
  workflow: WorkflowState,
  analysis: InventionAnalysis
): void {
  const { options } = get();
  const specification = assembleSpecificationFromWorkflow(workflow, analysis);
  let sections = specificationToSections(specification, options.claimCount, options.drawingCount);
  set({
    workflow,
    claims: workflow.claimDrafts,
    drawingPrompts: normalizeDrawingPrompts(workflow.drawingPrompts),
    specificationSections: sections,
    currentProject: {
      ...get().currentProject,
      title: specification.invention_title || get().currentProject.title,
      updatedAt: new Date().toISOString(),
      status: "spec_writing"
    }
  });
}

async function runAnalyzeStep(
  get: GetState,
  set: SetState,
  buildFormData: () => FormData
): Promise<void> {
  const response = await fetch("/api/analyze", { method: "POST", body: buildFormData() });
  if (!response.ok) {
    throw new Error(await parseApiErrorResponse(response, "발명 분석 실패", "guidedAnalyze"));
  }
  const data = (await response.json()) as {
    invention_analysis: InventionAnalysis;
    materials_meta?: Array<{ fileId: string; aiInputMode: UploadedFile["aiInputMode"]; fallbackUsed: boolean }>;
  };
  set({
    analysis: normalizeInventionAnalysis(data.invention_analysis),
    activeTab: "analysis"
  });
  if (data.materials_meta?.length) {
    set((s) => ({
      uploadedFiles: s.uploadedFiles.map((f) => {
        const meta = data.materials_meta!.find((m) => m.fileId === f.id);
        return meta ? { ...f, aiInputMode: meta.aiInputMode, fallbackUsed: meta.fallbackUsed } : f;
      })
    }));
  }
}

async function runChemicalStep(get: GetState, set: SetState, formData: FormData): Promise<void> {
  const response = await fetch("/api/analyze-chemical-embodiments", { method: "POST", body: formData });
  if (!response.ok) {
    throw new Error(
      await parseApiErrorResponse(response, "실시예/비교예 분석 실패", "guidedChemical")
    );
  }
  const data = (await response.json()) as {
    chemical_embodiment_analysis: import("@/types/chemicalEmbodimentAnalysis").ChemicalEmbodimentAnalysis;
  };
  set({
    chemicalEmbodimentAnalysis: normalizeChemicalEmbodimentAnalysis(data.chemical_embodiment_analysis)
  });
}

async function runBootstrapStep(get: GetState, set: SetState): Promise<void> {
  const state = get();
  if (!state.analysis) throw new Error("발명 분석이 없습니다.");

  let payload = workflowPayload(state);
  const claimData = await postJson<{ claimDrafts: ClaimDraft[]; workflow: WorkflowState }>(
    "/api/generate-claim-draft",
    payload
  );
  payload = { ...payload, claimDrafts: claimData.claimDrafts, workflow: claimData.workflow };

  const drawingData = await postJson<{ drawingPrompts: WorkflowState["drawingPrompts"]; workflow: WorkflowState }>(
    "/api/generate-drawing-prompts",
    payload
  );
  payload = {
    ...payload,
    drawingPrompts: drawingData.drawingPrompts,
    workflow: drawingData.workflow
  };

  const detailedData = await postJson<{ detailedDescription: string; workflow: WorkflowState }>(
    "/api/generate-detailed-description",
    payload
  );
  payload = {
    ...payload,
    detailedDescription: detailedData.detailedDescription,
    workflow: detailedData.workflow
  };

  const frontData = await postJson<{ frontSections: WorkflowState["frontSections"]; workflow: WorkflowState }>(
    "/api/generate-front-sections",
    payload
  );

  applyBootstrapToState(set, get, frontData.workflow, state.analysis);
  set({ activeTab: "spec_edit" });
}

function focusSectionIdForStep(step: GuidedDraftStep): string | null {
  if (step.sectionId) return step.sectionId;
  if (step.kind === "analyze") return null;
  if (step.kind === "chemical_embodiment") return null;
  return null;
}

export async function executeGuidedDraftStep(
  get: GetState,
  set: SetState,
  deps: {
    buildMaterialsFormData: () => FormData;
    buildChemicalFormData: () => FormData;
    onComplete: () => void;
    setSectionGenerating: (sectionId: string, isGenerating: boolean) => void;
  }
): Promise<void> {
  if (isGuidedDraftAborted()) {
    set((s) => ({
      guidedDraft: s.guidedDraft ? { ...s.guidedDraft, active: false, stopped: true, awaitingContinue: false } : null,
      loadingStage: ""
    }));
    return;
  }

  const gd = get().guidedDraft;
  if (!gd?.active || gd.awaitingContinue) return;

  const step = gd.steps[gd.stepIndex];
  if (!step) {
    deps.onComplete();
    return;
  }

  set({
    loadingStage: "guided_step",
    refiningProgress: step.label,
    guidedDraft: { ...gd, currentStepLabel: step.label, awaitingContinue: false }
  });

  const sectionId = step.sectionId;
  if (sectionId) deps.setSectionGenerating(sectionId, true);

  try {
    switch (step.kind) {
      case "analyze":
        await runAnalyzeStep(get, set, deps.buildMaterialsFormData);
        break;
      case "chemical_embodiment":
        await runChemicalStep(get, set, deps.buildChemicalFormData());
        break;
      case "bootstrap_workflow":
        await runBootstrapStep(get, set);
        break;
      case "refine_section": {
        if (!step.sectionId || !step.mode) break;
        const state = get();
        if (!state.analysis) break;
        const instruction = resolveSectionRewriteInstruction(
          step.sectionId,
          { ...state, analysis: state.analysis },
          step.mode
        );
        await regenerateSection(get, set, step.sectionId, instruction);
        if (step.sectionId.startsWith("claim_")) {
          set((s) => ({
            claims: buildLiveClaimsFromSections(s.specificationSections, s.claims)
          }));
        }
        set({ activeTab: "spec_edit" });
        break;
      }
      case "detailed_intro": {
        set((s) => ({
          specificationSections: s.specificationSections.map((sec) =>
            sec.section_id === "detailed_description"
              ? { ...sec, content: "", lastUpdatedAt: new Date().toISOString() }
              : sec
          )
        }));
        await regenerateSection(get, set, "detailed_description", buildDetailedIntroInstruction());
        set((s) => ({
          guidedDraft: s.guidedDraft
            ? { ...s.guidedDraft, figureDescriptions: [] }
            : null
        }));
        set({ activeTab: "spec_edit" });
        break;
      }
      case "detailed_figure": {
        const n = step.figureNumber!;
        const prefix =
          get().specificationSections.find((s) => s.section_id === "detailed_description")?.content?.trimEnd() ??
          "";
        const figText = await streamFigureDescription(get, set, "detailed_description", n, prefix);
        set((s) => ({
          guidedDraft: s.guidedDraft
            ? {
                ...s.guidedDraft,
                figureDescriptions: [...s.guidedDraft.figureDescriptions, figText]
              }
            : null
        }));
        set({ activeTab: "spec_edit" });
        break;
      }
      case "detailed_outro": {
        const state = get();
        const prefix =
          state.specificationSections.find((s) => s.section_id === "detailed_description")?.content?.trimEnd() ??
          "";
        await regenerateSectionContent(
          get,
          set,
          "detailed_description",
          buildDetailedOutroOnlyInstruction(state.analysis!),
          { contentPrefix: prefix }
        );
        set({ activeTab: "spec_edit" });
        break;
      }
      case "finalize":
        deps.onComplete();
        return;
      default:
        break;
    }

    if (isGuidedDraftAborted()) {
      set((s) => ({
        guidedDraft: s.guidedDraft ? { ...s.guidedDraft, active: false, stopped: true, awaitingContinue: false } : null,
        loadingStage: ""
      }));
      return;
    }

    const focusId = focusSectionIdForStep(step);
    set((s) => ({
      loadingStage: "",
      refiningProgress: "",
      guidedDraft: s.guidedDraft
        ? {
            ...s.guidedDraft,
            awaitingContinue: true,
            focusSectionId: focusId ?? step.sectionId ?? null
          }
        : null
    }));
  } catch (err) {
    set((s) => ({
      loadingStage: "",
      refiningProgress: "",
      guidedDraft: s.guidedDraft ? { ...s.guidedDraft, awaitingContinue: false } : null
    }));
    throw err;
  } finally {
    if (sectionId) deps.setSectionGenerating(sectionId, false);
  }
}

export function advanceGuidedDraftIndex(get: GetState, set: SetState): void {
  const gd = get().guidedDraft;
  if (!gd?.active) return;
  set({
    guidedDraft: {
      ...gd,
      stepIndex: gd.stepIndex + 1,
      awaitingContinue: false,
      focusSectionId: null
    }
  });
}
