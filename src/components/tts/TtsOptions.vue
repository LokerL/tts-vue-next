<script setup lang="ts">
import { computed } from "vue";
import { useMessage } from "vuetify-message-vue3";
import type { OutputFormat } from "../../types";
import { useSettingsStore } from "../../stores/settings";
import { useTtsStore } from "../../stores/tts";
import VoiceSelector from "./VoiceSelector.vue";

const ttsStore = useTtsStore();
const settingsStore = useSettingsStore();
const message = useMessage();

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

async function convertText() {
  await ttsStore.convert();

  if (ttsStore.error) {
    message.error(ttsStore.error);
  }
}
</script>

<template>
  <v-card variant="outlined" class="options-panel glass-panel">
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal" size="36">
          <v-icon>mdi-tune-variant</v-icon>
        </v-avatar>
      </template>
      <v-card-title class="text-h6">Voice Control Dock</v-card-title>
    </v-card-item>

    <v-card-text class="pt-2">
      <VoiceSelector />

      <v-divider class="my-4" />

      <div class="slider-group">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">Rate</span>
          <span class="text-caption text-medium-emphasis">{{
            ttsStore.rateString
          }}</span>
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
          <span class="text-body-2">Pitch</span>
          <span class="text-caption text-medium-emphasis">{{
            ttsStore.pitchString
          }}</span>
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
          <span class="text-body-2">Volume</span>
          <span class="text-caption text-medium-emphasis">{{
            ttsStore.volumeString
          }}</span>
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
        label="Output Format"
        prepend-inner-icon="mdi-file-music-outline" />
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
        @click="convertText">
        {{ ttsStore.converting ? "Generating..." : "Generate Speech" }}
      </v-btn>

      <v-btn
        v-if="ttsStore.converting"
        block
        variant="outlined"
        color="error"
        prepend-icon="mdi-stop"
        @click="ttsStore.stop()">
        Stop
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.options-panel {
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
