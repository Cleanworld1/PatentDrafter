"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";

export function ClaimsTab() {
  const claims = usePatentDraftStore((s) => s.claims);

  if (claims.length === 0) {
    return <div className="tab-empty">청구항이 아직 생성되지 않았습니다.</div>;
  }

  return (
    <div className="tab-panel claims-tab">
      {claims.map((claim) => (
        <article key={claim.claim_number} className="claim-card">
          <h3>청구항 {claim.claim_number} ({claim.category})</h3>
          <p>{claim.text}</p>
          {claim.support_notes && claim.support_notes.length > 0 && (
            <p className="claim-notes">지지 메모: {claim.support_notes.join(", ")}</p>
          )}
        </article>
      ))}
    </div>
  );
}
