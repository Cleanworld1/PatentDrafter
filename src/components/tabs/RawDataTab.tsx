"use client";

import { downloadTextFile, sanitizeDownloadBaseName } from "@/lib/downloadTextFile";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function RawDataTab() {
  const getJsonPayload = usePatentDraftStore((s) => s.getJsonPayload);
  const projectTitle = usePatentDraftStore((s) => s.currentProject.title);

  const handleDownload = () => {
    const payload = getJsonPayload();
    const text = JSON.stringify(payload, null, 2);
    const base = sanitizeDownloadBaseName(projectTitle);
    downloadTextFile(text, `${base}_raw-data.txt`);
  };

  return (
    <div className="tab-panel raw-data-tab">
      <div className="raw-data-card">
        <h2 className="raw-data-title">원본 데이터 (Raw)</h2>
        <p className="raw-data-desc">
          프로젝트·분석표·명세서·청구항·도면 프롬프트 등 전체 상태를 JSON 형식의 텍스트 파일로
          내려받을 수 있습니다. 화면에는 표시하지 않습니다.
        </p>
        <button type="button" className="btn-primary raw-data-download-btn" onClick={handleDownload}>
          <DownloadIcon />
          TXT 다운로드
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
