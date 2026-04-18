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

const languageOptions = computed(() => [
  { title: t("settings.languages.zh"), value: "zh-CN" },
  { title: t("settings.languages.en"), value: "en-US" },
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
  <v-container fluid class="settings-page">
    <section class="settings-workspace">
      <v-card flat class="settings-panel glass-panel">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="36">
              <v-icon>mdi-cog-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-h6">{{ $t("nav.settings") }}</v-card-title>
        </v-card-item>

        <v-card-text class="settings-panel__body">
          <div class="settings-panel__content">
            <section class="settings-group settings-group--primary">
              <div class="settings-group__header">
                <v-icon size="18" color="primary">mdi-folder-cog-outline</v-icon>
                <span class="text-subtitle-1 font-weight-medium">{{
                  $t("settings.sections.output")
                }}</span>
              </div>

              <div class="settings-fields">
                <div class="settings-field settings-field--full">
                  <v-text-field
                    :model-value="settingsStore.savePath"
                    :label="$t('settings.fields.savePath')"
                    :placeholder="$t('settings.fields.savePathPlaceholder')"
                    density="comfortable"
                    readonly
                    append-inner-icon="mdi-folder-outline"
                    @click="selectSavePath" />
                </div>

                <v-select
                  :model-value="settingsStore.outputFormat"
                  :items="formatOptions"
                  density="comfortable"
                  :label="$t('settings.fields.defaultFormat')"
                  @update:model-value="settingsStore.updateOutputFormat" />

                <v-select
                  :model-value="settingsStore.language"
                  :items="languageOptions"
                  density="comfortable"
                  :label="$t('settings.fields.displayLanguage')"
                  @update:model-value="settingsStore.updateLanguage" />

                <div class="settings-field settings-field--full">
                  <v-switch
                    :model-value="settingsStore.autoplay"
                    :label="$t('settings.fields.autoplay')"
                    density="comfortable"
                    color="primary"
                    hide-details
                    @update:model-value="
                      (value) => settingsStore.updateAutoplay(Boolean(value))
                    " />
                </div>
              </div>
            </section>

            <section class="settings-group settings-group--secondary">
              <div class="settings-group__header">
                <v-icon size="18" color="primary">mdi-tune-variant</v-icon>
                <span class="text-subtitle-1 font-weight-medium">{{
                  $t("settings.sections.processing")
                }}</span>
              </div>

              <div class="settings-stack">
                <v-select
                  :model-value="settingsStore.maxRetries"
                  :items="retryOptions"
                  density="comfortable"
                  :label="$t('settings.fields.maxRetries')"
                  @update:model-value="settingsStore.updateMaxRetries" />

                <v-select
                  :model-value="settingsStore.fileConcurrency"
                  :items="concurrencyOptions"
                  density="comfortable"
                  :label="$t('settings.fields.fileConcurrency')"
                  @update:model-value="settingsStore.updateFileConcurrency" />
              </div>
            </section>
          </div>
        </v-card-text>
      </v-card>
    </section>
  </v-container>
</template>

<style scoped>
.settings-page {
  padding: 10px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background:
    radial-gradient(
      circle at top right,
      rgba(var(--v-theme-primary), 0.08),
      transparent 22%
    ),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0.98)
    );
}

.settings-workspace {
  height: 100%;
  min-height: 0;
}

.settings-panel {
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    radial-gradient(
      circle at top right,
      rgba(var(--v-theme-primary), 0.1),
      transparent 30%
    ),
    rgba(var(--v-theme-surface), 0.78);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(var(--v-theme-on-surface), 0.08);
  display: flex;
  flex-direction: column;
}

.settings-panel__body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding-top: 5px;
}

.settings-panel__content {
  flex: 1;
  display: flex;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.settings-group {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 20px;
  background: rgba(var(--v-theme-surface), 0.6);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.settings-group--primary {
  flex: 1;
  min-width: 0;
}

.settings-group--secondary {
  width: 320px;
  flex-shrink: 0;
}

.settings-group__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-field--full {
  grid-column: 1 / -1;
}

.settings-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 1080px) {
  .settings-panel__content {
    flex-direction: column;
    overflow-y: auto;
    padding-right: 2px;
  }

  .settings-group--secondary {
    width: auto;
  }
}

@media (max-width: 720px) {
  .settings-fields {
    grid-template-columns: 1fr;
  }

  .settings-field--full {
    grid-column: auto;
  }
}
</style>
