<script setup lang="ts">
import { ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "vuetify";

const theme = useTheme();
const isMaximized = ref(false);

const appWindow = getCurrentWindow();

async function toggleMaximize() {
  if (await appWindow.isMaximized()) {
    await appWindow.unmaximize();
    isMaximized.value = false;
  } else {
    await appWindow.maximize();
    isMaximized.value = true;
  }
}

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
}
</script>

<template>
  <v-app-bar height="36" flat class="title-bar">
    <div class="drag-region" data-tauri-drag-region>
      <span class="app-title" data-tauri-drag-region>TTS Vue Next</span>
    </div>
    <v-spacer />
    <v-btn icon size="small" variant="text" @click="toggleTheme">
      <v-icon size="18">
        {{ theme.global.current.value.dark ? "mdi-weather-sunny" : "mdi-weather-night" }}
      </v-icon>
    </v-btn>
    <v-btn icon size="small" variant="text" @click="appWindow.minimize()">
      <v-icon size="18">mdi-minus</v-icon>
    </v-btn>
    <v-btn icon size="small" variant="text" @click="toggleMaximize">
      <v-icon size="18">
        {{ isMaximized ? "mdi-window-restore" : "mdi-window-maximize" }}
      </v-icon>
    </v-btn>
    <v-btn icon size="small" variant="text" class="close-btn" @click="appWindow.close()">
      <v-icon size="18">mdi-close</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<style scoped>
.title-bar {
  -webkit-app-region: no-drag;
  user-select: none;
}

.drag-region {
  flex: 1;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  height: 100%;
  padding-left: 12px;
}

.app-title {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.8;
}

.close-btn:hover {
  background-color: #e81123 !important;
  color: white !important;
}
</style>
