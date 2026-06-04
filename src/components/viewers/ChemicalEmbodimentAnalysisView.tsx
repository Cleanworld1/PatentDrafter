"use client";

import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";

interface Props {
  data: ChemicalEmbodimentAnalysis;
}

export function ChemicalEmbodimentAnalysisView({ data }: Props) {
  return (
    <section className="chemical-embodiment-view">
      <header className="chemical-embodiment-view-header">
        <h3>2단계 실시예/비교예 분석</h3>
        <p className="chemical-embodiment-view-sub">
          발명 유형: <strong>{data.invention_subtype || "—"}</strong>
        </p>
        {data.writing_guidelines_summary && (
          <p className="chemical-embodiment-view-summary">{data.writing_guidelines_summary}</p>
        )}
      </header>

      {data.numerical_ranges.length > 0 && (
        <div className="analysis-block">
          <h4>수치한정 가이드</h4>
          <ul>
            {data.numerical_ranges.map((r) => (
              <li key={r.parameter_name}>
                <strong>{r.parameter_name}</strong>: {r.full_range}
                {r.preferred_range ? ` (바람직: ${r.preferred_range})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.examples.length > 0 && (
        <div className="analysis-block">
          <h4>실시예 / 비교예</h4>
          {data.examples.map((ex) => (
            <article key={ex.id} className="chemical-example-card">
              <h5>
                {ex.label}{" "}
                <span className="chemical-example-kind">
                  {ex.kind === "comparative"
                    ? "비교예"
                    : ex.kind === "preferred_embodiment"
                      ? "바람직한 실시예"
                      : "실시예"}
                </span>
              </h5>
              <p>{ex.process_conditions}</p>
              {ex.results && <p className="chemical-example-results">결과: {ex.results}</p>}
            </article>
          ))}
        </div>
      )}

      {data.tables.map((table, i) => (
        <div key={`table-${i}`} className="analysis-block chemical-table-block">
          <h4>{table.caption}</h4>
          <div
            className="chemical-html-table-wrap"
            dangerouslySetInnerHTML={{ __html: table.html_table }}
          />
          {table.interpretation && <p className="chemical-table-interpretation">{table.interpretation}</p>}
        </div>
      ))}

      {data.graph_drawings.length > 0 && (
        <div className="analysis-block">
          <h4>데이터 그래프 도면 지시</h4>
          <ul>
            {data.graph_drawings.map((g) => (
              <li key={g.title}>
                <strong>{g.title}</strong> ({g.chart_type}): {g.purpose}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.uncertainties.length > 0 && (
        <div className="analysis-block">
          <h4>확인 필요</h4>
          <ul>
            {data.uncertainties.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
