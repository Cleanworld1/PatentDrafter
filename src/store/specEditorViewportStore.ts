import { create } from "zustand";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.05;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

interface SpecEditorViewportState {
  fullscreen: boolean;
  zoom: number;
  setFullscreen: (value: boolean) => void;
  toggleFullscreen: () => void;
  setZoom: (value: number) => void;
  adjustZoom: (delta: number) => void;
  resetZoom: () => void;
}

export const useSpecEditorViewportStore = create<SpecEditorViewportState>((set, get) => ({
  fullscreen: false,
  zoom: 1,
  setFullscreen: (value) => set({ fullscreen: value }),
  toggleFullscreen: () => set({ fullscreen: !get().fullscreen }),
  setZoom: (value) => set({ zoom: clampZoom(value) }),
  adjustZoom: (delta) => set({ zoom: clampZoom(get().zoom + delta) }),
  resetZoom: () => set({ zoom: 1 })
}));

export function getSpecEditorZoomPercent(zoom: number): number {
  return Math.round(zoom * 100);
}
