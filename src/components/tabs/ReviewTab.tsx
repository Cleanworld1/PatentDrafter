"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";

export function ReviewTab() {
  const review = usePatentDraftStore((s) => s.review);

  if (!review) {
    return <div className="tab-empty">정합성 검토 결과가 아직 없습니다. &quot;정합성 검토&quot;를 실행하세요.</div>;
  }

  const sections = [
    { title: "청구항 지지 검토", items: review.claim_support_check },
    { title: "용어 일관성 검토", items: review.term_consistency_check },
    { title: "도면-본문 정합성", items: review.drawing_spec_consistency_check },
    { title: "효과 인과관계", items: review.effect_causality_check },
    { title: "과소한 한정 위험", items: review.over_narrowing_risk },
    { title: "과도한 추상화 위험", items: review.over_abstraction_risk },
    { title: "추가 확인 질문", items: review.additional_questions }
  ];

  return (
    <div className="tab-panel review-tab">
      {sections.map((section) => (
        <section key={section.title} className="review-section">
          <h3>{section.title}</h3>
          <ul>
            {section.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
