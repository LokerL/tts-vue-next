<script setup lang="ts">
import { computed, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { useI18n } from "vue-i18n";
import { useMessage } from "vuetify-message-vue3";
import { useBatchStore } from "../../stores/batch";

const SUPPORTED_EXTENSIONS = new Set(["txt", "md", "markdown", "docx"]);

const batchStore = useBatchStore();
const message = useMessage();
const { t } = useI18n();
const isDragOver = ref(false);
const fileError = ref<string | null>(null);

const hasError = computed(() => fileError.value !== null);
const isDisabled = computed(() => batchStore.converting);

function isSupportedPath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? SUPPORTED_EXTENSIONS.has(extension) : false;
}

function filterSupportedPaths(paths: string[]): string[] {
  return paths.filter(isSupportedPath);
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

function parseDroppedPaths(event: DragEvent): string[] {
  const uriList = event.dataTransfer?.getData("text/uri-list") ?? "";
  return uriList
    .split(/\r?\n/)
    .filter((value) => value && !value.startsWith("#"))
    .map((value) => {
      if (!value.startsWith("file://")) {
        return "";
      }

      const decoded = decodeURIComponent(value.replace(/^file:\/\//, ""));
      return decoded.replace(/^\/?([A-Za-z]:)/, "$1");
    })
    .filter(Boolean);
}

function onDragOver() {
  if (isDisabled.value) {
    return;
  }

  isDragOver.value = true;
}

function onDragLeave() {
  isDragOver.value = false;
}

async function openFilePicker() {
  if (isDisabled.value) {
    return;
  }

  try {
    fileError.value = null;
    const files = await open({
      multiple: true,
      filters: [
        {
          name: t("batch.upload.filePickerFilterName"),
          extensions: ["txt", "md", "markdown", "docx"],
        },
      ],
    });

    if (!files || isDisabled.value) {
      return;
    }

    const paths = Array.isArray(files) ? files.map(String) : [String(files)];
    const supportedPaths = filterSupportedPaths(paths);
    setUnsupportedFilesError(paths);
    if (supportedPaths.length > 0) {
      batchStore.addFiles(supportedPaths);
    }
  } catch (error) {
    fileError.value = error instanceof Error ? error.message : String(error);
    message.error(fileError.value);
  }
}

function onDrop(event: DragEvent) {
  isDragOver.value = false;

  if (isDisabled.value) {
    return;
  }

  const paths = parseDroppedPaths(event);
  const supportedPaths = filterSupportedPaths(paths);
  setUnsupportedFilesError(paths);
  if (supportedPaths.length > 0) {
    batchStore.addFiles(supportedPaths);
  }
}
</script>

<template>
  <div>
    <v-card
      variant="outlined"
      class="file-upload glass-panel pa-8 pa-md-10 text-center"
      :class="{
        'file-upload--drag-over': isDragOver,
        'file-upload--error': hasError,
        'file-upload--disabled': isDisabled,
      }"
      :aria-disabled="isDisabled"
      @click="openFilePicker"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop">
      <v-avatar size="56" color="primary" variant="tonal" class="mb-4">
        <v-icon size="28">mdi-file-upload-outline</v-icon>
      </v-avatar>
      <div class="text-h6 mb-2">{{ $t("batch.upload.title") }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        {{ $t("batch.upload.description") }}
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-folder-open-outline"
        :disabled="isDisabled">
        {{ $t("batch.upload.chooseFiles") }}
      </v-btn>
    </v-card>
  </div>
</template>

<style scoped>
.file-upload {
  cursor: pointer;
  border-style: dashed;
  border-color: rgba(var(--v-theme-primary), 0.28);
  background:
    radial-gradient(
      circle at top,
      rgba(var(--v-theme-primary), 0.08),
      transparent 46%
    ),
    rgb(var(--v-theme-surface));
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background-color 0.2s ease;
}

.file-upload:not(.file-upload--disabled):hover,
.file-upload--drag-over {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-1px);
  background:
    radial-gradient(
      circle at top,
      rgba(var(--v-theme-primary), 0.12),
      transparent 46%
    ),
    rgb(var(--v-theme-surface));
}

.file-upload--error {
  border-color: rgb(var(--v-theme-error));
}

.file-upload--disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
