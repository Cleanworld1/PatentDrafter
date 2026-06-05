import { buildJsonWithOpenAi } from "@/lib/client/appendOpenAiFields";
import { buildMaterialsFormData } from "@/lib/client/buildAnalyzeFormData";
import { parseApiErrorResponse } from "@/lib/client/parseApiError";
import { assembleSpecificationFromWorkflow } from "@/lib/workflow/assembleSpecification";
import { isGuidedDraftAborted } from "@/lib/workflow/guidedDraftAbort";
import type { GuidedDraftSession, GuidedDraftStep } from "@/lib/workflow/guidedDraftPlan";
import {
  getDefaultElaborateInstruction,
  getDefaultRewriteInstruction
} from "@/lib/workflow/postFullDraftRefinement";
import {
  buildDetailedFigureAppendInstruction,
  buildDetailedIntroInstruction,
  buildDetailedOutroInstruction
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

async function regenerateSection(
  get: GetState,
  set: SetState,
  sectionId: string,
  userInstruction: string
): Promise<void> {
  const state = get();
  if (!state.analysis) throw new Error("발명 분석이 없습니다.");
  const current = state.specificationSections.find((s) => s.section_id === sectionId);
  if (!current) throw new Error(`섹션 ${sectionId} 없음`);

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
      drawingContext: buildCurrentDrawingContext(state.specificationSections, state.drawingPrompts),
      inventionMakingEnabled: state.options.inventionMakingEnabled,
      chemicalInventionEnabled: state.options.chemicalInventionEnabled,
      chemicalEmbodimentAnalysis: state.chemicalEmbodimentAnalysis,
      chemicalFormulaCatalog: isChemicalInventionEnabled(state.options.chemicalInventionEnabled)
        ? buildChemicalFormulaCatalog(state.uploadedFiles)
        : []
    })
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorResponse(response, "섹션 작성 실패"));
  }
  const data = (await response.json()) as { content: string };
  const now = new Date().toISOString();
  set((s) => ({
    specificationSections: s.specificationSections.map((sec) =>
      sec.section_id === sectionId ? { ...sec, content: data.content, lastUpdatedAt: now } : sec
    )
  }));
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
        const instruction =
          step.mode === "rewrite"
            ? getDefaultRewriteInstruction(step.sectionId)
            : getDefaultElaborateInstruction(step.sectionId);
        await regenerateSection(get, set, step.sectionId, instruction);
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
        const state = get();
        const drawingSection = state.specificationSections.find((s) => s.section_id === `drawing_${n}`);
        const drawingPrompt = state.drawingPrompts.find((d) => d.figure_number === n);
        const figRes = await fetch("/api/generate-figure-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: buildJsonWithOpenAi({
            figureNumber: n,
            drawingMaterial: drawingSection?.content ?? "",
            analysis: state.analysis,
            relatedClaims: state.claims,
            priorFigureDescriptions: state.guidedDraft?.figureDescriptions ?? [],
            drawingPrompt
          })
        });
        if (!figRes.ok) {
          throw new Error(await parseApiErrorResponse(figRes, `도 ${n} 설명 생성 실패`));
        }
        const figData = (await figRes.json()) as { content: string };
        const current =
          get().specificationSections.find((s) => s.section_id === "detailed_description")?.content ?? "";
        await regenerateSection(
          get,
          set,
          "detailed_description",
          buildDetailedFigureAppendInstruction(n, figData.content, current)
        );
        set((s) => ({
          guidedDraft: s.guidedDraft
            ? {
                ...s.guidedDraft,
                figureDescriptions: [...s.guidedDraft.figureDescriptions, figData.content]
              }
            : null
        }));
        set({ activeTab: "spec_edit" });
        break;
      }
      case "detailed_outro": {
        const state = get();
        const current =
          state.specificationSections.find((s) => s.section_id === "detailed_description")?.content ?? "";
        await regenerateSection(
          get,
          set,
          "detailed_description",
          buildDetailedOutroInstruction(current, state.analysis!)
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
