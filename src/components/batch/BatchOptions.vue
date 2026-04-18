<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { OutputFormat } from "../../types";
import { useBatchStore } from "../../stores/batch";
import { useSettingsStore } from "../../stores/settings";
import { useTtsStore } from "../../stores/tts";
import VoiceSelector from "../tts/VoiceSelector.vue";

const batchStore = useBatchStore();
const settingsStore = useSettingsStore();
const ttsStore = useTtsStore();
const { t } = useI18n();

const formatOptions = computed((): Array<{ title: string; value: OutputFormat }> => [
  { title: t("common.formats.mp3"), value: "mp3" },
  { title: t("common.formats.wav"), value: "wav" },
  { title: t("common.formats.ogg"), value: "ogg" },
  { title: t("common.formats.flac"), value: "flac" },
]);

const concurrencyOptions = [1, 2, 3, 4, 5].map((value) => ({
  title: String(value),
  value,
}));

const rate = computed({
  get: () => ttsStore.rate,
  set: (value: number) => {
    if (Number.isFinite(value)) {
      ttsStore.$patch({ rate: value });
    }
  },
});

const pitch = computed({
  get: () => ttsStore.pitch,
  set: (value: number) => {
    if (Number.isFinite(value)) {
      ttsStore.$patch({ pitch: value });
    }
  },
});

const volume = computed({
  get: () => ttsStore.volume,
  set: (value: number) => {
    if (Number.isFinite(value)) {
      ttsStore.$patch({ volume: value });
    }
  },
});

const outputFormat = computed({
  get: () => settingsStore.outputFormat,
  set: (value: OutputFormat | null) => {
    if (value) {
      settingsStore.updateOutputFormat(value);
    }
  },
});

const fileConcurrency = computed({
  get: () => settingsStore.fileConcurrency,
  set: (value: number | null) => {
    if (typeof value === "number") {
      settingsStore.updateFileConcurrency(value);
    }
  },
});
</script>

<template>
  <v-card variant="outlined" class="batch-options glass-panel">
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal" size="36">
          <v-icon>mdi-tune-variant</v-icon>
        </v-avatar>
      </template>
      <v-card-title class="text-h6">{{ $t("batch.options.title") }}</v-card-title>
    </v-card-item>

    <v-card-text class="pt-2">
      <VoiceSelector />

      <v-divider class="my-4" />

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">{{ $t("tts.options.rate") }}</span>
          <span class="text-caption text-medium-emphasis">{{ ttsStore.rateString }}</span>
        </div>
        <v-slider
          v-model="rate"
          :min="-100"
          :max="200"
          :step="1"
          hide-details
          thumb-label
          color="primary" />
      </div>

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">{{ $t("tts.options.pitch") }}</span>
          <span class="text-caption text-medium-emphasis">{{ ttsStore.pitchString }}</span>
        </div>
        <v-slider
          v-model="pitch"
          :min="-50"
          :max="50"
          :step="1"
          hide-details
          thumb-label
          color="primary" />
      </div>

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">{{ $t("tts.options.volume") }}</span>
          <span class="text-caption text-medium-emphasis">{{ ttsStore.volumeString }}</span>
        </div>
        <v-slider
          v-model="volume"
          :min="-100"
          :max="100"
          :step="1"
          hide-details
          thumb-label
          color="primary" />
      </div>

      <v-divider class="my-4" />

      <v-select
        v-model="outputFormat"
        :items="formatOptions"
        :label="$t('tts.options.outputFormat')"
        prepend-inner-icon="mdi-file-music-outline"
        class="mb-3" />

      <v-select
        v-model="fileConcurrency"
        :items="concurrencyOptions"
        :label="$t('settings.fields.fileConcurrency')"
        prepend-inner-icon="mdi-tune"
        hide-details />
    </v-card-text>

    <v-card-actions class="px-4 pb-4 pt-0 d-flex flex-column ga-3">
      <v-btn
        block
        color="primary"
        :loading="batchStore.converting"
        :disabled="batchStore.files.length === 0"
        @click="batchStore.convertAll()">
        {{ $t("batch.actions.startAll") }}
      </v-btn>

      <v-btn
        block
        variant="outlined"
        :disabled="batchStore.converting || batchStore.files.length === 0"
        @click="batchStore.clearFiles()">
        {{ $t("batch.actions.clear") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.batch-options {
  height: 100%;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    radial-gradient(
      circle at top left,
      rgba(var(--v-theme-primary), 0.1),
      transparent 28%
    ),
    rgba(var(--v-theme-surface), 0.78);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(var(--v-theme-on-surface), 0.08);
}

.slider-group + .slider-group {
  margin-top: 5px;
}
</style>
