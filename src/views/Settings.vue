<script setup lang="ts">
import { computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "vue-i18n";
import { useMessage } from "vuetify-message-vue3";
import { useSettingsStore } from "../stores/settings";

const settingsStore = useSettingsStore();
const message = useMessage();
const { t } = useI18n();

const formatOptions = computed(() => [
  { title: t("common.formats.mp3"), value: "mp3" },
  { title: t("common.formats.wav"), value: "wav" },
  { title: t("common.formats.ogg"), value: "ogg" },
  { title: t("common.formats.flac"), value: "flac" },
]);

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
        <div class="text-overline text-primary mb-2">
          {{ $t("settings.hero.overline") }}
        </div>
        <h1 class="text-h4 mb-2">{{ $t("settings.hero.title") }}</h1>
        <p class="text-body-1 text-medium-emphasis mb-0">
          {{ $t("settings.hero.description") }}
        </p>
      </div>
    </section>

    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">{{
        $t("settings.sections.output")
      }}</v-card-title>
      <v-card-text>
        <v-text-field
          :model-value="settingsStore.savePath"
          :label="$t('settings.fields.savePath')"
          readonly
          append-inner-icon="mdi-folder-outline"
          :placeholder="$t('settings.fields.savePathPlaceholder')"
          @click="selectSavePath" />
        <v-select
          :model-value="settingsStore.outputFormat"
          :items="formatOptions"
          :label="$t('settings.fields.defaultFormat')"
          @update:model-value="settingsStore.updateOutputFormat" />
        <v-switch
          :model-value="settingsStore.autoplay"
          :label="$t('settings.fields.autoplay')"
          color="primary"
          hide-details
          @update:model-value="
            (value) => settingsStore.updateAutoplay(Boolean(value))
          " />
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">{{
        $t("settings.sections.processing")
      }}</v-card-title>
      <v-card-text>
        <v-select
          :model-value="settingsStore.maxRetries"
          :items="retryOptions"
          :label="$t('settings.fields.maxRetries')"
          @update:model-value="settingsStore.updateMaxRetries" />
        <v-select
          :model-value="settingsStore.fileConcurrency"
          :items="concurrencyOptions"
          :label="$t('settings.fields.fileConcurrency')"
          @update:model-value="settingsStore.updateFileConcurrency" />
      </v-card-text>
    </v-card>

    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1">{{
        $t("settings.sections.about")
      }}</v-card-title>
      <v-card-text>
        <div class="text-body-2 mb-2">
          <strong>{{ $t("common.appName") }}</strong> v0.1.0
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ $t("settings.about.description") }}
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
