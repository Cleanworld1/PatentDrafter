"use client";

import { useEffect, useRef } from "react";
import { getReviewNoticeForSection } from "@/lib/claimDrawingImpact";
import { SectionActionMenu } from "@/components/editor/SectionActionMenu";
import type { SpecificationSection } from "@/types/patentDraft";

interface SpecificationSectionBlockProps {
  section: SpecificationSection;
  onContentChange: (content: string) => void;
}

export function SpecificationSectionBlock({ section, onContentChange }: SpecificationSectionBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  useEffect(() => {
    if (contentRef.current && !isFocused.current) {
      contentRef.current.innerText = section.content;
    }
  }, [section.content, section.isGenerating]);

  const blockClass = [
    "spec-section-block",
    section.isModified ? "modified" : "",
    section.needsReview ? "needs-review" : ""
  ]
    .filter(Boolean)
    .join(" ");

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
        <p className="spec-section-loading">AI가 {section.title}를 작성 중입니다…</p>
      ) : section.isDraft ? (
        <p className="spec-section-draft-placeholder">
          내용이 비어 있습니다. 상단 「작성」 버튼을 눌러 AI 초안을 생성하세요.
        </p>
      ) : (
        <div
          ref={contentRef}
          className="spec-section-content"
          contentEditable
          suppressContentEditableWarning
          onFocus={() => {
            isFocused.current = true;
          }}
          onBlur={(e) => {
            isFocused.current = false;
            onContentChange(e.currentTarget.innerText);
          }}
        />
      )}
    </div>
  );
}
