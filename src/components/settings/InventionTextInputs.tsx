"use client";

import { INVENTION_MAKING_MODE_LABEL } from "@/knowledge/inventionMakingRules";
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
  const inventionMakingEnabled = usePatentDraftStore((s) => s.options.inventionMakingEnabled);
  const setOptions = usePatentDraftStore((s) => s.setOptions);

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

      <div className="invention-making-row">
        <div className="invention-making-copy">
          <span className="invention-making-label">{INVENTION_MAKING_MODE_LABEL}</span>
          <p className="settings-card-hint">
            활성화하면 입력한 기술 내용을 바탕으로 특허 초안을 적극 구체화합니다. 구성 나열보다{" "}
            <strong>하나의 대표 실시예</strong>를 매우 상세히 쓰고, 효과는 그 동작·구조와 논리적으로
            연결합니다.
          </p>
        </div>
        <button
          type="button"
          className={`invention-making-toggle${inventionMakingEnabled ? " is-on" : ""}`}
          onClick={() => setOptions({ inventionMakingEnabled: !inventionMakingEnabled })}
          aria-pressed={inventionMakingEnabled}
          title={inventionMakingEnabled ? "발명 메이킹 끄기" : "발명 메이킹 켜기"}
        >
          {inventionMakingEnabled ? "활성" : "비활성"}
        </button>
      </div>
    </div>
  );
}
