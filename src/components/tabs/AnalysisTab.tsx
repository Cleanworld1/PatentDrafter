"use client";

import { InventionAnalysisView } from "@/components/viewers/InventionAnalysisView";
import { normalizeInventionAnalysis } from "@/lib/jsonSchema";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function AnalysisTab() {
  const analysis = usePatentDraftStore((s) => s.analysis);
  const normalized = analysis ? normalizeInventionAnalysis(analysis) : null;

  if (!normalized) {
    return <div className="tab-empty">발명 분석표가 아직 생성되지 않았습니다. 오른쪽 패널에서 &quot;발명 분석하기&quot;를 실행하세요.</div>;
  }

  return (
    <div className="tab-panel tab-panel--scroll">
      <InventionAnalysisView analysis={normalized} />
    </div>
  );
}
