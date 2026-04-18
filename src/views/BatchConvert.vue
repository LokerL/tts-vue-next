<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBatchStore } from "../stores/batch";
import { useSettingsStore } from "../stores/settings";
import FileList from "../components/batch/FileList.vue";
import FileUpload from "../components/batch/FileUpload.vue";

const batchStore = useBatchStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();

const concurrencyItems = [1, 2, 3, 4, 5].map((value) => ({
  title: String(value),
  value,
}));

const actionLabels = computed(() => ({
  startAll: t("batch.actions.startAll"),
  clear: t("batch.actions.clear"),
  concurrency: t("batch.actions.concurrency"),
}));
</script>

<template>
  <v-container fluid class="page-shell batch-page">
    <section class="batch-workspace">
      <v-card flat class="batch-workspace__title glass-panel">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="36">
              <v-icon>mdi-file-multiple-outline</v-icon>
            </v-avatar>
          </template>

          <v-card-title class="text-h6">
            {{ $t("batch.hero.title") }}
          </v-card-title>

          <template #append>
            <FileUpload />
          </template>
        </v-card-item>
      </v-card>

      <div class="batch-workspace__list">
        <FileList />
      </div>

      <div class="batch-workspace__actions">
        <v-card variant="outlined" class="batch-actions glass-panel">
          <div class="batch-actions__row pa-3">
            <div class="batch-actions__buttons d-flex align-center ga-2">
              <v-btn
                color="primary"
                :loading="batchStore.converting"
                :disabled="batchStore.files.length === 0"
                prepend-icon="mdi-play"
                @click="batchStore.convertAll()">
                {{ actionLabels.startAll }}
              </v-btn>
              <v-btn
                variant="outlined"
                :disabled="batchStore.converting || batchStore.files.length === 0"
                @click="batchStore.clearFiles()">
                {{ actionLabels.clear }}
              </v-btn>
            </div>

            <div class="batch-actions__settings">
              <v-select
                :model-value="settingsStore.fileConcurrency"
                :items="concurrencyItems"
                :label="actionLabels.concurrency"
                density="compact"
                style="width: 136px"
                hide-details
                @update:model-value="settingsStore.updateFileConcurrency" />
            </div>
          </div>
        </v-card>
      </div>
    </section>
  </v-container>
</template>

<style scoped>
.batch-page {
  height: 100%;
  padding: 10px;
  overflow: hidden;
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

.batch-workspace {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-workspace__title {
  flex: 0 0 auto;
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
}

.batch-workspace__title :deep(.v-card-item) {
  min-height: 64px;
  padding: 10px 16px;
}

.batch-workspace__list {
  flex: 1 1 auto;
  min-height: 0;
}

.batch-workspace__actions {
  flex: 0 0 72px;
  height: 72px;
}

.batch-actions {
  height: 100%;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.88);
  backdrop-filter: blur(14px);
}

.batch-actions__row {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.batch-actions__buttons {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.batch-actions__buttons::-webkit-scrollbar {
  display: none;
}

.batch-actions__settings {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 12px;
}
</style>
