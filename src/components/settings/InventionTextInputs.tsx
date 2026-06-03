"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";

const FIELDS = [
  { key: "overview", label: "발명 개요" },
  { key: "coreIdea", label: "핵심 아이디어" },
  { key: "existingProblems", label: "기존 문제점" },
  { key: "differentiators", label: "차별점" },
  { key: "embodimentNotes", label: "실시예 메모" },
  { key: "otherNotes", label: "기타 참고사항" }
] as const;

export function InventionTextInputs() {
  const textInputs = usePatentDraftStore((s) => s.textInputs);
  const setTextInputs = usePatentDraftStore((s) => s.setTextInputs);

  return (
    <div className="settings-card">
      <h3 className="settings-card-title">직접 입력</h3>
      <div className="text-inputs-grid">
        {FIELDS.map((field) => (
          <label key={field.key} className="text-input-field">
            <span>{field.label}</span>
            <textarea
              value={textInputs[field.key]}
              onChange={(e) => setTextInputs({ [field.key]: e.target.value })}
              rows={3}
              placeholder={`${field.label}을 입력하세요`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
