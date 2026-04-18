<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "vue-i18n";
import { useMessage } from "vuetify-message-vue3";
import { useBatchStore } from "../../stores/batch";

const SUPPORTED_EXTENSIONS = new Set(["txt", "md", "markdown", "docx"]);

const batchStore = useBatchStore();
const message = useMessage();
const { t } = useI18n();
const fileListElement = ref<HTMLDivElement | null>(null);
const isDragOver = ref(false);
const fileError = ref<string | null>(null);
let unlistenDragDrop: (() => void) | null = null;
let isUnmounted = false;

const hasError = computed(() => fileError.value !== null);
const isDisabled = computed(() => batchStore.converting);

watch(
  () => batchStore.files.length,
  (fileCount, previousFileCount) => {
    if (fileCount > (previousFileCount ?? 0)) {
      fileError.value = null;
    }
  },
);

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

function isSupportedPath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? SUPPORTED_EXTENSIONS.has(extension) : false;
}

function filterSupportedPaths(paths: string[]): string[] {
  return paths.filter(isSupportedPath);
}

function isPointerInsideFileList(x: number, y: number): boolean {
  const bounds = fileListElement.value?.getBoundingClientRect();
  if (!bounds) {
    return false;
  }

  const scale = window.devicePixelRatio || 1;
  const cssX = x / scale;
  const cssY = y / scale;

  return cssX >= bounds.left && cssX <= bounds.right && cssY >= bounds.top && cssY <= bounds.bottom;
}

function addDroppedFiles(paths: string[]) {
  const supportedPaths = filterSupportedPaths(paths);
  setUnsupportedFilesError(paths);

  if (supportedPaths.length > 0) {
    batchStore.addFiles(supportedPaths);
  }
}

function setUnsupportedFilesError(paths: string[]) {
  const unsupportedPaths = paths.filter((path) => !isSupportedPath(path));
  fileError.value =
    unsupportedPaths.length > 0
      ? t("batch.upload.unsupportedFileTypes", {
          files: unsupportedPaths
            .map((path) => path.split(/[\\/]/).pop() || path)
            .join(", "),
        })
      : null;

  if (fileError.value) {
    message.error(fileError.value);
  }
}

onMounted(async () => {
  const unlisten = await getCurrentWindow().onDragDropEvent(({ payload }) => {
    if (isDisabled.value) {
      isDragOver.value = false;
      return;
    }

    switch (payload.type) {
      case "enter":
      case "over":
        isDragOver.value = isPointerInsideFileList(payload.position.x, payload.position.y);
        break;
      case "drop":
        isDragOver.value = false;
        if (isPointerInsideFileList(payload.position.x, payload.position.y)) {
          addDroppedFiles(payload.paths);
        }
        break;
      case "leave":
        isDragOver.value = false;
        break;
    }
  });

  if (isUnmounted) {
    unlisten();
    return;
  }

  unlistenDragDrop = unlisten;
});

onUnmounted(() => {
  isUnmounted = true;
  unlistenDragDrop?.();
  unlistenDragDrop = null;
});

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
      return t("batch.list.status.completed");
    case "error":
      return t("batch.list.status.failed");
    case "processing":
      return t("batch.list.status.processing");
    default:
      return t("batch.list.status.queued");
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
  <div ref="fileListElement" class="file-list__root">
    <v-card
      variant="outlined"
      class="file-list glass-panel"
      :class="{
        'file-list--drag-over': isDragOver,
        'file-list--error': hasError,
        'file-list--disabled': isDisabled,
      }"
      :aria-disabled="isDisabled">
      <div class="file-list__header pa-4 pb-2">
        <div class="text-h6">{{ $t("batch.list.title") }}</div>
      </div>

      <div class="file-list__body">
        <template v-if="batchStore.files.length > 0">
          <v-table density="compact" class="file-list-table">
            <thead>
              <tr>
                <th>{{ $t("batch.list.columns.file") }}</th>
                <th>{{ $t("batch.list.columns.status") }}</th>
                <th style="width: 220px">
                  {{ $t("batch.list.columns.progress") }}
                </th>
                <th style="width: 148px">{{ $t("batch.list.columns.actions") }}</th>
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
                      :disabled="batchStore.converting && file.status === 'processing'"
                      @click="batchStore.removeFile(file.id)">
                      <v-icon size="small">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </template>

        <div v-else class="file-list__empty text-center text-medium-emphasis">
          <v-icon size="28" class="mb-3">mdi-file-document-outline</v-icon>
          <div class="text-body-1 mb-1">{{ $t("batch.list.emptyTitle") }}</div>
          <div class="text-caption">
            {{ $t("batch.list.emptyDescription") }}
          </div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.file-list__root {
  height: 100%;
}

.file-list {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.92);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.file-list--drag-over {
  border-color: rgb(var(--v-theme-primary));
  background:
    radial-gradient(
      circle at top,
      rgba(var(--v-theme-primary), 0.1),
      transparent 42%
    ),
    rgba(var(--v-theme-surface), 0.96);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.16) inset;
}

.file-list--error {
  border-color: rgb(var(--v-theme-error));
}

.file-list--disabled {
  opacity: 0.72;
}

.file-list__header {
  flex: 0 0 auto;
}

.file-list__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.file-list__empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.file-list-table :deep(th) {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
