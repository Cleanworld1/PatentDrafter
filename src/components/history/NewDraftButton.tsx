"use client";

import { useMobileShellStore } from "@/store/mobileShellStore";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function NewDraftButton() {
  const createNewProject = usePatentDraftStore((s) => s.createNewProject);
  const closeSidebar = useMobileShellStore((s) => s.closeSidebar);

  return (
    <button
      type="button"
      className="new-draft-btn"
      onClick={() => {
        createNewProject();
        closeSidebar();
      }}
    >
      + 새 명세서 작성
    </button>
  );
}
