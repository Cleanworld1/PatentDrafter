"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { OpenAiPublicConfig } from "@/lib/ai/getOpenAiPublicConfig";
import { fetchOpenAiConfig } from "@/lib/client/fetchOpenAiConfig";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

interface OpenAiConfigLoaderProps {
  initialConfig: OpenAiPublicConfig;
}

function applyPublicConfig(config: OpenAiPublicConfig): void {
  useSessionApiKeyStore.getState().setServerConfig({
    suggestedModel: config.suggestedModel,
    serverFallbackAvailable: config.serverFallbackAvailable,
    devMockAllowed: config.devMockAllowed,
    envProjectConfigured: config.envProjectConfigured,
    envOrganizationConfigured: config.envOrganizationConfigured
  });
}

/** 앱 시작 시 서버 설정을 즉시 반영한 뒤, API로 최신 상태를 갱신합니다. */
export function OpenAiConfigLoader({ initialConfig }: OpenAiConfigLoaderProps) {
  const setConfigLoadState = useSessionApiKeyStore((s) => s.setConfigLoadState);
  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    applyPublicConfig(initialConfig);
    setConfigLoadState({ configLoaded: true, configError: null });
  }, [initialConfig, setConfigLoadState]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOpenAiConfig();
      applyPublicConfig(data);
      setConfigLoadState({ configLoaded: true, configError: null });
    } catch (err) {
      setConfigLoadState({
        configLoaded: true,
        configError: err instanceof Error ? err.message : "OpenAI 설정을 불러오지 못했습니다."
      });
    }
  }, [setConfigLoadState]);

  useLayoutEffect(() => {
    void refresh();
  }, [refresh]);

  return null;
}

/** 설정 패널 등에서 수동 재시도 */
export async function refreshOpenAiConfigFromApi(): Promise<void> {
  const { setConfigLoadState } = useSessionApiKeyStore.getState();
  try {
    const data = await fetchOpenAiConfig();
    applyPublicConfig(data);
    setConfigLoadState({ configLoaded: true, configError: null });
  } catch (err) {
    setConfigLoadState({
      configLoaded: true,
      configError: err instanceof Error ? err.message : "OpenAI 설정을 불러오지 못했습니다."
    });
    throw err;
  }
}
