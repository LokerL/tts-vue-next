<script setup lang="ts">
import AudioPlayer from "../components/tts/AudioPlayer.vue";
import TextInput from "../components/tts/TextInput.vue";
import TtsOptions from "../components/tts/TtsOptions.vue";
</script>

<template>
  <v-container fluid class="tts-page">
    <section class="tts-workspace">
      <div class="tts-workspace__input">
        <TextInput />
      </div>

      <div class="tts-workspace__control">
        <TtsOptions />
      </div>

      <div class="tts-workspace__player">
        <AudioPlayer />
      </div>
    </section>
  </v-container>
</template>

<style scoped>
.tts-page {
  padding: 10px;
  min-height: 100%;
  background:
    radial-gradient(
      circle at top right,
      rgba(var(--v-theme-primary), 0.08),
      transparent 22%
    ),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0.98)
    );
}

.tts-workspace {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 10px;
}

.tts-workspace__player {
  grid-column: 1 / -1;
}

@media (max-width: 1280px) {
  .tts-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
