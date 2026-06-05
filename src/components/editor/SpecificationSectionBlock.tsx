"use client";

import { useEffect, useRef } from "react";
import { getReviewNoticeForSection } from "@/lib/claimDrawingImpact";
import { SpecSectionEditor } from "@/components/editor/SpecSectionEditor";
import { SectionActionMenu } from "@/components/editor/SectionActionMenu";
import type { SpecificationSection } from "@/types/patentDraft";

interface SpecificationSectionBlockProps {
  section: SpecificationSection;
  onContentChange: (content: string) => void;
}

export function SpecificationSectionBlock({ section, onContentChange }: SpecificationSectionBlockProps) {
  const streamRef = useRef<HTMLDivElement>(null);

  const blockClass = [
    "spec-section-block",
    section.isModified ? "modified" : "",
    section.needsReview ? "needs-review" : "",
    section.isGenerating ? "is-streaming" : ""
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!section.isGenerating || !streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [section.content, section.isGenerating]);

  return (
    <div id={`spec-section-${section.section_id}`} className={blockClass}>
      {section.needsReview && (
        <p className="spec-review-notice" role="status">
          {getReviewNoticeForSection(section)}
        </p>
      )}
      <div className="spec-section-header">
        <h3 className="spec-section-title">{section.title}</h3>
        <div className="spec-section-badges">
          {section.isGenerating && <span className="badge generating">작성 중</span>}
          {section.isDraft && !section.isGenerating && (
            <span className="badge draft">초안 대기</span>
          )}
          {section.isModified && !section.isGenerating && !section.isDraft && (
            <span className="badge modified">수정됨</span>
          )}
          {section.needsReview && !section.isGenerating && (
            <span className="badge review-needed">검토 필요</span>
          )}
          <SectionActionMenu
            sectionId={section.section_id}
            content={section.content}
            isDraft={section.isDraft}
            needsReview={section.needsReview}
            reviewSupplement={section.reviewSupplement}
          />
        </div>
      </div>
      {section.isGenerating ? (
        <div ref={streamRef} className="spec-section-streaming">
          <pre className="spec-section-streaming-body">
            {section.content || ""}
            <span className="spec-streaming-cursor" aria-hidden="true" />
          </pre>
        </div>
      ) : section.isDraft ? (
        <p className="spec-section-draft-placeholder">
          내용이 비어 있습니다. 상단 「작성」 버튼을 눌러 AI 초안을 생성하세요.
        </p>
      ) : (
        <SpecSectionEditor content={section.content} onContentChange={onContentChange} />
      )}
    </div>
  );
}
