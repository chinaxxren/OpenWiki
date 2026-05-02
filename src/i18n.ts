import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const SUPPORTED_LANGUAGES = ["zh-CN", "en-US"] as const;
const ALL_NAMESPACES = ["common", "settings", "content", "wiki", "digest", "report", "dataHub", "update", "automation"] as const;
const DEFAULT_BOOT_NAMESPACES = ["common"] as const;
const FALLBACK_LANGUAGE = "zh-CN";
const LANGUAGE_MODE_KEY = "openwiki_language_mode";
const RESOLVED_LANGUAGE_KEY = "openwiki_language";

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type Namespace = (typeof ALL_NAMESPACES)[number];
type TranslationResource = Record<string, unknown>;
type LocaleModule = { default: TranslationResource };

const localeLoaders = import.meta.glob<LocaleModule>("./locales/*/*.json");
const localeResourceCache = new Map<string, Promise<TranslationResource>>();
let initPromise: Promise<void> | null = null;

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

function normalizeLanguage(language: string | null | undefined): SupportedLanguage | null {
  if (!language) return null;
  if (isSupportedLanguage(language)) return language;
  if (language.startsWith("zh")) return "zh-CN";
  if (language.startsWith("en")) return "en-US";
  return null;
}

function getInitialResolvedLanguage(): SupportedLanguage {
  const storedLanguage = localStorage.getItem(RESOLVED_LANGUAGE_KEY);
  return normalizeLanguage(storedLanguage) ?? getSystemLanguage();
}

async function loadNamespaceResource(language: SupportedLanguage, namespace: Namespace): Promise<TranslationResource> {
  const key = `./locales/${language}/${namespace}.json`;
  const loader = localeLoaders[key];
  if (!loader) {
    throw new Error(`Missing locale resource: ${key}`);
  }
  const mod = await loader();
  return mod.default;
}

function normalizeNamespaces(namespaces: readonly Namespace[]): Namespace[] {
  const normalized = namespaces.length > 0 ? namespaces : [...DEFAULT_BOOT_NAMESPACES];
  return [...new Set(normalized)];
}

function getResourceCacheKey(language: SupportedLanguage, namespace: Namespace): string {
  return `${language}:${namespace}`;
}

async function loadNamespaceResourceCached(language: SupportedLanguage, namespace: Namespace): Promise<TranslationResource> {
  const cacheKey = getResourceCacheKey(language, namespace);
  const cached = localeResourceCache.get(cacheKey);
  if (cached) return cached;

  const loading = loadNamespaceResource(language, namespace);
  localeResourceCache.set(cacheKey, loading);
  return loading;
}

async function loadLanguageResources(
  language: SupportedLanguage,
  namespaces: readonly Namespace[],
): Promise<Record<string, TranslationResource>> {
  const entries = await Promise.all(
    namespaces.map(async (namespace) => {
      const data = await loadNamespaceResourceCached(language, namespace);
      return [namespace, data] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function getLoadedNamespaces(language: SupportedLanguage): Namespace[] {
  return ALL_NAMESPACES.filter((namespace) =>
    i18n.hasResourceBundle(language, namespace)
  );
}

async function ensureLanguageNamespacesLoaded(
  language: SupportedLanguage,
  namespaces: readonly Namespace[],
): Promise<void> {
  const required = normalizeNamespaces(namespaces);
  const missing = required.filter((namespace) => !i18n.hasResourceBundle(language, namespace));
  if (missing.length === 0) return;

  const entries = await Promise.all(
    missing.map(async (namespace) => {
      const data = await loadNamespaceResourceCached(language, namespace);
      return [namespace, data] as const;
    }),
  );

  for (const [namespace, data] of entries) {
    i18n.addResourceBundle(language, namespace, data, true, true);
  }
}

async function ensureFallbackNamespacesLoaded(
  language: SupportedLanguage,
  namespaces: readonly Namespace[],
): Promise<void> {
  if (language === FALLBACK_LANGUAGE) return;
  await ensureLanguageNamespacesLoaded(FALLBACK_LANGUAGE, namespaces);
}

function resolveLanguage(value: string): SupportedLanguage {
  if (value === "system") return getSystemLanguage();
  return normalizeLanguage(value) ?? FALLBACK_LANGUAGE;
}

export async function initI18n(): Promise<void> {
  return initI18nWithNamespaces([...DEFAULT_BOOT_NAMESPACES]);
}

export async function initI18nWithNamespaces(
  namespaces: readonly Namespace[],
): Promise<void> {
  const bootNamespaces = normalizeNamespaces(namespaces);

  if (!initPromise) {
    initPromise = (async () => {
      const initialLanguage = getInitialResolvedLanguage();
      const initialResources = await loadLanguageResources(initialLanguage, bootNamespaces);

      await i18n
        .use(initReactI18next)
        .init({
          resources: {
            [initialLanguage]: initialResources,
          },
          lng: initialLanguage,
          fallbackLng: FALLBACK_LANGUAGE,
          supportedLngs: [...SUPPORTED_LANGUAGES],
          load: "currentOnly",
          defaultNS: "common",
          ns: [...ALL_NAMESPACES],
          interpolation: {
            escapeValue: false,
          },
        });

      document.documentElement.lang = initialLanguage;
    })();
  }

  await initPromise;
  const currentLanguage = resolveLanguage(i18n.language);
  await ensureLanguageNamespacesLoaded(currentLanguage, bootNamespaces);
  await ensureFallbackNamespacesLoaded(currentLanguage, bootNamespaces);
}

export async function ensureI18nNamespaces(namespaces: readonly Namespace[]) {
  await initI18n();
  const currentLanguage = resolveLanguage(i18n.language);
  await ensureLanguageNamespacesLoaded(currentLanguage, namespaces);
  await ensureFallbackNamespacesLoaded(currentLanguage, namespaces);
}

/**
 * Set the app language. Called from settingsStore when user changes language.
 * Also updates <html lang> and persists the mode + resolved language.
 */
export async function setAppLanguage(lang: string) {
  await initI18n();
  const resolved = resolveLanguage(lang);
  const currentLanguage = resolveLanguage(i18n.language);
  const currentlyLoaded = getLoadedNamespaces(currentLanguage);
  const namespacesToCarry = currentlyLoaded.length > 0
    ? currentlyLoaded
    : [...DEFAULT_BOOT_NAMESPACES];
  await ensureLanguageNamespacesLoaded(resolved, namespacesToCarry);
  await ensureFallbackNamespacesLoaded(resolved, namespacesToCarry);
  if (i18n.language !== resolved) {
    await i18n.changeLanguage(resolved);
  }
  document.documentElement.lang = resolved;
  // Persist the user's mode choice (not the resolved value)
  localStorage.setItem(LANGUAGE_MODE_KEY, lang);
  // Persist the resolved value for next boot
  localStorage.setItem(RESOLVED_LANGUAGE_KEY, resolved);
}

/**
 * Get the system language, mapped to our supported locales.
 */
export function getSystemLanguage(): SupportedLanguage {
  const nav = navigator.language || "zh-CN";
  if (nav.startsWith("zh")) return "zh-CN";
  return "en-US";
}

/**
 * Initialize language from saved settings.
 * Called once during app startup after settings are loaded from DB.
 */
export async function initLanguageFromSettings(languageMode: string) {
  await initI18n();
  const resolved = resolveLanguage(languageMode);
  const currentLanguage = resolveLanguage(i18n.language);
  const currentlyLoaded = getLoadedNamespaces(currentLanguage);
  const namespacesToCarry = currentlyLoaded.length > 0
    ? currentlyLoaded
    : [...DEFAULT_BOOT_NAMESPACES];
  await ensureLanguageNamespacesLoaded(resolved, namespacesToCarry);
  await ensureFallbackNamespacesLoaded(resolved, namespacesToCarry);
  if (i18n.language !== resolved) {
    await i18n.changeLanguage(resolved);
  }
  document.documentElement.lang = resolved;
}

export default i18n;
