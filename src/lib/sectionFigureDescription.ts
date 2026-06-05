import { createOpenAiMultimodalClient } from "@/lib/ai/createOpenAiClient";
import { streamMockPlainText, streamOpenAiPlainText } from "@/lib/ai/streamOpenAiPlainText";
import { resolveOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { extractPlainTextFromLlm } from "@/lib/ai/extractPlainTextFromLlm";
import {
  normalizeSpecificationLineBreaks,
  stripDuplicateSectionHeading
} from "@/lib/sectionOutputSanitizer";
import { buildDrawingFigureDescriptionPrompt } from "@/prompts/drawingFigureDescription";
import { SECTION_TYPE_TITLES } from "@/types/specificationSection";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";

function finalizeFigureDescription(
  input: { figureNumber: number },
  raw: string
): string {
  let text = extractPlainTextFromLlm(raw, false);
  text = stripDuplicateSectionHeading(text, `【도 ${input.figureNumber}】`);
  text = stripDuplicateSectionHeading(text, SECTION_TYPE_TITLES.detailed_description);
  return normalizeSpecificationLineBreaks(text);
}

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
  return finalizeFigureDescription(input, raw);
}

export async function generateDrawingFigureDescriptionStreaming(
  input: {
    figureNumber: number;
    drawingMaterial: string;
    analysis: InventionAnalysis;
    relatedClaims: ClaimDraft[];
    priorFigureDescriptions: string[];
    drawingPrompt?: DrawingPrompt;
  },
  credentials: OpenAiCredentialInput | undefined,
  onDelta: (accumulated: string) => void
): Promise<string> {
  const prompt = buildDrawingFigureDescriptionPrompt(input);
  const resolved = resolveOpenAiCredentials(credentials);
  const mockText = `도 ${input.figureNumber}은(는) ${input.drawingPrompt?.title ?? "발명의 구성"}를 나타낸다. [mock 스트리밍]`;
  const raw = resolved
    ? await streamOpenAiPlainText(
        resolved.apiKey,
        resolved.model,
        { organizationId: resolved.organizationId, projectId: resolved.projectId },
        [{ type: "text", text: prompt }],
        onDelta
      )
    : await streamMockPlainText(mockText, onDelta);

  const finalText = finalizeFigureDescription(input, raw);
  onDelta(finalText);
  return finalText;
}
