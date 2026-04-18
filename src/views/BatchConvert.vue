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
    <section class="batch-page__hero section-hero glass-panel">
      <div>
        <div class="text-overline text-primary mb-2">
          {{ $t("batch.hero.overline") }}
        </div>
        <h1 class="text-h4 mb-2">
          {{ $t("batch.hero.title") }}
        </h1>
        <p class="text-body-1 text-medium-emphasis mb-0">
          {{ $t("batch.hero.description") }}
        </p>
      </div>
    </section>

    <section class="batch-workspace">
      <div class="batch-workspace__upload">
        <FileUpload />
      </div>

      <div class="batch-workspace__list">
        <FileList />
      </div>

      <div class="batch-workspace__actions">
        <v-card variant="outlined" class="batch-actions glass-panel">
          <div class="batch-actions__row pa-4">
            <div class="d-flex align-center ga-2 flex-wrap">
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
                :disabled="
                  batchStore.converting || batchStore.files.length === 0
                "
                @click="batchStore.clearFiles()">
                {{ actionLabels.clear }}
              </v-btn>
            </div>

            <div class="batch-actions__settings">
              <v-select
                :model-value="settingsStore.fileConcurrency"
                :items="concurrencyItems"
                :label="actionLabels.concurrency"
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
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(
      circle at top left,
      rgba(var(--v-theme-primary), 0.08),
      transparent 22%
    ),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0.98)
    );
}

.batch-page__hero {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
  padding: 24px;
}

.batch-workspace {
  display: grid;
  gap: 16px;
}

.batch-actions {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.88);
  backdrop-filter: blur(14px);
}

.batch-actions__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.batch-actions__settings {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 960px) {
  .batch-actions__row {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-actions__settings {
    justify-content: flex-start;
  }
}
</style>
