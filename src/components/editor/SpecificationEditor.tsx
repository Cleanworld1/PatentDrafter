"use client";

import { Fragment } from "react";
import { AddClaimButton, AddDrawingButton } from "@/components/editor/SectionAddButtons";
import { SpecEditorZoomViewport } from "@/components/editor/SpecEditorZoomViewport";
import { SpecificationSectionBlock } from "@/components/editor/SpecificationSectionBlock";
import { SpecificationToc } from "@/components/editor/SpecificationToc";
import { useSpecEditorFullscreen } from "@/lib/client/useSpecEditorFullscreen";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import { isLastClaimSection, isLastDrawingSection } from "@/lib/specificationSectionOrder";
import {
  getSpecEditorZoomPercent,
  useSpecEditorViewportStore
} from "@/store/specEditorViewportStore";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function SpecificationEditor() {
  useSpecEditorFullscreen();

  const sections = dedupeSpecificationSections(usePatentDraftStore((s) => s.specificationSections));
  const updateSectionContent = usePatentDraftStore((s) => s.updateSectionContent);
  const fullscreen = useSpecEditorViewportStore((s) => s.fullscreen);
  const setFullscreen = useSpecEditorViewportStore((s) => s.setFullscreen);
  const zoom = useSpecEditorViewportStore((s) => s.zoom);

  return (
    <div className={`spec-editor-wrapper${fullscreen ? " is-fullscreen" : ""}`}>
      {fullscreen && (
        <div className="spec-fullscreen-bar">
          <span className="spec-fullscreen-title">명세서 편집 — 전체화면</span>
          <span className="spec-fullscreen-zoom">{getSpecEditorZoomPercent(zoom)}%</span>
          <span className="spec-fullscreen-hint">Ctrl + 휠: 확대/축소 · Esc: 나가기</span>
          <button
            type="button"
            className="spec-fullscreen-exit"
            onClick={() => setFullscreen(false)}
          >
            나가기
          </button>
        </div>
      )}

      <SpecEditorZoomViewport className={fullscreen ? "spec-editor-zoom-viewport--fullscreen" : ""}>
        <div className="spec-editor-layout">
          <SpecificationToc sections={sections} />
          <div className="spec-editor-main">
            <div className="spec-document-page">
              {sections.map((section, index) => (
                <Fragment key={section.section_id}>
                  <SpecificationSectionBlock
                    section={section}
                    onContentChange={(content) => updateSectionContent(section.section_id, content)}
                  />
                  {isLastClaimSection(sections, index) && <AddClaimButton />}
                  {isLastDrawingSection(sections, index) && <AddDrawingButton />}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </SpecEditorZoomViewport>
    </div>
  );
}
