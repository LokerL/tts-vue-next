import { defineStore } from "pinia";
import type {
  AppLanguage,
  OutputFormat,
  ThemeMode,
  TtsSettings,
} from "../types";

const MIN_RETRIES = 1;
const MAX_RETRIES = 10;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampFinite(value: number, current: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return current;
  }

  return clamp(value, min, max);
}

export const useSettingsStore = defineStore("settings", {
  state: (): TtsSettings => ({
    savePath: "",
    outputFormat: "mp3",
    maxRetries: 3,
    fileConcurrency: 3,
    chunkConcurrency: 3,
    autoplay: true,
    language: "zh-CN",
    themeMode: "system",
  }),

  actions: {
    updateSavePath(path: string) {
      this.$patch({ savePath: path });
    },
    updateOutputFormat(format: OutputFormat) {
      this.$patch({ outputFormat: format });
    },
    updateMaxRetries(count: number) {
      this.$patch({
        maxRetries: clampFinite(count, this.maxRetries, MIN_RETRIES, MAX_RETRIES),
      });
    },
    updateFileConcurrency(count: number) {
      this.$patch({
        fileConcurrency: clampFinite(
          count,
          this.fileConcurrency,
          MIN_CONCURRENCY,
          MAX_CONCURRENCY,
        ),
      });
    },
    updateChunkConcurrency(count: number) {
      this.$patch({
        chunkConcurrency: clampFinite(
          count,
          this.chunkConcurrency,
          MIN_CONCURRENCY,
          MAX_CONCURRENCY,
        ),
      });
    },
    updateAutoplay(autoplay: boolean) {
      this.$patch({ autoplay });
    },
    updateLanguage(language: AppLanguage) {
      this.$patch({ language });
    },
    updateThemeMode(themeMode: ThemeMode) {
      this.$patch({ themeMode });
    },
  },

  persist: true,
});
