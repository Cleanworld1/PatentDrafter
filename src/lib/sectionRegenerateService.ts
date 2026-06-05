import { createOpenAiMultimodalClient } from "@/lib/ai/createOpenAiClient";
import { streamMockPlainText, streamOpenAiPlainText } from "@/lib/ai/streamOpenAiPlainText";
import { resolveOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { extractPlainTextFromLlm } from "@/lib/ai/extractPlainTextFromLlm";
import {
  normalizeSpecificationLineBreaks,
  sanitizeClaimSectionOutput,
  stripDuplicateSectionHeading
} from "@/lib/sectionOutputSanitizer";
import type { CurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import { buildRegenerateSectionPrompt } from "@/prompts/regenerateSection";
import { finalizeChemicalFormulaSectionContent } from "@/lib/chemicalFormulaContent";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import type { ChemicalFormulaImageRef } from "@/types/chemicalFormulaImage";
import type { ClaimDraft, InventionAnalysis } from "@/types/patentDraft";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";
import type { SpecificationSectionType } from "@/types/specificationSection";

export interface RegenerateSectionInput {
  sectionType: SpecificationSectionType;
  sectionTitle: string;
  sectionId?: string;
  currentContent: string;
  analysis: InventionAnalysis;
  relatedClaims?: ClaimDraft[];
  userInstruction?: string;
  drawingContext?: CurrentDrawingContext;
  specificationSections?: Array<{ section_id: string; content: string }>;
  inventionMakingEnabled?: boolean;
  chemicalInventionEnabled?: boolean;
  chemicalEmbodimentAnalysis?: ChemicalEmbodimentAnalysis | null;
  chemicalFormulaCatalog?: ChemicalFormulaImageRef[];
}

function mockSectionContent(input: RegenerateSectionInput): string {
  const { analysis, sectionType, currentContent } = input;
  if (currentContent.trim()) {
    return `${currentContent.trim()}\n\n[항목별 지침 기반 보완 초안 — ${input.sectionTitle}]`;
  }

  const map: Partial<Record<SpecificationSectionType, string>> = {
    invention_title: analysis.title_candidates[0] ?? "",
    technical_field: analysis.technical_field,
    background_art: analysis.prior_art,
    problems_to_solve: analysis.problem_to_solve.join("\n"),
    means_for_solving: `${analysis.core_idea}\n${analysis.essential_elements.join(", ")}`,
    effects: analysis.expected_effects.join("\n"),
    brief_description_of_drawings: input.drawingContext
      ? input.drawingContext.drawings
          .map((d) => `도 ${d.figure_number}은(는) ${d.title}를 나타낸다.`)
          .join("\n")
      : analysis.drawing_candidates.map((d, i) => `도 ${i + 1}은(는) ${d}를 나타낸다.`).join("\n"),
    detailed_description: analysis.element_relationships.join("\n"),
    summary: analysis.one_line_summary,
    representative_drawing: "도 1",
    claim:
      input.relatedClaims?.[0]?.text ??
      `청구항 1에 기재된 구성을 포함하는 ${analysis.title_candidates[0] ?? "발명"}.`
  };

  return map[sectionType] ?? analysis.one_line_summary;
}

function finalizeSectionOutput(input: RegenerateSectionInput, raw: string): string {
  const preferDrawingFormat = input.sectionType === "drawing_prompt";
  let text = extractPlainTextFromLlm(raw, preferDrawingFormat);
  if (input.sectionType === "claim") {
    return sanitizeClaimSectionOutput(text, input.sectionTitle);
  }
  text = stripDuplicateSectionHeading(text, input.sectionTitle);
  text = finalizeChemicalFormulaSectionContent(text, input.chemicalInventionEnabled);
  return normalizeSpecificationLineBreaks(text);
}

export async function regenerateSpecificationSection(
  input: RegenerateSectionInput,
  credentials?: OpenAiCredentialInput
): Promise<string> {
  const prompt = buildRegenerateSectionPrompt(input);
  const client = createOpenAiMultimodalClient(credentials);
  const raw = await client.generatePlainText(prompt);
  return finalizeSectionOutput(input, raw);
}

export async function regenerateSpecificationSectionStreaming(
  input: RegenerateSectionInput,
  credentials: OpenAiCredentialInput | undefined,
  onDelta: (accumulated: string) => void
): Promise<string> {
  const prompt = buildRegenerateSectionPrompt(input);
  const resolved = resolveOpenAiCredentials(credentials);
  const raw = resolved
    ? await streamOpenAiPlainText(
        resolved.apiKey,
        resolved.model,
        { organizationId: resolved.organizationId, projectId: resolved.projectId },
        [{ type: "text", text: prompt }],
        onDelta
      )
    : await streamMockPlainText(mockSectionContent(input), onDelta);

  const finalText = finalizeSectionOutput(input, raw);
  onDelta(finalText);
  return finalText;
}

/** credentials 없이 mock만 필요한 경우(테스트) */
export function regenerateSpecificationSectionMock(input: RegenerateSectionInput): string {
  return mockSectionContent(input);
}
