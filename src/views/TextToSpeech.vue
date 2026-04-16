<script setup lang="ts">
import AudioPlayer from "../components/tts/AudioPlayer.vue";
import TextInput from "../components/tts/TextInput.vue";
import TtsOptions from "../components/tts/TtsOptions.vue";
</script>

<template>
  <v-container fluid class="tts-view pa-4 pa-md-6">
    <v-row class="tts-view__grid" align="stretch">
      <v-col cols="12" lg="8">
        <TextInput />
      </v-col>
      <v-col cols="12" lg="4">
        <TtsOptions />
      </v-col>
    </v-row>

    <AudioPlayer />
  </v-container>
</template>

<style scoped>
.tts-view {
  min-height: 100%;
  padding-bottom: 88px;
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.08), transparent 22%),
    linear-gradient(180deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface), 0.98));
}

.tts-view__grid {
  min-height: calc(100vh - 156px);
}

@media (max-width: 1280px) {
  .tts-view__grid {
    min-height: auto;
  }
}
</style>
