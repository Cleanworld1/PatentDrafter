"use client";

import { DrawingPromptsView } from "@/components/viewers/DrawingPromptsView";
import { normalizeDrawingPrompts } from "@/lib/jsonSchema";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function DrawingPromptsTab() {
  const drawingPrompts = normalizeDrawingPrompts(usePatentDraftStore((s) => s.drawingPrompts));

  if (drawingPrompts.length === 0) {
    return <div className="tab-empty">도면 프롬프트가 아직 생성되지 않았습니다.</div>;
  }

  return (
    <div className="tab-panel tab-panel--scroll">
      <DrawingPromptsView prompts={drawingPrompts} />
    </div>
  );
}
