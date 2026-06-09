"use client";

import { useEffect } from "react";
import { getThinkingStepsForLoadingStage } from "@/lib/client/analysisThinkingSteps";
import {
  getLoadingOverlayContent,
  shouldShowLoadingOverlay
} from "@/lib/client/loadingMessages";
import { ThinkingStepTicker } from "@/components/ui/ThinkingStepTicker";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function LoadingOverlay() {
  const loadingStage = usePatentDraftStore((s) => s.loadingStage);
  const refiningProgress = usePatentDraftStore((s) => s.refiningProgress);

  const visible = shouldShowLoadingOverlay(loadingStage);
  const content = getLoadingOverlayContent(loadingStage, refiningProgress);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible || !content) return null;

  const thinkingSteps = getThinkingStepsForLoadingStage(loadingStage);

  return (
    <div
      className="loading-overlay"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="loading-overlay-title"
      aria-describedby="loading-overlay-desc"
    >
      <div className="loading-overlay-backdrop" />
      <div className="loading-overlay-card">
        <div className="loading-overlay-spinner" aria-hidden="true">
          <span className="loading-overlay-ring" />
          <span className="loading-overlay-core" />
        </div>

        <div className="loading-overlay-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <h2 id="loading-overlay-title" className="loading-overlay-title">
          {content.title}
        </h2>
        {thinkingSteps ? (
          <div id="loading-overlay-desc">
            <ThinkingStepTicker
              steps={thinkingSteps}
              active
              className="loading-overlay-thinking"
              label="AI 분석 흐름"
            />
          </div>
        ) : (
          <p id="loading-overlay-desc" className="loading-overlay-message">
            {content.message}
          </p>
        )}
        {content.hint && <p className="loading-overlay-hint">{content.hint}</p>}

        <div className="loading-overlay-bar" aria-hidden="true">
          <span className="loading-overlay-bar-fill" />
        </div>
      </div>
    </div>
  );
}
