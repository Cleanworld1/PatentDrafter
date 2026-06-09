"use client";

import { useEffect } from "react";
import {
  COMPACT_LAYOUT_MAX_WIDTH,
  useResponsiveLayoutStore
} from "@/store/responsiveLayoutStore";
import { useSpecEditorViewportStore } from "@/store/specEditorViewportStore";

export function useResponsiveLayout(): void {
  const setIsCompact = useResponsiveLayoutStore((s) => s.setIsCompact);
  const isCompact = useResponsiveLayoutStore((s) => s.isCompact);
  const sidebarOpen = useResponsiveLayoutStore((s) => s.sidebarOpen);
  const settingsOpen = useResponsiveLayoutStore((s) => s.settingsOpen);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_LAYOUT_MAX_WIDTH}px)`);
    const apply = () => {
      const compact = mq.matches;
      setIsCompact(compact);
      if (compact) {
        useSpecEditorViewportStore.getState().setFullscreen(false);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [setIsCompact]);

  useEffect(() => {
    if (!isCompact) {
      document.body.classList.remove("layout-panel-open");
      return;
    }
    const lock = sidebarOpen || settingsOpen;
    document.body.classList.toggle("layout-panel-open", lock);
    return () => document.body.classList.remove("layout-panel-open");
  }, [isCompact, sidebarOpen, settingsOpen]);
}
