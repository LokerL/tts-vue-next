<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "vuetify";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "../../stores/settings";

const theme = useTheme();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const isMaximized = ref(false);
const windowActionError = ref("");

const appWindow = getCurrentWindow();
let removeResizeListener: (() => void) | null = null;
let disposed = false;

async function syncMaximizedState() {
  try {
    isMaximized.value = await appWindow.isMaximized();
  } catch {
    isMaximized.value = false;
  }
}

async function runWindowAction(action: () => Promise<void>) {
  try {
    windowActionError.value = "";
    await action();
  } catch {
    windowActionError.value = t("titleBar.windowActionFailed");
  }
}

async function toggleMaximize() {
  await runWindowAction(async () => {
    await appWindow.toggleMaximize();
    await syncMaximizedState();
  });
}

function toggleTheme() {
  settingsStore.updateThemeMode(
    theme.global.current.value.dark ? "light" : "dark",
  );
}

onMounted(async () => {
  await syncMaximizedState();

  try {
    const unlisten = await appWindow.onResized(async () => {
      await syncMaximizedState();
    });

    if (disposed) {
      unlisten();
      return;
    }

    removeResizeListener = unlisten;
  } catch {
    removeResizeListener = null;
  }
});

onBeforeUnmount(() => {
  disposed = true;
  removeResizeListener?.();
  removeResizeListener = null;
});
</script>

<template>
  <v-app-bar
    height="36"
    flat
    class="title-bar glass-panel"
    data-tauri-drag-region>
    <div class="drag-region">
      <div class="app-title-wrap">
        <span class="app-title">{{ $t("common.appName") }}</span>
      </div>
    </div>
    <v-spacer />
    <v-btn
      icon
      size="small"
      variant="text"
      :aria-label="$t('titleBar.toggleTheme')"
      @click="toggleTheme">
      <v-icon size="18">
        {{
          theme.global.current.value.dark
            ? "mdi-weather-sunny"
            : "mdi-weather-night"
        }}
      </v-icon>
    </v-btn>
    <v-btn
      icon
      size="small"
      variant="text"
      :aria-label="$t('titleBar.minimize')"
      @click="runWindowAction(() => appWindow.minimize())">
      <v-icon size="18">mdi-minus</v-icon>
    </v-btn>
    <v-btn
      icon
      size="small"
      variant="text"
      :aria-label="$t('titleBar.toggleMaximize')"
      @click="toggleMaximize">
      <v-icon size="18">
        {{ isMaximized ? "mdi-window-restore" : "mdi-window-maximize" }}
      </v-icon>
    </v-btn>
    <v-btn
      icon
      size="small"
      variant="text"
      class="close-btn"
      :aria-label="$t('titleBar.close')"
      @click="runWindowAction(() => appWindow.close())">
      <v-icon size="18">mdi-close</v-icon>
    </v-btn>
    <span v-if="windowActionError" role="alert" class="window-action-error">
      {{ windowActionError }}
    </span>
  </v-app-bar>
</template>

<style scoped>
.title-bar {
  user-select: none;
  border: 1px solid rgba(var(--v-theme-glass-border), 0.42);
  background: rgba(var(--v-theme-glass), 0.58) !important;
  backdrop-filter: blur(18px);
  -webkit-app-region: drag;
}

.title-bar .v-btn {
  -webkit-app-region: no-drag;
}

.drag-region {
  flex: 1;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  height: 100%;
  padding-left: 14px;
}

.app-title-wrap {
  display: grid;
  line-height: 1.05;
}

.app-title-kicker {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
}

.app-title {
  font-size: 13px;
  font-weight: 600;
}

.close-btn:hover {
  background-color: rgb(var(--v-theme-error)) !important;
  color: rgb(var(--v-theme-on-error)) !important;
}

.window-action-error {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
