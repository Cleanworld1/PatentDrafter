"use client";

import { useCallback, useEffect, useState } from "react";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import type { SpecificationSection } from "@/types/patentDraft";

function sectionDomId(sectionId: string): string {
  return `spec-section-${sectionId}`;
}

interface SpecificationTocProps {
  sections: SpecificationSection[];
}

export function SpecificationToc({ sections }: SpecificationTocProps) {
  const tocSections = dedupeSpecificationSections(sections);
  const [activeId, setActiveId] = useState<string | null>(tocSections[0]?.section_id ?? null);

  useEffect(() => {
    const ids = tocSections.map((s) => sectionDomId(s.section_id));
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id.replace(/^spec-section-/, ""));
        }
      },
      { root: null, rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocSections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionDomId(sectionId));
    if (!el) return;
    setActiveId(sectionId);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (tocSections.length === 0) return null;

  return (
    <nav className="spec-toc" aria-label="명세서 목차">
      <p className="spec-toc-heading">목차</p>
      <ul className="spec-toc-list">
        {tocSections.map((section) => {
          const isDrawing = section.section_id.startsWith("drawing_");
          return (
            <li key={section.section_id}>
              <button
                type="button"
                className={`spec-toc-item${activeId === section.section_id ? " active" : ""}${isDrawing ? " spec-toc-item--drawing" : ""}`}
                onClick={() => scrollToSection(section.section_id)}
                title={section.title}
              >
                <span className="spec-toc-item-label">{section.title}</span>
                {section.needsReview && (
                  <span className="spec-toc-dot spec-toc-dot--review" title="검토 필요" />
                )}
                {section.isModified && !section.needsReview && (
                  <span className="spec-toc-dot" title="수정됨" />
                )}
                {section.isDraft && <span className="spec-toc-dot spec-toc-dot--draft" title="초안 대기" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
