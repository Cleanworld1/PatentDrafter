"use client";

import { INVENTION_TYPES, MATERIAL_TYPES, type InventionInput } from "@/types/patentDraft";

interface Props {
  value: InventionInput;
  loading: boolean;
  onChange: (next: InventionInput) => void;
  onSubmit: () => void;
}

export function InventionInputForm({ value, loading, onChange, onSubmit }: Props) {
  const update = <K extends keyof InventionInput>(key: K, nextValue: InventionInput[K]) => onChange({ ...value, [key]: nextValue });

  return (
    <section className="card grid">
      <h2>입력 화면</h2>
      <label>프로젝트명<input value={value.projectName} onChange={(event) => update("projectName", event.target.value)} /></label>
      <label>발명의 내용<textarea value={value.inventionContent} onChange={(event) => update("inventionContent", event.target.value)} /></label>
      <label>첨부자료 텍스트<textarea value={value.attachmentText} onChange={(event) => update("attachmentText", event.target.value)} /></label>
      <div className="grid two">
        <label>자료 유형<select value={value.materialType} onChange={(event) => update("materialType", event.target.value as InventionInput["materialType"])}>{MATERIAL_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>발명의 유형<select value={value.inventionType} onChange={(event) => update("inventionType", event.target.value as InventionInput["inventionType"])}>{INVENTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>원하는 청구항 수<input type="number" min={1} value={value.desiredClaimCount} onChange={(event) => update("desiredClaimCount", Number(event.target.value))} /></label>
        <label>원하는 도면 수<input type="number" min={1} value={value.desiredDrawingCount} onChange={(event) => update("desiredDrawingCount", Number(event.target.value))} /></label>
      </div>
      <button onClick={onSubmit} disabled={loading}>{loading ? "mock LLM 초안 생성 중..." : "/api/full-draft 실행"}</button>
    </section>
  );
}
