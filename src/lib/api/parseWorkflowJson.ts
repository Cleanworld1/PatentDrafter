import { parseOpenAiFromJsonBody } from "@/lib/api/parseOpenAiCredentials";
import type { ClaimDraft, DraftOptions, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";
import type { ClaimDrawingReview, DrawingPlanItem, WorkflowState } from "@/types/patentWorkflow";
import { createEmptyWorkflowState } from "@/types/patentWorkflow";

export interface WorkflowJsonBody {
  analysis: InventionAnalysis;
  options?: DraftOptions;
  projectName?: string;
  workflow?: Partial<WorkflowState>;
  claimDrafts?: ClaimDraft[];
  drawingPlan?: DrawingPlanItem[];
  drawingPrompts?: DrawingPrompt[];
  claimDrawingReview?: ClaimDrawingReview;
  detailedDescription?: string;
}

export interface ParsedWorkflowRequest {
  credentials: OpenAiCredentialInput;
  body: WorkflowJsonBody;
}

export async function parseWorkflowJson(request: Request): Promise<ParsedWorkflowRequest> {
  const raw = (await request.json()) as Record<string, unknown>;
  const credentials = parseOpenAiFromJsonBody(raw);

  const nested = raw.payload;
  const body = (
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...nested, ...raw }
      : raw
  ) as WorkflowJsonBody & Record<string, unknown>;

  delete (body as Record<string, unknown>).openAiApiKey;
  delete (body as Record<string, unknown>).model;
  delete (body as Record<string, unknown>).payload;

  if (!body.analysis) {
    throw new Error("analysis 필드가 필요합니다.");
  }
  return { credentials, body };
}

export function mergeWorkflowState(partial?: Partial<WorkflowState>): WorkflowState {
  return { ...createEmptyWorkflowState(), ...partial };
}

export function resolveProjectName(body: WorkflowJsonBody): string {
  return body.projectName ?? body.analysis.title_candidates[0] ?? "명세서";
}

export function resolveOptions(body: WorkflowJsonBody): DraftOptions {
  return (
    body.options ?? {
      claimCount: 5,
      drawingCount: 5,
      inventionType: "자동 판단",
      detailLevel: "normal",
      claimStyle: "balanced",
      autoRecommendDrawingType: true,
      generateAdditionalQuestions: true
    }
  );
}
