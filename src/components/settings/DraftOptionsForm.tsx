"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";
import { CLAIM_STYLES, DETAIL_LEVELS, INVENTION_TYPES } from "@/types/patentDraft";

export function DraftOptionsForm() {
  const options = usePatentDraftStore((s) => s.options);
  const setOptions = usePatentDraftStore((s) => s.setOptions);

  return (
    <div className="settings-card">
      <h3 className="settings-card-title">생성 옵션</h3>
      <div className="options-form">
        <label className="option-field">
          <span>발명의 유형</span>
          <select
            value={options.inventionType}
            onChange={(e) => setOptions({ inventionType: e.target.value as typeof options.inventionType })}
          >
            {INVENTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="option-field">
          <span>청구항 수 (1–20)</span>
          <input
            type="number"
            min={1}
            max={20}
            value={options.claimCount}
            onChange={(e) => setOptions({ claimCount: Math.min(20, Math.max(1, Number(e.target.value))) })}
          />
        </label>

        <label className="option-field">
          <span>도면 수 (0–15)</span>
          <input
            type="number"
            min={0}
            max={15}
            value={options.drawingCount}
            onChange={(e) => setOptions({ drawingCount: Math.min(15, Math.max(0, Number(e.target.value))) })}
          />
        </label>

        <label className="option-field">
          <span>명세서 상세도</span>
          <select
            value={options.detailLevel}
            onChange={(e) => setOptions({ detailLevel: e.target.value as typeof options.detailLevel })}
          >
            {DETAIL_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>

        <label className="option-field">
          <span>청구항 스타일</span>
          <select
            value={options.claimStyle}
            onChange={(e) => setOptions({ claimStyle: e.target.value as typeof options.claimStyle })}
          >
            {CLAIM_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </label>

        <label className="option-field checkbox-field">
          <input
            type="checkbox"
            checked={options.autoRecommendDrawingType}
            onChange={(e) => setOptions({ autoRecommendDrawingType: e.target.checked })}
          />
          <span>도면 유형 자동 추천</span>
        </label>

        <label className="option-field checkbox-field">
          <input
            type="checkbox"
            checked={options.generateAdditionalQuestions}
            onChange={(e) => setOptions({ generateAdditionalQuestions: e.target.checked })}
          />
          <span>추가 확인 질문 생성</span>
        </label>
      </div>
    </div>
  );
}
