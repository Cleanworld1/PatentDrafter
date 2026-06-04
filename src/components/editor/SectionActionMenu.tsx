"use client";

import { useState } from "react";
import {
  downloadBase64Image,
  DrawingImageNotConfiguredError,
  requestDrawingImage
} from "@/lib/client/requestDrawingImage";
import { buildNanoBananaDrawingPrompt, launchNanoBananaDrawing } from "@/lib/nanoBananaDrawing";
import { usePatentDraftStore } from "@/store/patentDraftStore";

interface SectionActionMenuProps {
  sectionId: string;
  content: string;
  isDraft?: boolean;
  needsReview?: boolean;
  reviewSupplement?: boolean;
}

export function SectionActionMenu({
  sectionId,
  content,
  isDraft,
  needsReview,
  reviewSupplement
}: SectionActionMenuProps) {
  const regenerateSection = usePatentDraftStore((s) => s.regenerateSection);
  const writeDraftSection = usePatentDraftStore((s) => s.writeDraftSection);
  const drawingPrompts = usePatentDraftStore((s) => s.drawingPrompts);
  const [copied, setCopied] = useState(false);
  const [nanoHint, setNanoHint] = useState("");
  const [nanoGenerating, setNanoGenerating] = useState(false);

  const isDrawingSection = sectionId.startsWith("drawing_");
  const isClaimOrDrawing = sectionId.startsWith("claim_") || isDrawingSection;
  const showSupplementAction = Boolean(needsReview && reviewSupplement);

  const copyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleNanoBananaGenerate = async () => {
    const num = Number(sectionId.replace("drawing_", ""));
    const drawingPrompt = drawingPrompts.find((d) => d.figure_number === num);
    const prompt = buildNanoBananaDrawingPrompt(num, content, drawingPrompt);
    setNanoGenerating(true);
    setNanoHint("도면 생성 중…");
    try {
      const { mimeType, imageBase64 } = await requestDrawingImage(prompt);
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") ? "jpg" : "png";
      downloadBase64Image(imageBase64, mimeType, `도${num}.${ext}`);
      setNanoHint("이미지 생성 완료 · 다운로드됨");
    } catch (err) {
      if (err instanceof DrawingImageNotConfiguredError) {
        try {
          await launchNanoBananaDrawing(prompt);
          setNanoHint("Key 없음 · 프롬프트 복사 · AI Studio 열림");
        } catch {
          setNanoHint("복사 실패 — 브라우저 권한을 확인하세요");
        }
      } else {
        setNanoHint(err instanceof Error ? err.message : "도면 생성 실패");
      }
    } finally {
      setNanoGenerating(false);
      setTimeout(() => setNanoHint(""), 5000);
    }
  };

  if (isDraft && isClaimOrDrawing) {
    return (
      <div className="section-actions-wrap">
        <div className="section-actions">
          <button
            type="button"
            className="section-action-btn section-action-btn--write"
            onClick={() => void writeDraftSection(sectionId)}
            title="AI로 이 항목 초안 작성"
          >
            작성
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-actions-wrap">
      <div className="section-actions">
        {isDrawingSection && (
          <button
            type="button"
            className="section-action-btn section-action-btn--primary"
            onClick={() => void handleNanoBananaGenerate()}
            disabled={nanoGenerating}
            title="GEMINI_API_KEY 설정 시 앱에서 이미지 생성, 없으면 AI Studio로 열기"
          >
            {nanoGenerating ? "생성 중…" : "도면 생성"}
          </button>
        )}
        {showSupplementAction ? (
          <button
            type="button"
            className="section-action-btn section-action-btn--supplement"
            onClick={() => void regenerateSection(sectionId, { mode: "supplement" })}
            title="기존 본문은 유지하고 신규 청구항·도면만 반영하여 보완"
          >
            보완 작성
          </button>
        ) : (
          <button
            type="button"
            className="section-action-btn"
            onClick={() => void regenerateSection(sectionId, { mode: "rewrite" })}
            title="다시 작성"
          >
            다시 작성
          </button>
        )}
        <button
          type="button"
          className="section-action-btn"
          onClick={() => void regenerateSection(sectionId, { mode: "elaborate" })}
          title="더 구체화"
        >
          더 구체화
        </button>
        <button type="button" className="section-action-btn" disabled title="TODO">
          더 간결하게
        </button>
        <button type="button" className="section-action-btn" disabled title="TODO">
          정합성 검토
        </button>
        <button type="button" className="section-action-btn" onClick={() => void copyContent()}>
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      {nanoHint && <span className="section-action-hint">{nanoHint}</span>}
    </div>
  );
}
