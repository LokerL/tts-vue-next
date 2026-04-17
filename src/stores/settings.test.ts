import { beforeEach, describe, expect, test } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp } from "vue";
import { createPersistedState, type StorageLike } from "pinia-plugin-persistedstate";

function createMemoryStorage(): StorageLike & { clear(): void } {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    clear() {
      values.clear();
    },
  };
}

describe("useSettingsStore", () => {
  const storage = createMemoryStorage();

  beforeEach(() => {
    const pinia = createPinia();
    pinia.use(createPersistedState({ storage }));
    createApp({}).use(pinia);
    setActivePinia(pinia);
    storage.clear();
  });

  test("uses the planned default settings", async () => {
    const { useSettingsStore } = await import("./settings");
    const store = useSettingsStore();

    expect(store.savePath).toBe("");
    expect(store.outputFormat).toBe("mp3");
    expect(store.maxRetries).toBe(3);
    expect(store.fileConcurrency).toBe(3);
    expect(store.chunkConcurrency).toBe(3);
    expect(store.autoplay).toBe(true);
    expect(store.language).toBe("zh-CN");
    expect(store.themeMode).toBe("system");
  });

  test("updates settings and clamps numeric ranges", async () => {
    const { useSettingsStore } = await import("./settings");
    const store = useSettingsStore();

    store.updateSavePath("/tmp/output");
    store.updateOutputFormat("wav");
    store.updateMaxRetries(99);
    store.updateFileConcurrency(0);
    store.updateChunkConcurrency(9);
    store.updateThemeMode("dark");

    expect(store.savePath).toBe("/tmp/output");
    expect(store.outputFormat).toBe("wav");
    expect(store.maxRetries).toBe(10);
    expect(store.fileConcurrency).toBe(1);
    expect(store.chunkConcurrency).toBe(5);
    expect(store.themeMode).toBe("dark");
  });

  test("rehydrates persisted settings in a new pinia instance", async () => {
    const { useSettingsStore } = await import("./settings");
    const store = useSettingsStore();

    store.updateSavePath("/persisted/output");
    store.updateOutputFormat("flac");
    store.updateMaxRetries(7);
    store.updateThemeMode("dark");

    const nextPinia = createPinia();
    nextPinia.use(createPersistedState({ storage }));
    createApp({}).use(nextPinia);
    setActivePinia(nextPinia);

    const rehydratedStore = useSettingsStore();

    expect(rehydratedStore.savePath).toBe("/persisted/output");
    expect(rehydratedStore.outputFormat).toBe("flac");
    expect(rehydratedStore.maxRetries).toBe(7);
    expect(rehydratedStore.themeMode).toBe("dark");
  });

  test("ignores non-finite numeric updates", async () => {
    const { useSettingsStore } = await import("./settings");
    const store = useSettingsStore();

    store.updateMaxRetries(Number.NaN);
    store.updateFileConcurrency(Number.POSITIVE_INFINITY);
    store.updateChunkConcurrency(Number.NEGATIVE_INFINITY);

    expect(store.maxRetries).toBe(3);
    expect(store.fileConcurrency).toBe(3);
    expect(store.chunkConcurrency).toBe(3);
  });

  test("updates autoplay preference explicitly", async () => {
    const { useSettingsStore } = await import("./settings");
    const store = useSettingsStore();

    store.updateAutoplay(false);

    expect(store.autoplay).toBe(false);
  });
});
