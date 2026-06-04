/** 업로드 자료에서 명세서에 삽입할 화학식 이미지 참조 */
export interface ChemicalFormulaImageRef {
  /** uploadedFiles[].id 와 동일 */
  id: string;
  name: string;
  mimeType: string;
  /** 표시 라벨 예: 화학식 1 */
  label: string;
}
