import type { ClaimDraft } from "@/types/patentDraft";
export function ClaimsViewer({ claims }: { claims: ClaimDraft[] }) { return <pre>{JSON.stringify(claims, null, 2)}</pre>; }
