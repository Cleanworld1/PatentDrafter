"use client";

import { useCallback, useEffect } from "react";
import { fetchGeminiConfig } from "@/lib/client/fetchGeminiConfig";
import { useGeminiConfigStore } from "@/store/geminiConfigStore";

export function GeminiConfigLoader() {
  const setGeminiConfig = useGeminiConfigStore((s) => s.setGeminiConfig);
  const setConfigLoadState = useGeminiConfigStore((s) => s.setConfigLoadState);

  const load = useCallback(async () => {
    setConfigLoadState({ configLoaded: false, configError: null });
    try {
      const data = await fetchGeminiConfig();
      setGeminiConfig({
        drawingConfigured: data.drawingConfigured,
        imageModel: data.imageModel,
        studioUrl: data.studioUrl
      });
      setConfigLoadState({ configLoaded: true, configError: null });
    } catch (err) {
      setConfigLoadState({
        configLoaded: true,
        configError: err instanceof Error ? err.message : "Gemini 설정을 불러오지 못했습니다."
      });
    }
  }, [setConfigLoadState, setGeminiConfig]);

  useEffect(() => {
    void load();
  }, [load]);

  return null;
}
