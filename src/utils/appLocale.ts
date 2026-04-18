import type { AppLanguage } from "../types";

export type AppLocale = "zh" | "en";

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function parseAppLanguage(
  value: string | null | undefined,
): AppLanguage | null {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "en" || normalized === "en-us") {
    return "en-US";
  }

  if (normalized === "zh" || normalized === "zh-cn") {
    return "zh-CN";
  }

  return null;
}

export function normalizeAppLanguage(
  value: string | null | undefined,
): AppLanguage {
  return parseAppLanguage(value) ?? "zh-CN";
}

export function normalizeAppLocale(
  value: string | null | undefined,
): AppLocale {
  return normalizeAppLanguage(value) === "en-US" ? "en" : "zh";
}

export function getInitialAppLanguage(): AppLanguage {
  const storage = getLocalStorage();
  if (!storage) {
    return "zh-CN";
  }

  try {
    const rawSettings = storage.getItem("settings");
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings) as { language?: unknown };
      if (typeof parsed.language === "string") {
        const settingsLanguage = parseAppLanguage(parsed.language);
        if (settingsLanguage) {
          return settingsLanguage;
        }
      }
    }

    const savedLanguage = storage.getItem("app_language");
    const persistedLanguage = parseAppLanguage(savedLanguage);
    if (persistedLanguage) {
      return persistedLanguage;
    }
  } catch {
    return "zh-CN";
  }

  if (typeof window === "undefined") {
    return "zh-CN";
  }

  return normalizeAppLanguage(window.navigator.language);
}

export function getInitialAppLocale(): AppLocale {
  return normalizeAppLocale(getInitialAppLanguage());
}
