<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import { useTheme } from "vuetify";
import TitleBar from "./components/layout/TitleBar.vue";
import AppLayout from "./components/layout/AppLayout.vue";
import { useSettingsStore } from "./stores/settings";
import { resolveThemeName } from "./utils/themeMode";

const theme = useTheme();
const settingsStore = useSettingsStore();
let media: MediaQueryList | null = null;

function applyTheme() {
  theme.global.name.value = resolveThemeName(settingsStore.themeMode, media?.matches ?? false);
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
</script>

<template>
  <v-app>
    <TitleBar />
    <AppLayout />
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
