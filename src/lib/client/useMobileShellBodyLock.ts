"use client";

import { useEffect } from "react";
import { useMobileShellStore } from "@/store/mobileShellStore";

/** 모바일 드로어 열림 시 배경 스크롤 잠금 */
export function useMobileShellBodyLock(): void {
  const sidebarOpen = useMobileShellStore((s) => s.sidebarOpen);
  const settingsOpen = useMobileShellStore((s) => s.settingsOpen);

  const closeAllPanels = useMobileShellStore((s) => s.closeAllPanels);

  useEffect(() => {
    const open = sidebarOpen || settingsOpen;
    document.body.classList.toggle("mobile-shell-locked", open);
    return () => document.body.classList.remove("mobile-shell-locked");
  }, [sidebarOpen, settingsOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAllPanels();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAllPanels]);
}
