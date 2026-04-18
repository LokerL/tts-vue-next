import { createI18n } from "vue-i18n";
import zh from "../locales/zh";
import en from "../locales/en";

/**
 * 获取默认语言（优先级：本地存储 > 浏览器默认）
 * @returns 语言标识（zh 或 en）
 */
const getDefaultLanguage = (): "zh" | "en" => {
  const savedLang = localStorage.getItem("app_language");
  if (savedLang === "zh" || savedLang === "en") {
    return savedLang;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.includes("zh")) {
    return "zh";
  }
  return "zh";
};

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getDefaultLanguage(),
  fallbackLocale: "zh",
  messages: {
    en,
    zh,
  },
  availableLocales: ["zh", "en"],
  silentTranslationWarn: true,
  silentFallbackWarn: true,
});

export default i18n;
