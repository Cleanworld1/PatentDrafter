"use client";

import { useEffect } from "react";
import { useMobileShellStore } from "@/store/mobileShellStore";

export function MobileShellBackdrop() {
  const sidebarOpen = useMobileShellStore((s) => s.sidebarOpen);
  const settingsOpen = useMobileShellStore((s) => s.settingsOpen);
  const closePanels = useMobileShellStore((s) => s.closePanels);

  const visible = sidebarOpen || settingsOpen;

  useEffect(() => {
    document.body.classList.toggle("mobile-shell-locked", visible);
    return () => document.body.classList.remove("mobile-shell-locked");
  }, [visible]);

  return (
    <button
      type="button"
      className={`mobile-shell-backdrop${visible ? " is-visible" : ""}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      aria-label="패널 닫기"
      onClick={closePanels}
    />
  );
}
