import type { SpecificationReview } from "@/types/patentDraft";
export function ReviewViewer({ review }: { review: SpecificationReview }) { return <pre>{JSON.stringify(review, null, 2)}</pre>; }
