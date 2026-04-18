<script setup lang="ts">
import { computed } from "vue";
import { useTtsStore } from "../../stores/tts";

const ttsStore = useTtsStore();

const text = computed({
  get: () => ttsStore.text,
  set: (value: string) => ttsStore.setText(value),
});
const hasText = computed(() => ttsStore.text.length > 0);
</script>

<template>
  <v-card flat class="text-panel glass-panel">
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal" size="36">
          <v-icon>mdi-text-box-outline</v-icon>
        </v-avatar>
      </template>
      <v-card-title class="text-h6">{{ $t("Header.index") }}</v-card-title>
    </v-card-item>
    <v-card-text class="text-panel__body">
      <v-textarea
        v-model="text"
        placeholder="Enter text to convert to speech..."
        variant="outlined"
        flat
        no-resize
        hide-details
        rows="18"
        class="text-panel__field" />

      <v-fade-transition>
        <v-icon
          v-if="hasText"
          icon="mdi-delete-outline"
          size="small"
          class="text-panel__clear-btn"
          :disabled="ttsStore.converting"
          @click="ttsStore.clear()" />
      </v-fade-transition>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.text-panel {
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    radial-gradient(
      circle at top right,
      rgba(var(--v-theme-primary), 0.1),
      transparent 30%
    ),
    rgba(var(--v-theme-surface), 0.78);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(var(--v-theme-on-surface), 0.08);
}

.text-panel__body {
  flex: 1;
  display: flex;
  height: 100%;
  padding: 5px;
  position: relative;
}

.text-panel__field {
  flex: 1;
}

.text-panel__field :deep(.v-field),
.text-panel__field :deep(.v-field__field),
.text-panel__field :deep(.v-field__input) {
  height: 100%;
}

.text-panel__field :deep(textarea) {
  min-height: 100% !important;
}

.text-panel__clear-btn {
  position: absolute;
  left: 95%;
  bottom: 10px;
  transform: translateX(-50%);
  z-index: 2;
  color: rgba(var(--v-theme-on-surface), 0.45);

  border-radius: 999px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.text-panel__clear-btn:hover {
  color: rgb(var(--v-theme-error));
}

.text-panel__clear-btn:disabled {
  opacity: 0.55;
}
</style>
