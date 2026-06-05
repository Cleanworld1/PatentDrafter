"use client";

import { DRAWING_REFERENCE_NUMBER_RULES } from "@/knowledge/drawingReferenceNumberRules";
import type { DrawingPrompt } from "@/types/patentDraft";

const TYPE_META: Record<
  DrawingPrompt["drawing_type"],
  { label: string; accent: string; icon: string }
> = {
  시스템도: { label: "시스템", accent: "system", icon: "⬡" },
  구성도: { label: "구성", accent: "block", icon: "▣" },
  흐름도: { label: "흐름", accent: "flow", icon: "→" },
  UI도: { label: "UI", accent: "ui", icon: "▭" },
  "기계 구조도": { label: "기계", accent: "mechanical", icon: "⚙" }
};

function DrawingTypeIcon({ type }: { type: DrawingPrompt["drawing_type"] }) {
  const meta = TYPE_META[type] ?? TYPE_META["시스템도"];
  return (
    <span className={`drawing-type-icon drawing-type-icon--${meta.accent}`} aria-hidden>
      {meta.icon}
    </span>
  );
}

function ElementDiagram({ elements }: { elements: string[] }) {
  const items = elements.filter((e) => e.trim());
  if (items.length === 0) {
    return <p className="drawing-diagram-empty">표시할 구성요소 없음</p>;
  }
  return (
    <div className="drawing-element-diagram">
      {items.map((el, i) => (
        <div key={`${el}-${i}`} className="drawing-element-node">
          <span className="drawing-element-node-num">{i + 1}</span>
          <span className="drawing-element-node-label">{el}</span>
        </div>
      ))}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  text,
  variant
}: {
  icon: string;
  label: string;
  text: string;
  variant: "layout" | "flow" | "ref" | "style";
}) {
  return (
    <div className={`drawing-info-tile drawing-info-tile--${variant}`}>
      <div className="drawing-info-tile-head">
        <span className="drawing-info-tile-icon" aria-hidden>
          {icon}
        </span>
        <span className="drawing-info-tile-label">{label}</span>
      </div>
      <p className="drawing-info-tile-text">{text || "—"}</p>
    </div>
  );
}

function DrawingPromptCard({ prompt }: { prompt: DrawingPrompt }) {
  const meta = TYPE_META[prompt.drawing_type] ?? TYPE_META["시스템도"];

  return (
    <article className={`drawing-prompt-card drawing-prompt-card--${meta.accent}`}>
      <div className="drawing-prompt-card-accent" aria-hidden>
        <span className="drawing-prompt-figure-num">{prompt.figure_number}</span>
      </div>

      <div className="drawing-prompt-card-main">
        <header className="drawing-prompt-card-header">
          <DrawingTypeIcon type={prompt.drawing_type} />
          <div className="drawing-prompt-card-titles">
            <span className="drawing-prompt-eyebrow">
              도 {prompt.figure_number} · {meta.label} ({prompt.drawing_type})
            </span>
            <h3 className="drawing-prompt-card-title">{prompt.title}</h3>
          </div>
        </header>

        <div className="drawing-prompt-purpose-box">
          <span className="drawing-prompt-purpose-label">도면 목적</span>
          <p>{prompt.purpose || "—"}</p>
        </div>

        {prompt.claim_support && prompt.claim_support.length > 0 && (
          <div className="drawing-prompt-claim-tags">
            {prompt.claim_support.map((n) => (
              <span key={n} className="drawing-claim-tag">
                청구항 {n}
              </span>
            ))}
          </div>
        )}

        <section className="drawing-prompt-block">
          <h4 className="drawing-prompt-block-title">필수 구성요소 배치</h4>
          <ElementDiagram elements={prompt.required_elements} />
        </section>

        <div className="drawing-info-tiles">
          <InfoTile
            icon="⊞"
            label="상대 배치"
            text={prompt.relative_layout}
            variant="layout"
          />
          <InfoTile
            icon="↔"
            label="연결·화살표"
            text={prompt.arrows_or_connections}
            variant="flow"
          />
          <InfoTile
            icon="①"
            label="참조부호"
            text={prompt.reference_number_guidance}
            variant="ref"
          />
          <InfoTile
            icon="◻"
            label="스타일"
            text={prompt.style_instruction}
            variant="style"
          />
        </div>
      </div>
    </article>
  );
}

function DrawingSummaryBar({ prompts }: { prompts: DrawingPrompt[] }) {
  const typeCounts = prompts.reduce<Record<string, number>>((acc, p) => {
    acc[p.drawing_type] = (acc[p.drawing_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="drawing-summary-bar">
      <div className="drawing-summary-stat">
        <span className="drawing-summary-stat-value">{prompts.length}</span>
        <span className="drawing-summary-stat-label">도면</span>
      </div>
      <div className="drawing-summary-types">
        {Object.entries(typeCounts).map(([type, count]) => (
          <span key={type} className="drawing-summary-type-chip">
            {TYPE_META[type as DrawingPrompt["drawing_type"]]?.icon ?? "◻"} {type} {count}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DrawingPromptsView({ prompts }: { prompts: DrawingPrompt[] }) {
  const sorted = [...prompts].sort((a, b) => a.figure_number - b.figure_number);

  return (
    <div className="structured-data-view drawing-prompts-view">
      <div className="drawing-ref-rules-banner" role="note">
        <strong>참조부호 원칙</strong>
        <p>{DRAWING_REFERENCE_NUMBER_RULES.replace(/^- /gm, "")}</p>
      </div>
      <DrawingSummaryBar prompts={sorted} />
      <p className="structured-data-intro drawing-prompts-intro">
        각 카드는 도면 작성·이미지 생성 AI에 넣을 지시입니다. 왼쪽 번호는 도면 순서, 색 띠는 도면
        유형을 나타냅니다.
      </p>
      <div className="drawing-prompt-list">
        {sorted.map((prompt) => (
          <DrawingPromptCard key={prompt.figure_number} prompt={prompt} />
        ))}
      </div>
    </div>
  );
}
