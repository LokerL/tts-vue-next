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
const fileError = ref<string | null>(null);

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
</script>

<template>
  <v-btn
    color="primary"
    variant="tonal"
    prepend-icon="mdi-folder-open-outline"
    :disabled="isDisabled"
    @click="openFilePicker">
    {{ $t("batch.upload.chooseFiles") }}
  </v-btn>
</template>
