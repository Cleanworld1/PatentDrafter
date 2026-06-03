"use client";
export function MarkdownResultViewer({ markdown }: { markdown: string }) {
  const copy = async () => navigator.clipboard.writeText(markdown);
  return <div className="grid"><button onClick={copy}>Markdown 전체 결과 복사</button><textarea readOnly value={markdown} rows={24} /></div>;
}
