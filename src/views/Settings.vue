<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { useMessage } from "vuetify-message-vue3";
import { useSettingsStore } from "../stores/settings";

const settingsStore = useSettingsStore();
const message = useMessage();

const formatOptions = [
  { title: "MP3", value: "mp3" },
  { title: "WAV", value: "wav" },
  { title: "OGG", value: "ogg" },
  { title: "FLAC", value: "flac" },
];

const retryOptions = Array.from({ length: 10 }, (_, index) => ({
  title: String(index + 1),
  value: index + 1,
}));

const concurrencyOptions = [1, 2, 3, 4, 5].map((value) => ({
  title: String(value),
  value,
}));

async function selectSavePath() {
  try {
    const path = await invoke<string | null>("select_folder");
    if (path) {
      settingsStore.updateSavePath(path);
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<template>
  <v-container fluid class="settings-view pa-4 pa-md-6">
    <section class="settings-view__hero mb-4 mb-md-6">
      <div>
        <div class="text-overline text-primary mb-2">Preferences</div>
        <h1 class="text-h4 mb-2">Tune output and processing behavior</h1>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Choose where converted audio is saved and how aggressively batch jobs
          should run.
        </p>
      </div>
    </section>

    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">Output</v-card-title>
      <v-card-text>
        <v-text-field
          :model-value="settingsStore.savePath"
          label="Save Path"
          readonly
          append-inner-icon="mdi-folder-outline"
          placeholder="Click to select..."
          @click="selectSavePath" />
        <v-select
          :model-value="settingsStore.outputFormat"
          :items="formatOptions"
          label="Default Format"
          @update:model-value="settingsStore.updateOutputFormat" />
        <v-switch
          :model-value="settingsStore.autoplay"
          label="Auto-play after conversion"
          color="primary"
          hide-details
          @update:model-value="
            (value) => settingsStore.updateAutoplay(Boolean(value))
          " />
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">Processing</v-card-title>
      <v-card-text>
        <v-select
          :model-value="settingsStore.maxRetries"
          :items="retryOptions"
          label="Max Retries"
          @update:model-value="settingsStore.updateMaxRetries" />
        <v-select
          :model-value="settingsStore.fileConcurrency"
          :items="concurrencyOptions"
          label="File Concurrency"
          @update:model-value="settingsStore.updateFileConcurrency" />
      </v-card-text>
    </v-card>

    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1">About</v-card-title>
      <v-card-text>
        <div class="text-body-2 mb-2"><strong>TTS Vue Next</strong> v0.1.0</div>
        <div class="text-caption text-medium-emphasis">
          A desktop TTS application powered by Microsoft Edge TTS service and
          built with Vue 3, Vuetify, and Tauri.
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.settings-view {
  min-height: 100%;
  max-width: 860px;
  background:
    radial-gradient(
      circle at top right,
      rgba(var(--v-theme-primary), 0.08),
      transparent 24%
    ),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0.98)
    );
}

.settings-view :deep(.v-card) {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.92);
}

.settings-view__hero {
  display: grid;
  gap: 12px;
}
</style>
