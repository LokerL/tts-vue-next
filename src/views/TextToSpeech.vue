<script setup lang="ts">
import AudioPlayer from "../components/tts/AudioPlayer.vue";
import TextInput from "../components/tts/TextInput.vue";
import TtsOptions from "../components/tts/TtsOptions.vue";
</script>

<template>
  <v-container fluid class="page-shell tts-page pa-4 pa-md-6">
    <section class="tts-page__hero section-hero glass-panel">
      <p class="section-eyebrow">Aero Glass Studio</p>
      <h1>Create speech with layered voice controls</h1>
    </section>

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
  min-height: 100%;
  padding-bottom: 88px;
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.08), transparent 22%),
    linear-gradient(180deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface), 0.98));
}

.tts-page__hero {
  margin-bottom: 24px;
}

.tts-workspace {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 24px;
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
