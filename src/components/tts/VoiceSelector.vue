<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useVoicesStore } from "../../stores/voices";

const voicesStore = useVoicesStore();

onMounted(() => {
  void voicesStore.fetchVoices();
});

const selectedLocale = computed({
  get: () => voicesStore.selectedLocale,
  set: (value: string | null) => {
    if (value) {
      voicesStore.setLocale(value);
    }
  },
});

const selectedVoice = computed({
  get: () => voicesStore.selectedVoice,
  set: (value: string | null) => {
    if (value) {
      voicesStore.setVoice(value);
    }
  },
});

const localeItems = computed(() =>
  voicesStore.locales.map((locale) => ({ title: locale, value: locale })),
);

const voiceItems = computed(() =>
  voicesStore.filteredVoices.map((voice) => ({
    title: `${voice.FriendlyName || voice.ShortName} (${voice.Gender})`,
    value: voice.ShortName,
  })),
);
</script>

<template>
  <div class="voice-selector">
    <v-select
      v-model="selectedLocale"
      :items="localeItems"
      label="Language"
      :loading="voicesStore.loading"
      prepend-inner-icon="mdi-translate"
      class="mb-3" />

    <v-select
      v-model="selectedVoice"
      :items="voiceItems"
      label="Voice"
      :loading="voicesStore.loading"
      prepend-inner-icon="mdi-account-voice" />
  </div>
</template>

<style scoped>
.voice-selector__summary {
  padding: 12px 14px;
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>
