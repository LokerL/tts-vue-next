<script setup lang="ts">
import { computed } from "vue";
import { useTtsStore } from "../../stores/tts";

const ttsStore = useTtsStore();

const text = computed({
  get: () => ttsStore.text,
  set: (value: string) => ttsStore.setText(value),
});
import { useMessage } from "vuetify-message-vue3";

const message = useMessage();
const hasText = computed(() => ttsStore.text.length > 0);
</script>

<template>
  <v-card flat class="text-panel glass-panel">
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
    </v-card-text>

    <v-divider />

    <v-card-actions class="px-4 py-3">
      <div class="d-flex align-center ga-2 flex-wrap">
        <v-chip size="small" variant="tonal" color="primary">
          {{ ttsStore.charCount }} chars
        </v-chip>
        <v-chip size="small" variant="tonal" color="secondary">
          {{ ttsStore.byteCount }} bytes
        </v-chip>
      </div>
      <v-spacer />
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-delete-outline"
        :disabled="!hasText || ttsStore.converting"
        @click="ttsStore.clear()">
        Clear
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.text-panel {
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
  min-height: 0;
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
</style>
