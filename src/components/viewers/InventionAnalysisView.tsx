"use client";

import {
  BulletList,
  ChipList,
  DataField,
  DataSection
} from "@/components/viewers/DataViewPrimitives";
import type { InventionAnalysis } from "@/types/patentDraft";

export function InventionAnalysisView({ analysis }: { analysis: InventionAnalysis }) {
  return (
    <div className="structured-data-view analysis-view">
      <header className="structured-data-hero">
        <p className="structured-data-hero-label">한 줄 요약</p>
        <p className="structured-data-hero-text">{analysis.one_line_summary || "—"}</p>
        {analysis.title_candidates.length > 0 && (
          <div className="structured-data-hero-chips">
            <span className="structured-data-hero-chips-label">명칭 후보</span>
            <ChipList items={analysis.title_candidates} emptyLabel="" />
          </div>
        )}
      </header>

      <DataSection title="기술 분야·핵심" variant="highlight">
        <DataField label="기술분야" value={analysis.technical_field} />
        <DataField label="핵심 아이디어" value={analysis.core_idea} />
      </DataSection>

      <DataSection title="종래 기술·문제점">
        <DataField label="종래 기술" value={analysis.prior_art} />
        <div className="data-field">
          <span className="data-field-label">종래 기술의 문제</span>
          <BulletList items={analysis.prior_art_problems} />
        </div>
      </DataSection>

      <DataSection title="해결 과제">
        <BulletList items={analysis.problem_to_solve} />
      </DataSection>

      <DataSection title="구성요소">
        <div className="data-field">
          <span className="data-field-label">필수 구성</span>
          <ChipList items={analysis.essential_elements} />
        </div>
        <div className="data-field">
          <span className="data-field-label">선택 구성</span>
          <ChipList items={analysis.optional_elements} />
        </div>
        <div className="data-field">
          <span className="data-field-label">구성 간 관계</span>
          <BulletList items={analysis.element_relationships} />
        </div>
      </DataSection>

      <DataSection title="동작·데이터 흐름">
        <div className="data-field">
          <span className="data-field-label">동작 흐름</span>
          <BulletList items={analysis.operation_flow} />
        </div>
        <div className="data-field-grid">
          <div className="data-field">
            <span className="data-field-label">입력 데이터</span>
            <BulletList items={analysis.data_inputs} />
          </div>
          <div className="data-field">
            <span className="data-field-label">출력 데이터</span>
            <BulletList items={analysis.data_outputs} />
          </div>
        </div>
        <div className="data-field">
          <span className="data-field-label">제어·조건</span>
          <BulletList items={analysis.control_conditions} />
        </div>
        <div className="data-field">
          <span className="data-field-label">예외·변형</span>
          <BulletList items={[...analysis.exception_cases, ...analysis.variation_examples]} />
        </div>
      </DataSection>

      <DataSection title="효과·청구·도면">
        <div className="data-field">
          <span className="data-field-label">기대 효과</span>
          <BulletList items={analysis.expected_effects} />
        </div>
        <div className="data-field">
          <span className="data-field-label">청구 포인트</span>
          <BulletList items={analysis.claim_points} />
        </div>
        <div className="data-field">
          <span className="data-field-label">도면 후보</span>
          <ChipList items={analysis.drawing_candidates} />
        </div>
      </DataSection>

      <DataSection title="자료 분석 메모">
        <div className="data-field">
          <span className="data-field-label">시각 자료</span>
          <BulletList items={analysis.visual_material_analysis} />
        </div>
        <div className="data-field">
          <span className="data-field-label">문서 구조</span>
          <BulletList items={analysis.document_structure_analysis} />
        </div>
        <div className="data-field">
          <span className="data-field-label">표·실험 데이터</span>
          <BulletList items={analysis.table_or_experiment_data_analysis} />
        </div>
      </DataSection>

      {(analysis.unclear_points.length > 0 || analysis.do_not_invent.length > 0) && (
        <DataSection title="확인·주의" variant="warning">
          <div className="data-field">
            <span className="data-field-label">불명확한 점</span>
            <BulletList items={analysis.unclear_points} emptyLabel="없음" />
          </div>
          <div className="data-field">
            <span className="data-field-label">임의 생성 금지</span>
            <BulletList items={analysis.do_not_invent} emptyLabel="없음" />
          </div>
        </DataSection>
      )}
    </div>
  );
}
