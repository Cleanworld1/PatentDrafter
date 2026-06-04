import { create } from "zustand";

interface MobileShellState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  closeAllPanels: () => void;
}

export const useMobileShellStore = create<MobileShellState>((set, get) => ({
  sidebarOpen: false,
  settingsOpen: false,
  openSidebar: () => set({ sidebarOpen: true, settingsOpen: false }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => {
    const open = !get().sidebarOpen;
    set({ sidebarOpen: open, settingsOpen: open ? false : get().settingsOpen });
  },
  openSettings: () => set({ settingsOpen: true, sidebarOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => {
    const open = !get().settingsOpen;
    set({ settingsOpen: open, sidebarOpen: open ? false : get().sidebarOpen });
  },
  closeAllPanels: () => set({ sidebarOpen: false, settingsOpen: false })
}));
