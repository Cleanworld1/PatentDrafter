import type { InventionAnalysis } from "@/types/patentDraft";
export function AnalysisViewer({ analysis }: { analysis: InventionAnalysis }) { return <pre>{JSON.stringify(analysis, null, 2)}</pre>; }
