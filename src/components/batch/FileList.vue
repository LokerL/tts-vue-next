<script setup lang="ts">
import { watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useMessage } from "vuetify-message-vue3";
import { useBatchStore } from "../../stores/batch";

const batchStore = useBatchStore();
const message = useMessage();

watch(
  () =>
    batchStore.files.map((file) => ({
      id: file.id,
      name: file.name,
      error: file.error ?? null,
    })),
  (files, previousFiles) => {
    const previousErrors = new Map(
      (previousFiles ?? []).map((file) => [file.id, file.error]),
    );

    files.forEach((file) => {
      if (!file.error || previousErrors.get(file.id) === file.error) {
        return;
      }

      message.error(`${file.name}: ${file.error}`);
    });
  },
);

function statusColor(status: string): string {
  switch (status) {
    case "done":
      return "success";
    case "error":
      return "error";
    case "processing":
      return "primary";
    default:
      return "secondary";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "done":
      return "Completed";
    case "error":
      return "Failed";
    case "processing":
      return "Processing";
    default:
      return "Queued";
  }
}

async function showInFolder(path: string) {
  try {
    await invoke("show_in_folder", { path });
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error));
  }
}
</script>

<template>
  <v-card variant="outlined" class="file-list glass-panel">
    <div class="file-list__header pa-4 pb-2">
      <div class="text-h6">Queue Progress</div>
    </div>

    <template v-if="batchStore.files.length > 0">
      <v-table density="comfortable" class="file-list-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Status</th>
            <th style="width: 220px">Progress</th>
            <th style="width: 148px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in batchStore.files" :key="file.id">
            <td>
              <div class="text-body-2 font-weight-medium">{{ file.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ file.path }}
              </div>
            </td>
            <td>
              <v-chip
                :color="statusColor(file.status)"
                size="small"
                variant="tonal">
                {{ statusLabel(file.status) }}
              </v-chip>
            </td>
            <td>
              <v-progress-linear
                :model-value="file.progress"
                :color="statusColor(file.status)"
                height="8"
                rounded />
            </td>
            <td>
              <div class="d-flex align-center ga-1">
                <v-btn
                  v-if="file.outputPath"
                  icon
                  size="x-small"
                  variant="text"
                  @click="showInFolder(file.outputPath)">
                  <v-icon size="small">mdi-folder-open-outline</v-icon>
                </v-btn>
                <v-btn
                  v-if="file.status === 'error'"
                  icon
                  size="x-small"
                  variant="text"
                  @click="batchStore.retryFile(file.id)">
                  <v-icon size="small">mdi-refresh</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  :disabled="
                    batchStore.converting && file.status === 'processing'
                  "
                  @click="batchStore.removeFile(file.id)">
                  <v-icon size="small">mdi-close</v-icon>
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>

    <div v-else class="pa-8 text-center text-medium-emphasis">
      <v-icon size="28" class="mb-3">mdi-file-document-outline</v-icon>
      <div class="text-body-1 mb-1">No files queued yet</div>
      <div class="text-caption">
        Your selected files will appear here before conversion starts.
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.file-list {
  overflow: hidden;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.92);
}

.file-list-table :deep(th) {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
