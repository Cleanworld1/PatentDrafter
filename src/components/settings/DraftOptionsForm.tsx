"use client";

import { CHEMICAL_INVENTION_MODE_LABEL } from "@/knowledge/chemicalInventionRules";
import { usePatentDraftStore } from "@/store/patentDraftStore";
import { CLAIM_STYLES, DETAIL_LEVELS, INVENTION_TYPES } from "@/types/patentDraft";

export function DraftOptionsForm() {
  const options = usePatentDraftStore((s) => s.options);
  const setOptions = usePatentDraftStore((s) => s.setOptions);
  const chemicalInventionEnabled = options.chemicalInventionEnabled;
  const inventionMakingEnabled = options.inventionMakingEnabled;

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

        <div className="invention-making-row">
          <div className="invention-making-copy">
            <span className="invention-making-label">{CHEMICAL_INVENTION_MODE_LABEL}</span>
            <p className="settings-card-hint">
              활성화하면 1단계 발명 분석 후 <strong>2단계 실시예/비교예 분석</strong>이 실행되고,
              실시예·비교예 HTML 표·구체적인 설명 주입·데이터 그래프 도면 지시가 명세서에 반영됩니다.
              {chemicalInventionEnabled && inventionMakingEnabled
                ? " 발명 메이킹과 함께 켜면 수치한정범위 대비 실험예·비교예와 표 2~3개 구성을 우선합니다."
                : ""}
            </p>
          </div>
          <button
            type="button"
            className={`chemical-invention-toggle${chemicalInventionEnabled ? " is-on" : ""}`}
            onClick={() => setOptions({ chemicalInventionEnabled: !chemicalInventionEnabled })}
            aria-pressed={chemicalInventionEnabled}
            title={chemicalInventionEnabled ? "화학 발명 끄기" : "화학 발명 켜기"}
          >
            {chemicalInventionEnabled ? "활성" : "비활성"}
          </button>
        </div>

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
