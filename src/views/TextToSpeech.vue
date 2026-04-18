<script setup lang="ts">
import AudioPlayer from "../components/tts/AudioPlayer.vue";
import TextInput from "../components/tts/TextInput.vue";
import TtsOptions from "../components/tts/TtsOptions.vue";
</script>

<template>
  <v-container fluid class="tts-page">
    <section class="tts-workspace">
      <div class="tts-workspace__input-control">
        <div class="tts-workspace__input">
          <TextInput />
        </div>

        <div class="tts-workspace__control">
          <TtsOptions />
        </div>
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
  height: 100%;
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
  height: 100%;
  display: flex;
  flex-direction: column;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 10px;
}

.tts-workspace__input-control {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 10px;
}

.tts-workspace__input {
  flex: 1;
  flex-grow: 1;
}
.tts-workspace__control {
  height: 100%;
  width: 300px;
}

@media (max-width: 1280px) {
  .tts-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
