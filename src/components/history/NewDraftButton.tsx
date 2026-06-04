"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";

export function NewDraftButton() {
  const createNewProject = usePatentDraftStore((s) => s.createNewProject);

  return (
    <button type="button" className="new-draft-btn" onClick={() => createNewProject()}>
      + 새 명세서 작성
    </button>
  );
}
