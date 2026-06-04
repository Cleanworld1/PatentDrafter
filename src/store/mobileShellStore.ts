import { create } from "zustand";

interface MobileShellState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  closePanels: () => void;
}

export const useMobileShellStore = create<MobileShellState>((set, get) => ({
  sidebarOpen: false,
  settingsOpen: false,
  setSidebarOpen: (open) =>
    set((state) => ({
      sidebarOpen: open,
      settingsOpen: open ? false : state.settingsOpen
    })),
  setSettingsOpen: (open) =>
    set((state) => ({
      settingsOpen: open,
      sidebarOpen: open ? false : state.sidebarOpen
    })),
  toggleSidebar: () => {
    const next = !get().sidebarOpen;
    get().setSidebarOpen(next);
  },
  toggleSettings: () => {
    const next = !get().settingsOpen;
    get().setSettingsOpen(next);
  },
  closePanels: () => set({ sidebarOpen: false, settingsOpen: false })
}));
