"use client";

import { useCallback, useEffect } from "react";
import { fetchOpenAiConfig } from "@/lib/client/fetchOpenAiConfig";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

/** 앱 시작 시 서버 OpenAI 설정을 한 번 불러옵니다. */
export function OpenAiConfigLoader() {
  const setServerConfig = useSessionApiKeyStore((s) => s.setServerConfig);
  const setConfigLoadState = useSessionApiKeyStore((s) => s.setConfigLoadState);

  const load = useCallback(async () => {
    setConfigLoadState({ configLoaded: false, configError: null });
    try {
      const data = await fetchOpenAiConfig();
      setServerConfig({
        suggestedModel: data.suggestedModel,
        serverFallbackAvailable: data.serverFallbackAvailable,
        devMockAllowed: data.devMockAllowed,
        envProjectConfigured: data.envProjectConfigured,
        envOrganizationConfigured: data.envOrganizationConfigured
      });
      setConfigLoadState({ configLoaded: true, configError: null });
    } catch (err) {
      setConfigLoadState({
        configLoaded: true,
        configError: err instanceof Error ? err.message : "OpenAI 설정을 불러오지 못했습니다."
      });
    }
  }, [setConfigLoadState, setServerConfig]);

  useEffect(() => {
    void load();
  }, [load]);

  return null;
}
