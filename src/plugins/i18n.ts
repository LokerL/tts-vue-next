import { createI18n } from "vue-i18n";
import zh from "../locales/zh";
import en from "../locales/en";
import { getInitialAppLocale } from "../utils/appLocale";

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getInitialAppLocale(),
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
