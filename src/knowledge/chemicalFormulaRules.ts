import { formatChemicalFormulaCatalogForPrompt } from "@/lib/chemicalFormulaCatalog";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import type { ChemicalFormulaImageRef } from "@/types/chemicalFormulaImage";

export function getChemicalFormulaRulesBlock(
  enabled: boolean | undefined,
  catalog: ChemicalFormulaImageRef[] = []
): string {
  if (!isChemicalInventionEnabled(enabled)) return "";

  return `${formatChemicalFormulaCatalogForPrompt(catalog)}

[화학식 표기 — 명세서 본문]
- 조성물·반응식·구조식은 업로드 자료의 그림·화학식 영역을 확인하여 이미지로 넣는다.
- 각 화학식 이미지 **직전 줄**에 [화학식 N]만 단독으로 기재한다.
- 화학식 설명 문단은 [화학식 N] 다음 줄의 img 다음에 이어서 작성할 수 있다.`;
}

export const CHEMICAL_FORMULA_MULTIMODAL_NOTE =
  "화학식·구조식·반응식이 보이는 영역은 특허명세서용 화학식 이미지로 명세서에 삽입할 후보임을 인지하고, 구조·기능기·반응 화살표를 분석하라.";
