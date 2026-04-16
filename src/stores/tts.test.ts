import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "./settings";
import { useVoicesStore } from "./voices";

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();
const randomUuidMock = vi.fn();
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("useTtsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invokeMock.mockReset();
    createObjectUrlMock.mockReset();
    createObjectUrlMock.mockReturnValue("blob:new-audio");
    revokeObjectUrlMock.mockReset();
    randomUuidMock.mockReset();
    randomUuidMock.mockReturnValue("task-123");

    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(randomUuidMock);
    Object.assign(URL, {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });

    const settingsStore = useSettingsStore();
    settingsStore.$reset();
    settingsStore.updateMaxRetries(7);
    settingsStore.updateOutputFormat("flac");

    const voicesStore = useVoicesStore();
    voicesStore.$patch({
      voices: [
        {
          Name: "Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)",
          ShortName: "en-US-JennyNeural",
          Gender: "Female",
          Locale: "en-US",
          SuggestedCodec: "audio-24khz-48kbitrate-mono-mp3",
          FriendlyName: "Jenny",
          Status: "GA",
          VoiceTag: {
            ContentCategories: ["General"],
            VoicePersonalities: ["Friendly"],
          },
        },
      ],
      selectedLocale: "en-US",
      selectedVoice: "en-US-JennyNeural",
    });
  });

  afterEach(() => {
    Object.assign(URL, {
      createObjectURL: originalCreateObjectURL,
      revokeObjectURL: originalRevokeObjectURL,
    });
    vi.restoreAllMocks();
  });

  test("formats getters and tracks text counts", async () => {
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.$patch({
      text: "\u4f60",
      rate: 5,
      pitch: -10,
      volume: 0,
    });

    expect(store.rateString).toBe("+5%");
    expect(store.pitchString).toBe("-10Hz");
    expect(store.volumeString).toBe("+0%");
    expect(store.charCount).toBe(1);
    expect(store.byteCount).toBe(3);
  });

  test("sets text directly", async () => {
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.setText("hello world");

    expect(store.text).toBe("hello world");
  });

  test("skips conversion when text is blank", async () => {
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.setText("   ");
    await store.convert();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(store.converting).toBe(false);
    expect(store.currentTaskId).toBeNull();
  });

  test("converts text and creates a fresh audio URL", async () => {
    invokeMock.mockResolvedValue([1, 2, 3]);
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.$patch({
      text: "hello",
      audioUrl: "blob:old-audio",
    });

    await store.convert();

    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:old-audio");
    expect(randomUuidMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("tts_convert", {
      params: {
        text: "hello",
        voice: "en-US-JennyNeural",
        rate: "+0%",
        pitch: "+0Hz",
        volume: "+0%",
        format: "audio-24khz-48kbitrate-mono-mp3",
        task_id: "task-123",
        max_retries: 7,
      },
    });
    expect(Array.from(store.audioBytes ?? [])).toEqual([1, 2, 3]);
    expect(store.audioUrl).toBe("blob:new-audio");
    expect(store.progress).toBe(100);
    expect(store.converting).toBe(false);
    expect(store.currentTaskId).toBeNull();

    const blob = createObjectUrlMock.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/mpeg");
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3]);
  });

  test("ignores late conversion results after clear", async () => {
    let resolveInvoke: ((value: number[]) => void) | undefined;
    invokeMock.mockImplementation(
      () =>
        new Promise<number[]>((resolve) => {
          resolveInvoke = resolve;
        }),
    );
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.setText("hello");
    const converting = store.convert();
    await flushPromises();

    store.clear();
    resolveInvoke?.([4, 5, 6]);
    await converting;

    expect(store.text).toBe("");
    expect(store.audioBytes).toBeNull();
    expect(store.audioUrl).toBeNull();
    expect(store.progress).toBe(0);
    expect(createObjectUrlMock).not.toHaveBeenCalled();
  });

  test("prevents concurrent convert calls", async () => {
    let resolveInvoke: ((value: number[]) => void) | undefined;
    invokeMock.mockImplementation(
      () =>
        new Promise<number[]>((resolve) => {
          resolveInvoke = resolve;
        }),
    );
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.setText("hello");
    const firstConvert = store.convert();
    await flushPromises();
    const secondConvert = store.convert();
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);

    resolveInvoke?.([1, 2, 3]);
    await Promise.all([firstConvert, secondConvert]);
  });

  test("sends a stop request for the active task", async () => {
    invokeMock.mockResolvedValue(undefined);
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.$patch({ currentTaskId: "task-123" });
    await store.stop();

    expect(invokeMock).toHaveBeenCalledWith("tts_stop", { taskId: "task-123" });
  });

  test("ignores stop errors", async () => {
    invokeMock.mockRejectedValue(new Error("already finished"));
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.$patch({ currentTaskId: "task-123" });

    await expect(store.stop()).resolves.toBeUndefined();
  });

  test("clears text and revokes the current audio URL", async () => {
    const { useTtsStore } = await import("./tts");
    const store = useTtsStore();

    store.$patch({
      text: "hello",
      audioUrl: "blob:old-audio",
      audioBytes: new Uint8Array([1, 2, 3]),
      error: "something went wrong",
      progress: 55,
    });

    store.clear();

    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:old-audio");
    expect(store.text).toBe("");
    expect(store.audioUrl).toBeNull();
    expect(store.audioBytes).toBeNull();
    expect(store.error).toBeNull();
    expect(store.progress).toBe(0);
  });
});
