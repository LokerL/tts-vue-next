import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { Voice } from "../types";

interface VoicesState {
  voices: Voice[];
  loading: boolean;
  error: string | null;
  selectedLocale: string;
  selectedVoice: string;
}

function resolveSelection(
  voices: Voice[],
  selectedLocale: string,
  selectedVoice: string,
): Pick<VoicesState, "selectedLocale" | "selectedVoice"> {
  const matchingVoice = voices.find((voice) => voice.ShortName === selectedVoice);
  if (matchingVoice) {
    return {
      selectedLocale: matchingVoice.Locale,
      selectedVoice: matchingVoice.ShortName,
    };
  }

  const localeVoice = voices.find((voice) => voice.Locale === selectedLocale);
  if (localeVoice) {
    return {
      selectedLocale: localeVoice.Locale,
      selectedVoice: localeVoice.ShortName,
    };
  }

  const zhVoice = voices.find((voice) => voice.Locale === "zh-CN");
  if (zhVoice) {
    return {
      selectedLocale: zhVoice.Locale,
      selectedVoice: zhVoice.ShortName,
    };
  }

  const firstVoice = voices[0];
  return {
    selectedLocale: firstVoice?.Locale ?? selectedLocale,
    selectedVoice: firstVoice?.ShortName ?? selectedVoice,
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useVoicesStore = defineStore("voices", {
  state: (): VoicesState => ({
    voices: [],
    loading: false,
    error: null,
    selectedLocale: "zh-CN",
    selectedVoice: "zh-CN-XiaoxiaoNeural",
  }),

  getters: {
    locales(state): string[] {
      return Array.from(new Set(state.voices.map((voice) => voice.Locale))).sort();
    },

    filteredVoices(state): Voice[] {
      return state.voices.filter((voice) => voice.Locale === state.selectedLocale);
    },

    currentVoice(state): Voice | undefined {
      return state.voices.find((voice) => voice.ShortName === state.selectedVoice);
    },
  },

  actions: {
    async fetchVoices() {
      if (this.voices.length > 0) {
        return;
      }

      this.$patch({ loading: true, error: null });

      try {
        const voices = await invoke<Voice[]>("get_voices");
        const selection = resolveSelection(voices, this.selectedLocale, this.selectedVoice);

        this.$patch({
          voices,
          error: null,
          ...selection,
        });
      } catch (error) {
        this.$patch({ error: toErrorMessage(error) });
      } finally {
        this.$patch({ loading: false });
      }
    },

    setLocale(locale: string) {
      const firstVoiceForLocale = this.voices.find((voice) => voice.Locale === locale);
      if (!firstVoiceForLocale) {
        return;
      }

      this.$patch({
        selectedLocale: locale,
        selectedVoice: firstVoiceForLocale.ShortName,
      });
    },

    setVoice(shortName: string) {
      const voice = this.voices.find((item) => item.ShortName === shortName);
      if (!voice) {
        return;
      }

      this.$patch({
        selectedLocale: voice.Locale,
        selectedVoice: shortName,
      });
    },
  },

  persist: {
    pick: ["selectedLocale", "selectedVoice"],
  },
});
