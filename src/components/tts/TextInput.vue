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
  <v-card flat rounded="xl" class="text-panel fill-height">
    <v-card-item class="pb-0">
      <template #prepend>
        <v-avatar color="primary" variant="tonal" size="36">
          <v-icon>mdi-text-box-edit-outline</v-icon>
        </v-avatar>
      </template>
      <v-card-title class="text-h6">Input Text</v-card-title>
      <v-card-subtitle>
        Paste or type the script you want to convert into speech.
      </v-card-subtitle>
    </v-card-item>

    <v-card-text class="text-panel__body">
      <v-textarea
        v-model="text"
        placeholder="Enter text to convert to speech..."
        variant="solo-filled"
        flat
        no-resize
        hide-details
        rows="18"
        class="text-panel__field"
      />
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
        @click="ttsStore.clear()"
      >
        Clear
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.text-panel {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.06), transparent 26%),
    rgb(var(--v-theme-surface));
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
