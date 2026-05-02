import { create } from "zustand";
import { getSettings, updateSetting } from "../services/settingsService";

export type AIProvider = "anthropic" | "openai" | "openrouter" | "dashscope" | "google" | "minimax" | "deepseek" | "ollama" | "lmstudio" | "custom";

export const DEFAULT_BASE_URLS: Partial<Record<AIProvider, string>> = {
  ollama: "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1",
  custom: "",
};

const DEFAULT_MODEL_BY_PROVIDER: Record<AIProvider, string> = {
  anthropic: "claude-opus-4-7",
  openai: "auto",
  openrouter: "openrouter/free",
  dashscope: "qwen3.6-plus",
  google: "auto",
  minimax: "MiniMax-M2.7",
  deepseek: "deepseek-v4-flash",
  ollama: "llama3.1",
  lmstudio: "",
  custom: "",
};

const VALID_PROVIDERS: AIProvider[] = ["anthropic", "openai", "openrouter", "dashscope", "google", "minimax", "deepseek", "ollama", "lmstudio", "custom"];
const providerModelSettingKey = (provider: AIProvider) => `ai_model_${provider}`;

interface AISettingsState {
  apiKey: string;
  provider: AIProvider;
  model: string;
  providerModels: Partial<Record<AIProvider, string>>;
  customBaseUrl: string;
  isLoaded: boolean;
  loadFromDB: () => Promise<void>;
  setApiKey: (key: string) => void;
  setProvider: (provider: AIProvider) => Promise<void>;
  setModel: (model: string) => void;
  setCustomBaseUrl: (url: string) => void;
}

export const useAISettingsStore = create<AISettingsState>((set) => ({
  apiKey: "",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  providerModels: {},
  customBaseUrl: "",
  isLoaded: false,

  loadFromDB: async () => {
    try {
      const settings = await getSettings();
      const provider = VALID_PROVIDERS.includes(settings.ai_provider as AIProvider)
        ? (settings.ai_provider as AIProvider)
        : "anthropic";

      const defaultModel = DEFAULT_MODEL_BY_PROVIDER[provider] || "";
      const savedProviderModel = settings[providerModelSettingKey(provider)];
      const model = savedProviderModel || settings.ai_model || defaultModel;
      const providerModels = VALID_PROVIDERS.reduce<Partial<Record<AIProvider, string>>>(
        (acc, p) => {
          const saved = settings[providerModelSettingKey(p)];
          if (saved) acc[p] = saved;
          return acc;
        },
        {}
      );
      if (model) providerModels[provider] = model;

      const customBaseUrl = settings.ai_custom_base_url || DEFAULT_BASE_URLS[provider] || "";
      const providerKey = settings[`ai_api_key_${provider}` as keyof typeof settings] || "";

      let apiKey = providerKey;
      if (!providerKey && settings.ai_api_key) {
        const anyProviderKeyExists = VALID_PROVIDERS.some(
          (p) => !!settings[`ai_api_key_${p}` as keyof typeof settings]
        );
        if (!anyProviderKeyExists) {
          apiKey = settings.ai_api_key;
          updateSetting(`ai_api_key_${provider}`, settings.ai_api_key).catch(() => {});
        }
      }

      set({
        apiKey,
        provider,
        model,
        providerModels,
        customBaseUrl,
        isLoaded: true,
      });
    } catch (e) {
      console.error("Failed to load AI settings from DB:", e);
      set({ isLoaded: true });
    }
  },

  setApiKey: (key) => {
    const { provider } = useAISettingsStore.getState();
    set({ apiKey: key });
    updateSetting(`ai_api_key_${provider}`, key).catch((e) =>
      console.error("Failed to save api key:", e)
    );
  },

  setProvider: async (provider) => {
    const previous = useAISettingsStore.getState();
    const providerModels = {
      ...previous.providerModels,
      ...(previous.model ? { [previous.provider]: previous.model } : {}),
    };
    if (previous.model) {
      updateSetting(providerModelSettingKey(previous.provider), previous.model).catch((e) =>
        console.error("Failed to save current provider model:", e)
      );
    }

    const firstModel = DEFAULT_MODEL_BY_PROVIDER[provider] || "";
    const defaultBaseUrl = DEFAULT_BASE_URLS[provider] || "";
    try {
      const settings = await getSettings();
      const providerKey = settings[`ai_api_key_${provider}` as keyof typeof settings] || "";
      const savedProviderModel = settings[providerModelSettingKey(provider)];
      const nextModel = providerModels[provider] || savedProviderModel || firstModel;
      const savedBaseUrl = settings.ai_custom_base_url || defaultBaseUrl;
      set({
        provider,
        model: nextModel,
        providerModels: { ...providerModels, ...(nextModel ? { [provider]: nextModel } : {}) },
        apiKey: providerKey,
        customBaseUrl: savedBaseUrl,
      });
      updateSetting("ai_model", nextModel).catch((e) =>
        console.error("Failed to save model:", e)
      );
      if (nextModel) {
        updateSetting(providerModelSettingKey(provider), nextModel).catch((e) =>
          console.error("Failed to save provider model:", e)
        );
      }
    } catch {
      const nextModel = providerModels[provider] || firstModel;
      set({
        provider,
        model: nextModel,
        providerModels: { ...providerModels, ...(nextModel ? { [provider]: nextModel } : {}) },
        apiKey: "",
        customBaseUrl: defaultBaseUrl,
      });
      updateSetting("ai_model", nextModel).catch((e) =>
        console.error("Failed to save model:", e)
      );
      if (nextModel) {
        updateSetting(providerModelSettingKey(provider), nextModel).catch((e) =>
          console.error("Failed to save provider model:", e)
        );
      }
    }
    updateSetting("ai_provider", provider).catch((e) =>
      console.error("Failed to save provider:", e)
    );
  },

  setModel: (model) => {
    const { provider } = useAISettingsStore.getState();
    set((prev) => ({
      model,
      providerModels: { ...prev.providerModels, [provider]: model },
    }));
    updateSetting(providerModelSettingKey(provider), model).catch((e) =>
      console.error("Failed to save provider model:", e)
    );
    updateSetting("ai_model", model).catch((e) =>
      console.error("Failed to save model:", e)
    );
  },

  setCustomBaseUrl: (url) => {
    set({ customBaseUrl: url });
    updateSetting("ai_custom_base_url", url).catch((e) =>
      console.error("Failed to save custom base url:", e)
    );
  },
}));
