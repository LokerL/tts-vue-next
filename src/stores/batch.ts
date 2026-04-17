import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { BatchFile, OutputFormat, TtsParams } from "../types";
import { useSettingsStore } from "./settings";
import { useVoicesStore } from "./voices";

const EDGE_TTS_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const DEFAULT_RATE = "+0%";
const DEFAULT_PITCH = "+0Hz";
const DEFAULT_VOLUME = "+0%";

interface BatchState {
  files: BatchFile[];
  converting: boolean;
}

interface BatchExecutionSnapshot {
  savePath: string;
  outputFormat: OutputFormat;
  maxRetries: number;
  fileConcurrency: number;
  selectedVoice: string;
}

function toFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function replaceExtension(fileName: string, extension: OutputFormat): string {
  const baseName = fileName.replace(/\.[^.]+$/, "") || fileName;
  return `${baseName}.${extension}`;
}

function joinPath(directory: string, fileName: string): string {
  if (!directory) {
    return fileName;
  }

  const separator = directory.includes("\\") && !directory.includes("/") ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}

function resolveOutputDirectory(filePath: string, configuredDirectory: string): string {
  if (configuredDirectory) {
    return configuredDirectory;
  }

  const segments = filePath.split(/[\\/]/);
  if (segments.length <= 1) {
    return "";
  }

  return filePath.slice(0, filePath.length - segments[segments.length - 1].length).replace(/[\\/]+$/, "");
}

function toOutputPath(file: BatchFile, outputFormat: OutputFormat, savePath: string): string {
  const outputName = replaceExtension(file.name, outputFormat);
  const outputDirectory = resolveOutputDirectory(file.path, savePath);
  return joinPath(outputDirectory, outputName);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function updateFile(files: BatchFile[], id: string, patch: Partial<BatchFile>): BatchFile[] {
  return files.map((file) => (file.id === id ? { ...file, ...patch } : file));
}

async function removeTempFile(path: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }

  try {
    await invoke("remove_file", { path });
    return null;
  } catch (error) {
    return `Failed to remove temporary file ${path}: ${toErrorMessage(error)}`;
  }
}

export const useBatchStore = defineStore("batch", {
  state: (): BatchState => ({
    files: [],
    converting: false,
  }),

  actions: {
    addFiles(filePaths: string[]) {
      const knownPaths = new Set(this.files.map((file) => file.path));
      const uniquePaths = filePaths.filter((path) => {
        if (knownPaths.has(path)) {
          return false;
        }

        knownPaths.add(path);
        return true;
      });
      const nextFiles = uniquePaths.map<BatchFile>((path) => ({
        id: crypto.randomUUID(),
        name: toFileName(path),
        path,
        size: 0,
        status: "pending",
        progress: 0,
      }));

      if (nextFiles.length === 0) {
        return;
      }

      this.$patch((state) => {
        state.files = [...state.files, ...nextFiles];
      });
    },

    removeFile(id: string) {
      this.$patch((state) => {
        state.files = state.files.filter((file) => file.id !== id);
      });
    },

    clearFiles() {
      this.$patch({ files: [] });
    },

    retryFile(id: string) {
      this.$patch((state) => {
        state.files = updateFile(state.files, id, {
          status: "pending",
          progress: 0,
          error: undefined,
        });
      });
    },

    async convertAll() {
      if (this.converting) {
        return;
      }

      const fileIds = this.files
        .filter((file) => file.status === "pending" || file.status === "error")
        .map((file) => file.id);

      if (fileIds.length === 0) {
        return;
      }

      const settingsStore = useSettingsStore();
      const voicesStore = useVoicesStore();
      const snapshot: BatchExecutionSnapshot = {
        savePath: settingsStore.savePath,
        outputFormat: settingsStore.outputFormat,
        maxRetries: settingsStore.maxRetries,
        fileConcurrency: settingsStore.fileConcurrency,
        selectedVoice: voicesStore.selectedVoice,
      };
      const workerCount = Math.min(snapshot.fileConcurrency, fileIds.length);
      let nextIndex = 0;

      this.$patch({ converting: true });

      const processFile = async (fileId: string) => {
        const file = this.files.find((item) => item.id === fileId);
        if (!file) {
          return;
        }

        const outputPath = toOutputPath(file, snapshot.outputFormat, snapshot.savePath);
        const params: TtsParams = {
          text: "",
          voice: snapshot.selectedVoice,
          rate: DEFAULT_RATE,
          pitch: DEFAULT_PITCH,
          volume: DEFAULT_VOLUME,
          format: EDGE_TTS_OUTPUT_FORMAT,
          task_id: file.id,
          max_retries: snapshot.maxRetries,
        };
        let tempPath: string | null = null;

        this.$patch((state) => {
          state.files = updateFile(state.files, file.id, {
            status: "processing",
            progress: 10,
            error: undefined,
          });
        });

        try {
          const text = await invoke<string>("read_text_file", { path: file.path });
          params.text = text;

          this.$patch((state) => {
            state.files = updateFile(state.files, file.id, { progress: 30 });
          });

          const audioData = await invoke<number[]>("tts_convert", { params });

          this.$patch((state) => {
            state.files = updateFile(state.files, file.id, { progress: 80 });
          });

          let cleanupError: string | null = null;
          if (snapshot.outputFormat === "mp3") {
            await invoke("write_binary_file", {
              path: outputPath,
              data: audioData,
            });
          } else {
            tempPath = `${outputPath}.tmp.mp3`;
            await invoke("write_binary_file", {
              path: tempPath,
              data: audioData,
            });
            await invoke("convert_audio_format", {
              inputPath: tempPath,
              outputPath,
              format: snapshot.outputFormat,
            });
            cleanupError = await removeTempFile(tempPath);
            tempPath = null;
          }

          this.$patch((state) => {
            state.files = updateFile(state.files, file.id, {
              status: "done",
              progress: 100,
              outputPath,
              error: cleanupError ?? undefined,
            });
          });
        } catch (error) {
          const cleanupError = await removeTempFile(tempPath);
          const errorMessage = cleanupError
            ? `${toErrorMessage(error)}\n${cleanupError}`
            : toErrorMessage(error);
          this.$patch((state) => {
            state.files = updateFile(state.files, file.id, {
              status: "error",
              progress: 0,
              error: errorMessage,
            });
          });
        }
      };

      const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < fileIds.length) {
          const currentId = fileIds[nextIndex];
          nextIndex += 1;
          await processFile(currentId);
        }
      });

      try {
        await Promise.all(workers);
      } finally {
        this.$patch({ converting: false });
      }
    },
  },
});
