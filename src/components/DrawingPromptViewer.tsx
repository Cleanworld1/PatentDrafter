import type { DrawingPrompt } from "@/types/patentDraft";
export function DrawingPromptViewer({ drawingPrompts }: { drawingPrompts: DrawingPrompt[] }) { return <pre>{JSON.stringify(drawingPrompts, null, 2)}</pre>; }
