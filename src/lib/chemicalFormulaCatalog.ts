import type { ChemicalFormulaImageRef } from "@/types/chemicalFormulaImage";
import type { UploadedFile } from "@/types/patentDraft";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?)$/i;

export function isLikelyChemicalFormulaSourceFile(file: UploadedFile): boolean {
  if (file.aiInputMode === "image_input") return true;
  if (IMAGE_EXT.test(file.name)) return true;
  if (file.mimeType.startsWith("image/")) return true;
  return false;
}

export function buildChemicalFormulaCatalog(uploadedFiles: UploadedFile[]): ChemicalFormulaImageRef[] {
  return uploadedFiles.filter(isLikelyChemicalFormulaSourceFile).map((f, index) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    label: `화학식 ${index + 1}`
  }));
}

export function formatChemicalFormulaCatalogForPrompt(
  catalog: ChemicalFormulaImageRef[]
): string {
  if (catalog.length === 0) {
    return `[화학식 이미지]
업로드된 별도 이미지 파일이 없습니다. PDF·PPT·DOCX 내 화학식·구조식 그림이 있으면 그 내용을 텍스트로 기재하고, 사용자가 이미지 파일을 추가 업로드하면 chemimg 참조로 삽입할 수 있습니다.`;
  }

  const lines = catalog.map(
    (c) =>
      `- ${c.label}: 파일 "${c.name}" → 삽입 시 src="chemimg:${c.id}" (반드시 이 id 사용)`
  );

  return `[화학식 이미지 — 업로드 자료에서 적극 활용]
다음 이미지는 업로드 자료의 화학식·구조식·반응식 그림 후보이다. 명세서(특히 【발명을 실시하기 위한 구체적인 내용】·【해결 수단】)에 해당 그림이 있으면 **반드시 이미지로 삽입**하라.

${lines.join("\n")}

삽입 형식(줄바꿈·순서 엄수):
[화학식 N]
<img src="chemimg:파일ID" alt="화학식 N" class="chem-formula-img">

규칙:
- N은 1부터 순번(위 목록의 화학식 번호와 맞출 것).
- **이미지 태그 바로 윗줄**에만 [화학식 N] 한 줄을 둔다(다른 문장과 같은 줄에 쓰지 말 것).
- src는 반드시 chemimg:{위 목록의 id} 형식. data URL·외부 URL·임의 경로 금지.
- PDF/문서 내 화학식이 위 목록 파일과 대응되면 해당 chemimg를 사용한다.
- 화학식이 여러 개면 [화학식 1], [화학식 2]… 각각에 대해 위 형식을 반복한다.
- 이미지 없이 화학식을 텍스트만으로 대체하지 말고, 자료에 그림이 있으면 chemimg 삽입을 우선한다.`;
}
