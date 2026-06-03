"use client";

import { useState } from "react";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function MarkdownTab() {
  const markdown = usePatentDraftStore((s) => s.markdown);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tab-panel markdown-tab">
      <div className="markdown-tab-header">
        <button type="button" className="btn-secondary" onClick={copy}>
          {copied ? "복사됨" : "전체 복사"}
        </button>
      </div>
      <textarea
        className="markdown-textarea"
        readOnly
        value={markdown || "아직 생성된 Markdown이 없습니다."}
      />
    </div>
  );
}
