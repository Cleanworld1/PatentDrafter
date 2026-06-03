import { createOpenAiMultimodalClient } from "@/lib/ai/createOpenAiClient";
import { extractPlainTextFromLlm } from "@/lib/ai/extractPlainTextFromLlm";
import {
  normalizeSpecificationLineBreaks,
  stripDuplicateSectionHeading
} from "@/lib/sectionOutputSanitizer";
import { buildDrawingFigureDescriptionPrompt } from "@/prompts/drawingFigureDescription";
import { SECTION_TYPE_TITLES } from "@/types/specificationSection";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";

export async function generateDrawingFigureDescription(
  input: {
    figureNumber: number;
    drawingMaterial: string;
    analysis: InventionAnalysis;
    relatedClaims: ClaimDraft[];
    priorFigureDescriptions: string[];
    drawingPrompt?: DrawingPrompt;
  },
  credentials?: OpenAiCredentialInput
): Promise<string> {
  const prompt = buildDrawingFigureDescriptionPrompt(input);
  const client = createOpenAiMultimodalClient(credentials);
  const raw = await client.generatePlainText(prompt);
  let text = extractPlainTextFromLlm(raw, false);
  text = stripDuplicateSectionHeading(text, `【도 ${input.figureNumber}】`);
  text = stripDuplicateSectionHeading(text, SECTION_TYPE_TITLES.detailed_description);
  return normalizeSpecificationLineBreaks(text);
}
