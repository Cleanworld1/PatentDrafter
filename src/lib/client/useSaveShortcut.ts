"use client";

import { useEffect } from "react";
import { usePatentDraftStore } from "@/store/patentDraftStore";

/** Ctrl+S / Cmd+S로 명세서 저장 */
export function useSaveShortcut(): void {
  const saveCurrentProject = usePatentDraftStore((s) => s.saveCurrentProject);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      saveCurrentProject();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCurrentProject]);
}
