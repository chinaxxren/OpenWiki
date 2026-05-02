import type { TFunction } from "i18next";
import { SettingRow } from "./SettingsCommon";
import type { AIProvider } from "../../stores/aiSettingsStore";

interface AIModelOption {
  id: string;
  label: string;
  free?: boolean;
}

interface AISectionProps {
  provider: AIProvider;
  providerOptions: [AIProvider, string][];
  providerLabelsLoaded: boolean;
  currentProviderModels: AIModelOption[];
  aiCatalogLoadFailed: boolean;
  showsBaseUrl: boolean;
  isLocalNoAuth: boolean;
  customBaseUrl: string;
  model: string;
  draftApiKey: string | null;
  apiKey: string;
  showApiKey: boolean;
  apiKeySaved: boolean;
  testStatus: "idle" | "testing" | "success" | "error";
  testMessage: string;
  oauthLoggedIn: boolean;
  oauthEmail: string;
  oauthLoading: boolean;
  geminiOauthLoggedIn: boolean;
  geminiOauthEmail: string;
  geminiOauthLoading: boolean;
  defaultBaseUrl: string;
  onProviderChange: (provider: AIProvider) => void;
  onCustomBaseUrlChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onDraftApiKeyChange: (value: string) => void;
  onToggleShowApiKey: () => void;
  onSaveApiKey: () => void;
  onTestConnection: () => Promise<void>;
  onOpenAIOAuthLogin: () => Promise<void>;
  onLogoutOAuth: () => Promise<void>;
  onGeminiOAuthLogin: () => Promise<void>;
  onLogoutGeminiOAuth: () => Promise<void>;
  t: TFunction<"settings">;
}

export function AISection({
  provider,
  providerOptions,
  providerLabelsLoaded,
  currentProviderModels,
  aiCatalogLoadFailed,
  showsBaseUrl,
  isLocalNoAuth,
  customBaseUrl,
  model,
  draftApiKey,
  apiKey,
  showApiKey,
  apiKeySaved,
  testStatus,
  testMessage,
  oauthLoggedIn,
  oauthEmail,
  oauthLoading,
  geminiOauthLoggedIn,
  geminiOauthEmail,
  geminiOauthLoading,
  defaultBaseUrl,
  onProviderChange,
  onCustomBaseUrlChange,
  onModelChange,
  onDraftApiKeyChange,
  onToggleShowApiKey,
  onSaveApiKey,
  onTestConnection,
  onOpenAIOAuthLogin,
  onLogoutOAuth,
  onGeminiOAuthLogin,
  onLogoutGeminiOAuth,
  t,
}: AISectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t("ai.title")}</h2>
      <div className="glass rounded-2xl divide-y divide-gray-100/50 dark:divide-white/[0.06]">
        <SettingRow label={t("ai.provider")}>
          <select
            value={provider}
            disabled={!providerLabelsLoaded}
            onChange={(e) => onProviderChange(e.target.value as AIProvider)}
            className="text-sm rounded-lg px-3 py-1.5 bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400/50 disabled:opacity-50"
          >
            {providerOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {providerOptions.length === 0 && (
              <option value={provider}>
                {aiCatalogLoadFailed ? "AI catalog load failed" : "Loading AI providers..."}
              </option>
            )}
          </select>
        </SettingRow>

        {showsBaseUrl && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("ai.baseUrl")}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {provider === "ollama"
                    ? t("ai.baseUrlOllamaHint")
                    : provider === "lmstudio"
                      ? t("ai.baseUrlLmStudioHint")
                      : t("ai.baseUrlCustomHint")}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => onCustomBaseUrlChange(e.target.value)}
              placeholder={defaultBaseUrl || "https://..."}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/50 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.08] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-400/50"
            />
          </div>
        )}

        <SettingRow label={t("ai.model")}>
          {showsBaseUrl ? (
            <>
              <input
                type="text"
                list={`model-suggestions-${provider}`}
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder={provider === "ollama" ? "llama3.1" : provider === "lmstudio" ? "qwen2.5-7b-instruct" : "model name"}
                className="text-sm rounded-lg px-3 py-1.5 bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400/50 w-[220px]"
              />
              {currentProviderModels.length > 0 && (
                <datalist id={`model-suggestions-${provider}`}>
                  {currentProviderModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </datalist>
              )}
            </>
          ) : (
            <select
              value={model}
              disabled={currentProviderModels.length === 0}
              onChange={(e) => onModelChange(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400/50 max-w-[220px] disabled:opacity-50"
            >
              {currentProviderModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.free ? "[Free] " : ""}{m.label}
                </option>
              ))}
              {currentProviderModels.length === 0 && (
                <option value={model}>
                  {aiCatalogLoadFailed ? "AI catalog load failed" : "Loading AI models..."}
                </option>
              )}
            </select>
          )}
        </SettingRow>

        {provider === "openai" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("ai.oauthTitle")}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("ai.oauthOpenAIDesc")}</div>
              </div>
            </div>
            {oauthLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 dark:text-green-400">{t("ai.oauthLoggedIn")}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{oauthEmail}</span>
                </div>
                <button
                  onClick={() => { void onLogoutOAuth(); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200/50 dark:border-white/[0.08] text-gray-500 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  {t("ai.oauthLogout")}
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => { void onOpenAIOAuthLogin(); }}
                  disabled={oauthLoading}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-[#10a37f] hover:bg-[#0d8c6d] text-white transition-colors disabled:opacity-50 disabled:cursor-default"
                >
                  {oauthLoading ? t("ai.oauthLoading") : t("ai.oauthLoginOpenAI")}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                  {t("ai.oauthOpenAIHint")}
                </p>
              </div>
            )}
          </div>
        )}

        {provider === "google" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("ai.oauthTitle")}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("ai.oauthGeminiDesc")}</div>
              </div>
            </div>
            {geminiOauthLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 dark:text-green-400">{t("ai.oauthLoggedIn")}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{geminiOauthEmail}</span>
                </div>
                <button
                  onClick={() => { void onLogoutGeminiOAuth(); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200/50 dark:border-white/[0.08] text-gray-500 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  {t("ai.oauthLogout")}
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => { void onGeminiOAuthLogin(); }}
                  disabled={geminiOauthLoading}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-[#4285f4] hover:bg-[#3367d6] text-white transition-colors disabled:opacity-50 disabled:cursor-default"
                >
                  {geminiOauthLoading ? t("ai.oauthLoading") : t("ai.oauthLoginGoogle")}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                  {t("ai.oauthGeminiHint")}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          {!isLocalNoAuth && (
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("ai.apiKey")}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {provider === "custom" ? t("ai.apiKeyOptionalDesc") : t("ai.apiKeyDesc")}
                </div>
              </div>
            </div>
          )}
          {!isLocalNoAuth && (
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={draftApiKey ?? apiKey}
                onChange={(e) => onDraftApiKeyChange(e.target.value)}
                placeholder={t("ai.apiKeyPlaceholder")}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/50 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.08] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-400/50"
              />
              <button
                onClick={onToggleShowApiKey}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200/50 dark:border-white/[0.08] text-gray-500 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors"
              >
                {showApiKey ? t("ai.apiKeyHide") : t("ai.apiKeyShow")}
              </button>
            </div>
          )}
          {isLocalNoAuth && (
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("ai.ollamaConnectionTitle")}</div>
          )}
          <div className={`flex gap-2 ${!isLocalNoAuth ? "mt-2" : ""}`}>
            {!isLocalNoAuth && (
              <button
                onClick={onSaveApiKey}
                disabled={draftApiKey === null || draftApiKey === apiKey}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors
                  disabled:opacity-30 disabled:cursor-default
                  bg-orange-500/10 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 dark:hover:bg-orange-500/25"
              >
                {apiKeySaved ? t("ai.apiKeySaved") : t("ai.apiKeySave")}
              </button>
            )}
            <button
              onClick={() => { void onTestConnection(); }}
              disabled={(!(draftApiKey ?? apiKey) && !isLocalNoAuth && provider !== "custom") || testStatus === "testing"}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors
                disabled:opacity-30 disabled:cursor-default
                bg-white/50 dark:bg-white/[0.04] border-gray-200/50 dark:border-white/[0.08] text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/[0.08]"
            >
              {testStatus === "testing" ? t("ai.testing") : t("ai.testConnection")}
            </button>
          </div>
          {testStatus === "success" && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">{t("ai.testSuccess", { message: testMessage })}</p>
          )}
          {testStatus === "error" && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">{t("ai.testFailed", { message: testMessage })}</p>
          )}
        </div>
      </div>
    </div>
  );
}
