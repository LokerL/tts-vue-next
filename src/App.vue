<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import { useTheme } from "vuetify";
import TitleBar from "./components/layout/TitleBar.vue";
import AppLayout from "./components/layout/AppLayout.vue";
import i18n from "./plugins/i18n";
import { useSettingsStore } from "./stores/settings";
import { normalizeAppLanguage, normalizeAppLocale } from "./utils/appLocale";
import { resolveThemeName } from "./utils/themeMode";
import { MessageProvider } from "vuetify-message-vue3";

const theme = useTheme();
const settingsStore = useSettingsStore();
let media: MediaQueryList | null = null;

function applyTheme() {
  theme.change(
    resolveThemeName(settingsStore.themeMode, media?.matches ?? false),
  );
}

function applyLanguage() {
  const language = normalizeAppLanguage(settingsStore.language);
  const locale = normalizeAppLocale(language);

  if (settingsStore.language !== language) {
    settingsStore.updateLanguage(language);
    return;
  }

  i18n.global.locale.value = locale;

  try {
    window.localStorage.setItem("app_language", language);
  } catch {
    return;
  }
}

onMounted(() => {
  media = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme();
  media.addEventListener("change", applyTheme);
});

onUnmounted(() => {
  media?.removeEventListener("change", applyTheme);
  media = null;
});

watch(() => settingsStore.themeMode, applyTheme);
watch(() => settingsStore.language, applyLanguage, { immediate: true });
</script>

<template>
  <v-app>
    <MessageProvider>
      <TitleBar />
      <AppLayout />
    </MessageProvider>
  </v-app>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

#app {
  height: 100%;
}
</style>
