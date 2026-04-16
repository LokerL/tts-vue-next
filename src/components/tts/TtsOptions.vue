<script setup lang="ts">
import { computed } from "vue";
import type { OutputFormat } from "../../types";
import { useSettingsStore } from "../../stores/settings";
import { useTtsStore } from "../../stores/tts";
import VoiceSelector from "./VoiceSelector.vue";

const ttsStore = useTtsStore();
const settingsStore = useSettingsStore();

const formatOptions: Array<{ title: string; value: OutputFormat }> = [
  { title: "MP3", value: "mp3" },
  { title: "WAV", value: "wav" },
  { title: "OGG", value: "ogg" },
  { title: "FLAC", value: "flac" },
];

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

function dismissError() {
  ttsStore.$patch({ error: null });
}
</script>

<template>
  <v-card rounded="xl" variant="outlined" class="options-panel fill-height">
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal" size="36">
          <v-icon>mdi-tune-variant</v-icon>
        </v-avatar>
      </template>
      <v-card-title class="text-h6">Voice & Output</v-card-title>
      <v-card-subtitle>
        Tune the voice, pacing, and file format before conversion.
      </v-card-subtitle>
    </v-card-item>

    <v-card-text class="pt-2">
      <VoiceSelector />

      <v-divider class="my-4" />

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">Rate</span>
          <span class="text-caption text-medium-emphasis">{{ ttsStore.rateString }}</span>
        </div>
        <v-slider
          v-model="rate"
          :min="-100"
          :max="200"
          :step="1"
          hide-details
          thumb-label
          color="primary"
        />
      </div>

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">Pitch</span>
          <span class="text-caption text-medium-emphasis">{{ ttsStore.pitchString }}</span>
        </div>
        <v-slider
          v-model="pitch"
          :min="-50"
          :max="50"
          :step="1"
          hide-details
          thumb-label
          color="primary"
        />
      </div>

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">Volume</span>
          <span class="text-caption text-medium-emphasis">{{ ttsStore.volumeString }}</span>
        </div>
        <v-slider
          v-model="volume"
          :min="-100"
          :max="100"
          :step="1"
          hide-details
          thumb-label
          color="primary"
        />
      </div>

      <v-divider class="my-4" />

      <v-select
        v-model="outputFormat"
        :items="formatOptions"
        label="Output Format"
        prepend-inner-icon="mdi-file-music-outline"
      />

      <v-alert
        v-if="ttsStore.error"
        type="error"
        density="compact"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="dismissError"
      >
        {{ ttsStore.error }}
      </v-alert>
    </v-card-text>

    <v-spacer />

    <v-card-actions class="px-4 pb-4 pt-0 d-flex flex-column ga-3">
      <v-btn
        block
        color="primary"
        size="large"
        :loading="ttsStore.converting"
        :disabled="!ttsStore.text.trim()"
        prepend-icon="mdi-play"
        @click="ttsStore.convert()"
      >
        {{ ttsStore.converting ? "Converting..." : "Start Conversion" }}
      </v-btn>

      <v-btn
        v-if="ttsStore.converting"
        block
        variant="outlined"
        color="error"
        prepend-icon="mdi-stop"
        @click="ttsStore.stop()"
      >
        Stop
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.options-panel {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.05), transparent 24%),
    rgb(var(--v-theme-surface));
}

.slider-group + .slider-group {
  margin-top: 20px;
}
</style>
