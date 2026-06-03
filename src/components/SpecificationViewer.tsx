import type { SpecificationDraft } from "@/types/patentDraft";
export function SpecificationViewer({ specification }: { specification: SpecificationDraft }) {
  const { claims, drawing_prompts, ...body } = specification;
  return <pre>{JSON.stringify(body, null, 2)}</pre>;
}
