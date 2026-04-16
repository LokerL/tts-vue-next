import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { TtsParams } from "../types";
import { useVoicesStore } from "./voices";
import { useSettingsStore } from "./settings";

const EDGE_TTS_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

interface TtsState {
  text: string;
  converting: boolean;
  progress: number;
  audioUrl: string | null;
  audioBytes: Uint8Array | null;
  error: string | null;
  currentTaskId: string | null;
  rate: number;
  pitch: number;
  volume: number;
  requestVersion: number;
}

function toSignedString(value: number, suffix: string): string {
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function revokeAudioUrl(audioUrl: string | null): void {
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
  }
}

export const useTtsStore = defineStore("tts", {
  state: (): TtsState => ({
    text: "",
    converting: false,
    progress: 0,
    audioUrl: null,
    audioBytes: null,
    error: null,
    currentTaskId: null,
    rate: 0,
    pitch: 0,
    volume: 0,
    requestVersion: 0,
  }),

  getters: {
    rateString(state): string {
      return toSignedString(state.rate, "%");
    },
    pitchString(state): string {
      return toSignedString(state.pitch, "Hz");
    },
    volumeString(state): string {
      return toSignedString(state.volume, "%");
    },
    charCount(state): number {
      return state.text.length;
    },
    byteCount(state): number {
      return new TextEncoder().encode(state.text).length;
    },
  },

  actions: {
    setText(text: string) {
      this.$patch({ text });
    },

    async convert() {
      if (this.converting || !this.text.trim()) {
        return;
      }

      const voicesStore = useVoicesStore();
      const settingsStore = useSettingsStore();
      const taskId = crypto.randomUUID();
      const requestVersion = this.requestVersion + 1;
      const params: TtsParams = {
        text: this.text,
        voice: voicesStore.selectedVoice,
        rate: this.rateString,
        pitch: this.pitchString,
        volume: this.volumeString,
        format: EDGE_TTS_OUTPUT_FORMAT,
        task_id: taskId,
        max_retries: settingsStore.maxRetries,
      };

      revokeAudioUrl(this.audioUrl);
      this.$patch({
        converting: true,
        progress: 0,
        error: null,
        currentTaskId: taskId,
        audioUrl: null,
        audioBytes: null,
        requestVersion,
      });

      try {
        const audioData = await invoke<number[]>("tts_convert", { params });
        if (this.requestVersion !== requestVersion) {
          return;
        }

        const audioBytes = new Uint8Array(audioData);
        const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);

        this.$patch({
          audioBytes,
          audioUrl,
          progress: 100,
          error: null,
        });
      } catch (error) {
        if (this.requestVersion !== requestVersion) {
          return;
        }

        this.$patch({
          error: toErrorMessage(error),
          audioBytes: null,
          audioUrl: null,
        });
      } finally {
        if (this.requestVersion !== requestVersion) {
          return;
        }

        this.$patch({
          converting: false,
          currentTaskId: null,
        });
      }
    },

    async stop() {
      if (!this.currentTaskId) {
        return;
      }

      try {
        await invoke("tts_stop", { taskId: this.currentTaskId });
      } catch {
        return;
      }
    },

    clear() {
      revokeAudioUrl(this.audioUrl);
      this.$patch({
        text: "",
        converting: false,
        audioUrl: null,
        audioBytes: null,
        error: null,
        progress: 0,
        currentTaskId: null,
        requestVersion: this.requestVersion + 1,
      });
    },
  },
});
