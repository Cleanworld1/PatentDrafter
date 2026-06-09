"use client";

import { useEffect } from "react";
import { getThinkingStepsForGuidedStep } from "@/lib/client/analysisThinkingSteps";
import { ThinkingStepTicker } from "@/components/ui/ThinkingStepTicker";
import { sectionIdToTitle } from "@/types/specificationSection";
import { usePatentDraftStore } from "@/store/patentDraftStore";

function scrollToSection(sectionId: string): void {
  const el = document.getElementById(`spec-section-${sectionId}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function GuidedDraftBanner() {
  const guidedDraft = usePatentDraftStore((s) => s.guidedDraft);
  const loadingStage = usePatentDraftStore((s) => s.loadingStage);
  const refiningProgress = usePatentDraftStore((s) => s.refiningProgress);
  const continueGuidedDraft = usePatentDraftStore((s) => s.continueGuidedDraft);
  const stopGuidedDraft = usePatentDraftStore((s) => s.stopGuidedDraft);

  const active = guidedDraft?.active;
  const running = loadingStage === "guided_step";
  const awaiting = Boolean(guidedDraft?.awaitingContinue);
  const stopped = Boolean(guidedDraft?.stopped);

  useEffect(() => {
    if (!guidedDraft?.focusSectionId || !awaiting) return;
    scrollToSection(guidedDraft.focusSectionId);
  }, [guidedDraft?.focusSectionId, awaiting]);

  if (!active && !stopped) return null;

  const stepNum = (guidedDraft?.stepIndex ?? 0) + 1;
  const total = guidedDraft?.totalSteps ?? 0;
  const label = guidedDraft?.currentStepLabel ?? refiningProgress;
  const currentKind = guidedDraft?.steps[guidedDraft?.stepIndex ?? 0]?.kind;
  const thinkingSteps = getThinkingStepsForGuidedStep(currentKind);
  const showThinkingTicker = running && Boolean(thinkingSteps?.length);
  const focusTitle = guidedDraft?.focusSectionId
    ? sectionIdToTitle(guidedDraft.focusSectionId)
    : null;

  return (
    <div
      className={`guided-draft-banner${running ? " is-running" : ""}${awaiting ? " is-awaiting" : ""}${stopped ? " is-stopped" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="guided-draft-banner-body">
        <p className="guided-draft-banner-step">
          단계 {Math.min(stepNum, total)} / {total}
        </p>
        <p className="guided-draft-banner-label">
          {stopped ? "단계별 작성이 중단되었습니다." : running ? `${label}…` : `${label} — 완료`}
        </p>
        {awaiting && !stopped && (
          <p className="guided-draft-banner-hint">
            {focusTitle
              ? `「${focusTitle}」 항목을 확인하거나 다른 항목을 직접 수정할 수 있습니다. 확인 후 계속을 누르면 수정 내용이 반영된 채로 다음 항목을 작성합니다.`
              : "내용을 확인·수정한 뒤 계속을 누르면 다음 단계로 진행합니다."}
          </p>
        )}
        {showThinkingTicker ? (
          <ThinkingStepTicker
            steps={thinkingSteps!}
            active={running}
            className="guided-draft-thinking"
            label="AI 분석 흐름"
          />
        ) : (
          running && (
            <p className="guided-draft-banner-hint">AI 요청을 처리 중입니다. 잠시만 기다려 주세요.</p>
          )
        )}
      </div>
      <div className="guided-draft-banner-actions">
        {awaiting && !stopped && (
          <button type="button" className="btn-primary" onClick={() => continueGuidedDraft()}>
            계속
          </button>
        )}
        {(active || running) && !stopped && (
          <button type="button" className="btn-secondary guided-draft-stop" onClick={() => stopGuidedDraft()}>
            중단
          </button>
        )}
        {stopped && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => usePatentDraftStore.setState({ guidedDraft: null })}
          >
            닫기
          </button>
        )}
      </div>
    </div>
  );
}
