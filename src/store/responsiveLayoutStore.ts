import { create } from "zustand";

/** 태블릿·폴드 펼침 화면 등 — 사이드 패널을 드로어로 전환 */
export const COMPACT_LAYOUT_MAX_WIDTH = 1200;

interface ResponsiveLayoutState {
  isCompact: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  setIsCompact: (value: boolean) => void;
  openSidebar: () => void;
  openSettings: () => void;
  closePanels: () => void;
  toggleSidebar: () => void;
  toggleSettings: () => void;
}

export const useResponsiveLayoutStore = create<ResponsiveLayoutState>((set, get) => ({
  isCompact: false,
  sidebarOpen: false,
  settingsOpen: false,
  setIsCompact: (isCompact) => {
    set({ isCompact });
    if (!isCompact) {
      set({ sidebarOpen: false, settingsOpen: false });
    }
  },
  openSidebar: () => set({ sidebarOpen: true, settingsOpen: false }),
  openSettings: () => set({ settingsOpen: true, sidebarOpen: false }),
  closePanels: () => set({ sidebarOpen: false, settingsOpen: false }),
  toggleSidebar: () => {
    const { sidebarOpen } = get();
    if (sidebarOpen) {
      set({ sidebarOpen: false });
      return;
    }
    set({ sidebarOpen: true, settingsOpen: false });
  },
  toggleSettings: () => {
    const { settingsOpen } = get();
    if (settingsOpen) {
      set({ settingsOpen: false });
      return;
    }
    set({ settingsOpen: true, sidebarOpen: false });
  }
}));
