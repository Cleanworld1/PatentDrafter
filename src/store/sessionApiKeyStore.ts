import { getOpenAiKeySetupMessage } from "@/lib/openAiSetupMessage";
import { create } from "zustand";

const DEFAULT_MODEL = "gpt-4o";

interface OpenAiSessionState {
  selectedModel: string;
  customModel: string;
  useCustomModel: boolean;
  serverFallbackAvailable: boolean;
  devMockAllowed: boolean;
  suggestedModel: string;
  envProjectConfigured: boolean;
  envOrganizationConfigured: boolean;
  configLoaded: boolean;
  configError: string | null;

  setSelectedModel: (model: string) => void;
  setCustomModel: (model: string) => void;
  setUseCustomModel: (use: boolean) => void;
  setServerConfig: (config: {
    serverFallbackAvailable: boolean;
    devMockAllowed?: boolean;
    suggestedModel: string;
    envProjectConfigured?: boolean;
    envOrganizationConfigured?: boolean;
  }) => void;
  setConfigLoadState: (state: { configLoaded: boolean; configError: string | null }) => void;
  getModelForRequest: () => string;
  canRunAi: () => boolean;
}

export const useSessionApiKeyStore = create<OpenAiSessionState>((set, get) => ({
  selectedModel: DEFAULT_MODEL,
  customModel: "",
  useCustomModel: false,
  serverFallbackAvailable: false,
  devMockAllowed: false,
  suggestedModel: DEFAULT_MODEL,
  envProjectConfigured: false,
  envOrganizationConfigured: false,
  configLoaded: false,
  configError: null,

  setSelectedModel: (model) => set({ selectedModel: model }),

  setCustomModel: (customModel) => set({ customModel }),

  setUseCustomModel: (useCustomModel) => set({ useCustomModel }),

  setServerConfig: ({
    serverFallbackAvailable,
    devMockAllowed,
    suggestedModel,
    envProjectConfigured,
    envOrganizationConfigured
  }) =>
    set({
      serverFallbackAvailable,
      devMockAllowed: Boolean(devMockAllowed),
      suggestedModel,
      envProjectConfigured: Boolean(envProjectConfigured),
      envOrganizationConfigured: Boolean(envOrganizationConfigured),
      selectedModel: get().selectedModel === DEFAULT_MODEL ? suggestedModel : get().selectedModel
    }),

  setConfigLoadState: ({ configLoaded, configError }) => set({ configLoaded, configError }),

  getModelForRequest: () => {
    const state = get();
    if (state.useCustomModel && state.customModel.trim()) {
      return state.customModel.trim();
    }
    return state.selectedModel;
  },

  canRunAi: () => {
    const state = get();
    return state.serverFallbackAvailable || state.devMockAllowed;
  }
}));

export function getModelForRequest(): string {
  return useSessionApiKeyStore.getState().getModelForRequest();
}

export function assertCanRunAi(): void {
  if (useSessionApiKeyStore.getState().canRunAi()) return;
  const host = typeof window !== "undefined" ? window.location.hostname : undefined;
  throw new Error(getOpenAiKeySetupMessage(host));
}
