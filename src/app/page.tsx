"use client";

import { useState } from "react";
import { AnalysisViewer } from "@/components/AnalysisViewer";
import { ClaimsViewer } from "@/components/ClaimsViewer";
import { DrawingPromptViewer } from "@/components/DrawingPromptViewer";
import { InventionInputForm } from "@/components/InventionInputForm";
import { MarkdownResultViewer } from "@/components/MarkdownResultViewer";
import { ReviewViewer } from "@/components/ReviewViewer";
import { SpecificationViewer } from "@/components/SpecificationViewer";
import type { FullDraftResult, InventionInput } from "@/types/patentDraft";

const initialInput: InventionInput = {
  projectName: "특허명세서 자동작성 MVP",
  inventionContent: "사용자가 업로드한 회의록과 사업계획서에서 발명의 핵심 구성을 추출하고, 국내 특허명세서 목차에 맞춰 초안을 생성하는 시스템.",
  attachmentText: "시스템은 자료 유형을 판별하고, 발명 분석표를 생성하며, 누락 질의를 생성하고, 청구항과 도면 프롬프트를 자동 생성한다.",
  materialType: "발명제안서",
  desiredClaimCount: 5,
  desiredDrawingCount: 5,
  inventionType: "시스템 발명"
};

const tabs = ["분석표", "명세서", "청구항", "도면 프롬프트", "정합성 검토", "Markdown"] as const;
type Tab = (typeof tabs)[number];

export default function Home() {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState<FullDraftResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("분석표");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/full-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error(`API 오류: ${response.status}`);
      setResult((await response.json()) as FullDraftResult);
      setActiveTab("분석표");
    } catch (err) {
      setError(err instanceof Error ? err.message : "초안 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid">
      <header>
        <h1>특허명세서 자동작성 MVP</h1>
        <p>현재 1차 작업 범위: 타입 정의, 프롬프트 모듈, API 스켈레톤, mock LLM 기반 /api/full-draft 동작.</p>
      </header>
      <InventionInputForm value={input} loading={loading} onChange={setInput} onSubmit={submit} />
      {error && <p role="alert">{error}</p>}
      {result && (
        <section className="card">
          <div className="tabs">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
          {activeTab === "분석표" && <AnalysisViewer analysis={result.analysis} />}
          {activeTab === "명세서" && <SpecificationViewer specification={result.specification} />}
          {activeTab === "청구항" && <ClaimsViewer claims={result.claims} />}
          {activeTab === "도면 프롬프트" && <DrawingPromptViewer drawingPrompts={result.drawing_prompts} />}
          {activeTab === "정합성 검토" && <ReviewViewer review={result.review} />}
          {activeTab === "Markdown" && <MarkdownResultViewer markdown={result.markdown} />}
        </section>
      )}
    </main>
  );
}
