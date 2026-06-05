"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";

export function AddClaimButton() {
  const addClaimSection = usePatentDraftStore((s) => s.addClaimSection);
  const hasAnalysis = usePatentDraftStore((s) => Boolean(s.analysis));

  return (
    <div className="spec-add-section-row">
      <button
        type="button"
        className="spec-add-section-btn"
        onClick={() => addClaimSection()}
        disabled={!hasAnalysis}
        title={hasAnalysis ? "청구항 추가" : "발명 분석 후 추가할 수 있습니다"}
      >
        + 청구항 추가
      </button>
    </div>
  );
}

export function AddDrawingButton() {
  const addDrawingSection = usePatentDraftStore((s) => s.addDrawingSection);
  const hasAnalysis = usePatentDraftStore((s) => Boolean(s.analysis));

  return (
    <div className="spec-add-section-row">
      <button
        type="button"
        className="spec-add-section-btn"
        onClick={() => addDrawingSection()}
        disabled={!hasAnalysis}
        title={hasAnalysis ? "도면 추가" : "발명 분석 후 추가할 수 있습니다"}
      >
        + 도면 추가
      </button>
    </div>
  );
}
