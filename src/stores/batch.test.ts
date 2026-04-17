import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "./settings";
import { useVoicesStore } from "./voices";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("useBatchStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invokeMock.mockReset();

    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000001")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000002")
      .mockReturnValueOnce("00000000-0000-0000-0000-000000000003");

    const settingsStore = useSettingsStore();
    settingsStore.$reset();
    settingsStore.updateSavePath("C:/exports");
    settingsStore.updateMaxRetries(6);

    const voicesStore = useVoicesStore();
    voicesStore.$patch({
      voices: [
        {
          Name: "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)",
          ShortName: "zh-CN-XiaoxiaoNeural",
          Gender: "Female",
          Locale: "zh-CN",
          SuggestedCodec: "audio-24khz-48kbitrate-mono-mp3",
          FriendlyName: "Xiaoxiao",
          Status: "GA",
          VoiceTag: {
            ContentCategories: ["General"],
            VoicePersonalities: ["Warm"],
          },
        },
      ],
      selectedLocale: "zh-CN",
      selectedVoice: "zh-CN-XiaoxiaoNeural",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("adds unique files and derives names from paths", async () => {
    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles([
      "C:/docs/alpha.txt",
      "C:/docs/beta.md",
      "C:/docs/alpha.txt",
    ]);

    expect(store.files).toHaveLength(2);
    expect(store.files.map((file) => file.name)).toEqual(["alpha.txt", "beta.md"]);
    expect(store.files.map((file) => file.status)).toEqual(["pending", "pending"]);
  });

  test("reads text, converts audio, and saves mp3 output through the backend command", async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "read_text_file") {
        return "hello from file";
      }
      if (command === "tts_convert") {
        return [1, 2, 3];
      }
      if (command === "write_binary_file") {
        return undefined;
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles(["C:/docs/alpha.txt"]);
    await store.convertAll();

    expect(invokeMock).toHaveBeenCalledWith("read_text_file", { path: "C:/docs/alpha.txt" });
    expect(invokeMock).toHaveBeenCalledWith("tts_convert", {
      params: expect.objectContaining({
        text: "hello from file",
        voice: "zh-CN-XiaoxiaoNeural",
        rate: "+0%",
        pitch: "+0Hz",
        volume: "+0%",
        format: "audio-24khz-48kbitrate-mono-mp3",
        task_id: "00000000-0000-0000-0000-000000000001",
        max_retries: 6,
      }),
    });
    expect(invokeMock).toHaveBeenCalledWith("write_binary_file", {
      path: "C:/exports/alpha.mp3",
      data: [1, 2, 3],
    });
    expect(store.files[0]).toMatchObject({
      status: "done",
      progress: 100,
      outputPath: "C:/exports/alpha.mp3",
    });
    expect(store.converting).toBe(false);
  });

  test("writes a temporary mp3 through backend commands before converting non-mp3 output", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.updateOutputFormat("wav");

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "read_text_file") {
        return "hello from file";
      }
      if (command === "tts_convert") {
        return [1, 2, 3];
      }
      if (
        command === "write_binary_file"
        || command === "convert_audio_format"
        || command === "remove_file"
      ) {
        return undefined;
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles(["C:/docs/alpha.txt"]);
    await store.convertAll();

    expect(invokeMock).toHaveBeenCalledWith("write_binary_file", {
      path: "C:/exports/alpha.wav.tmp.mp3",
      data: [1, 2, 3],
    });
    expect(invokeMock).toHaveBeenCalledWith("convert_audio_format", {
      inputPath: "C:/exports/alpha.wav.tmp.mp3",
      outputPath: "C:/exports/alpha.wav",
      format: "wav",
    });
    expect(invokeMock).toHaveBeenCalledWith("remove_file", {
      path: "C:/exports/alpha.wav.tmp.mp3",
    });
    expect(store.files[0]).toMatchObject({
      status: "done",
      progress: 100,
      outputPath: "C:/exports/alpha.wav",
    });
    expect(store.files[0].error).toBeUndefined();
  });

  test("uses the batch settings snapshot even if settings change mid-run", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.updateFileConcurrency(1);

    invokeMock.mockImplementation(async (command: string, payload?: unknown) => {
      if (command === "read_text_file") {
        return "hello from file";
      }

      if (command === "tts_convert") {
        settingsStore.updateOutputFormat("wav");
        settingsStore.updateSavePath("D:/changed");
        settingsStore.updateMaxRetries(2);
        return [1, 2, 3];
      }

      if (command === "write_binary_file") {
        return undefined;
      }

      if (command === "convert_audio_format" || command === "remove_file") {
        return undefined;
      }

      throw new Error(`Unexpected command: ${command} ${JSON.stringify(payload)}`);
    });

    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles(["C:/docs/alpha.txt", "C:/docs/beta.txt"]);
    await store.convertAll();

    expect(invokeMock).toHaveBeenCalledWith("tts_convert", {
      params: expect.objectContaining({
        max_retries: 6,
      }),
    });
    expect(invokeMock).not.toHaveBeenCalledWith(
      "convert_audio_format",
      expect.anything(),
    );

    const writeCalls = invokeMock.mock.calls.filter(
      ([command]) => command === "write_binary_file",
    ) as Array<[string, { path: string; data: number[] }]>;

    expect(writeCalls.map(([, payload]) => payload.path)).toEqual([
      "C:/exports/alpha.mp3",
      "C:/exports/beta.mp3",
    ]);
    expect(store.files.map((file) => file.outputPath)).toEqual([
      "C:/exports/alpha.mp3",
      "C:/exports/beta.mp3",
    ]);
  });

  test("reports a backend write failure on the batch item", async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "read_text_file") {
        return "hello from file";
      }
      if (command === "tts_convert") {
        return [1, 2, 3];
      }
      if (command === "write_binary_file") {
        throw new Error("write failed");
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles(["C:/docs/alpha.txt"]);
    await store.convertAll();

    expect(store.files[0]).toMatchObject({
      status: "error",
      progress: 0,
      error: "write failed",
    });
    expect(store.converting).toBe(false);
  });

  test("keeps the conversion error and appends temp cleanup failure details", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.updateOutputFormat("wav");

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "read_text_file") {
        return "hello from file";
      }
      if (command === "tts_convert") {
        return [1, 2, 3];
      }
      if (command === "write_binary_file") {
        return undefined;
      }
      if (command === "convert_audio_format") {
        throw new Error("convert failed");
      }
      if (command === "remove_file") {
        throw new Error("cleanup failed");
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles(["C:/docs/alpha.txt"]);
    await store.convertAll();

    expect(store.files[0].status).toBe("error");
    expect(store.files[0].error).toContain("convert failed");
    expect(store.files[0].error).toContain("cleanup failed");
  });

  test("resets an errored file back to pending when retried", async () => {
    const { useBatchStore } = await import("./batch");
    const store = useBatchStore();

    store.addFiles(["C:/docs/alpha.txt"]);
    store.files = store.files.map((file) => ({
      ...file,
      status: "error",
      progress: 42,
      error: "network down",
    }));

    store.retryFile("00000000-0000-0000-0000-000000000001");

    expect(store.files[0]).toMatchObject({
      status: "pending",
      progress: 0,
    });
    expect(store.files[0].error).toBeUndefined();
  });
});
