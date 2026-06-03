"use client";

import { Fragment } from "react";
import { AddClaimButton, AddDrawingButton } from "@/components/editor/SectionAddButtons";
import { SpecificationSectionBlock } from "@/components/editor/SpecificationSectionBlock";
import { SpecificationToc } from "@/components/editor/SpecificationToc";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import { isLastClaimSection, isLastDrawingSection } from "@/lib/specificationSectionOrder";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function SpecificationEditor() {
  const sections = dedupeSpecificationSections(usePatentDraftStore((s) => s.specificationSections));
  const updateSectionContent = usePatentDraftStore((s) => s.updateSectionContent);

  return (
    <div className="spec-editor-wrapper">
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
    </div>
  );
}
