<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { useMessage } from "vuetify-message-vue3";
import { useSettingsStore } from "../../stores/settings";
import { useTtsStore } from "../../stores/tts";

const ttsStore = useTtsStore();
const settingsStore = useSettingsStore();
const message = useMessage();

const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const playerVolume = ref(100);

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

async function togglePlay() {
  if (!audioRef.value || !ttsStore.audioUrl) {
    return;
  }

  if (isPlaying.value) {
    audioRef.value.pause();
    return;
  }

  ttsStore.$patch({ error: null });

  try {
    await audioRef.value.play();
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    ttsStore.$patch({ error: errorMessage });
    message.error(errorMessage);
  }
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
}

function onLoadedMetadata() {
  if (!audioRef.value) {
    return;
  }

  duration.value = Number.isFinite(audioRef.value.duration)
    ? audioRef.value.duration
    : 0;
  audioRef.value.volume = playerVolume.value / 100;
}

function onEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

function seek(value: number) {
  if (audioRef.value && Number.isFinite(value)) {
    audioRef.value.currentTime = value;
  }
}

function updateVolume(value: number) {
  if (!Number.isFinite(value)) {
    return;
  }

  playerVolume.value = value;
  if (audioRef.value) {
    audioRef.value.volume = value / 100;
  }
}

async function saveAudio() {
  if (!ttsStore.audioBytes) {
    return;
  }

  ttsStore.$patch({ error: null });

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { remove, writeFile } = await import("@tauri-apps/plugin-fs");
    const ext = settingsStore.outputFormat;
    const filePath = await save({
      defaultPath: `tts-output.${ext}`,
      filters: [{ name: "Audio", extensions: [ext] }],
    });

    if (!filePath) {
      return;
    }

    if (ext === "mp3") {
      await writeFile(filePath, ttsStore.audioBytes);
      return;
    }

    const tempPath = `${filePath}.tmp.mp3`;
    const { invoke } = await import("@tauri-apps/api/core");
    let saveError: unknown = null;
    let shouldRemoveTempFile = false;

    try {
      await writeFile(tempPath, ttsStore.audioBytes);
      shouldRemoveTempFile = true;
      await invoke("convert_audio_format", {
        inputPath: tempPath,
        outputPath: filePath,
        format: ext,
      });
    } catch (error) {
      saveError = error;
    } finally {
      if (shouldRemoveTempFile) {
        try {
          await remove(tempPath);
        } catch (cleanupError) {
          if (!saveError) {
            saveError = cleanupError;
          }
        }
      }
    }

    if (saveError) {
      throw saveError;
    }
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    ttsStore.$patch({ error: errorMessage });
    message.error(errorMessage);
  }
}

watch(
  () => ttsStore.audioUrl,
  async (audioUrl) => {
    if (!audioRef.value) {
      return;
    }

    if (!audioUrl) {
      audioRef.value.pause();
      audioRef.value.removeAttribute("src");
      audioRef.value.load();
      isPlaying.value = false;
      currentTime.value = 0;
      duration.value = 0;
      return;
    }

    audioRef.value.src = audioUrl;
    audioRef.value.load();
    audioRef.value.volume = playerVolume.value / 100;

    if (settingsStore.autoplay) {
      ttsStore.$patch({ error: null });

      try {
        await audioRef.value.play();
      } catch (error) {
        const errorMessage = toErrorMessage(error);
        ttsStore.$patch({ error: errorMessage });
        message.error(errorMessage);
      }
    }
  },
);

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
});
</script>

<template>
  <v-card flat class="audio-player glass-panel">
    <audio
      ref="audioRef"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onEnded" />

    <div class="audio-player__inner">
      <div class="audio-player__label text-caption font-weight-medium">
        Playback Console
      </div>

      <v-btn
        icon
        variant="text"
        aria-label="Toggle playback"
        :disabled="!ttsStore.audioUrl"
        @click="togglePlay">
        <v-icon>{{ isPlaying ? "mdi-pause" : "mdi-play" }}</v-icon>
      </v-btn>

      <div class="audio-player__time text-caption text-medium-emphasis">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>

      <v-slider
        :model-value="currentTime"
        :max="duration || 1"
        :disabled="!ttsStore.audioUrl"
        hide-details
        density="compact"
        color="primary"
        class="audio-player__progress"
        @update:model-value="seek" />

      <div class="audio-player__volume d-flex align-center ga-2">
        <v-icon size="small">mdi-volume-high</v-icon>
        <v-slider
          :model-value="playerVolume"
          :min="0"
          :max="100"
          hide-details
          density="compact"
          style="width: 92px"
          @update:model-value="updateVolume" />
      </div>

      <v-btn
        icon
        variant="text"
        aria-label="Save generated audio"
        :disabled="!ttsStore.audioBytes"
        @click="saveAudio">
        <v-icon>mdi-content-save</v-icon>
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.audio-player {
  position: sticky;
  bottom: 0;
  z-index: 2;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.92);
  backdrop-filter: blur(16px);
}

.audio-player__inner {
  display: grid;
  grid-template-columns: auto auto auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.audio-player__label {
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
}

.audio-player__time {
  min-width: 92px;
}

.audio-player__progress {
  min-width: 0;
}

@media (max-width: 960px) {
  .audio-player__inner {
    grid-template-columns: auto 1fr auto;
    gap: 10px;
  }

  .audio-player__time,
  .audio-player__volume,
  .audio-player__label {
    grid-column: 1 / -1;
  }
}
</style>
