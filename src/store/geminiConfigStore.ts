import { create } from "zustand";

interface GeminiConfigState {
  drawingConfigured: boolean;
  imageModel: string;
  studioUrl: string;
  configLoaded: boolean;
  configError: string | null;
  setGeminiConfig: (payload: {
    drawingConfigured: boolean;
    imageModel: string;
    studioUrl: string;
  }) => void;
  setConfigLoadState: (payload: { configLoaded: boolean; configError: string | null }) => void;
}

export const useGeminiConfigStore = create<GeminiConfigState>((set) => ({
  drawingConfigured: false,
  imageModel: "",
  studioUrl: "https://aistudio.google.com/",
  configLoaded: false,
  configError: null,
  setGeminiConfig: (payload) =>
    set({
      drawingConfigured: payload.drawingConfigured,
      imageModel: payload.imageModel,
      studioUrl: payload.studioUrl
    }),
  setConfigLoadState: (payload) =>
    set({
      configLoaded: payload.configLoaded,
      configError: payload.configError
    })
}));
