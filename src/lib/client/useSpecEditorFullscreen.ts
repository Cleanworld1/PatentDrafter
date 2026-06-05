"use client";

import { useEffect } from "react";
import { useSpecEditorViewportStore } from "@/store/specEditorViewportStore";

const BODY_CLASS = "spec-editor-fullscreen-active";

/** 전체화면 모드: body 클래스 + Esc로 종료 */
export function useSpecEditorFullscreen() {
  const fullscreen = useSpecEditorViewportStore((s) => s.fullscreen);
  const setFullscreen = useSpecEditorViewportStore((s) => s.setFullscreen);

  useEffect(() => {
    if (fullscreen) {
      document.body.classList.add(BODY_CLASS);
    } else {
      document.body.classList.remove(BODY_CLASS);
    }
    return () => document.body.classList.remove(BODY_CLASS);
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, setFullscreen]);
}
