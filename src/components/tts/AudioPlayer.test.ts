// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { useSettingsStore } from "../../stores/settings";
import { useTtsStore } from "../../stores/tts";

const { saveMock, writeFileMock, removeMock, invokeMock, messageErrorMock } = vi.hoisted(() => ({
  saveMock: vi.fn(),
  writeFileMock: vi.fn(),
  removeMock: vi.fn(),
  invokeMock: vi.fn(),
  messageErrorMock: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: saveMock,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: writeFileMock,
  remove: removeMock,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("vuetify-message-vue3", () => ({
  useMessage: () => ({
    error: messageErrorMock,
  }),
}));

const passthroughStub = defineComponent({
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
});

const buttonStub = defineComponent({
  inheritAttrs: false,
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  template:
    '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const sliderStub = defineComponent({
  template: "<div><slot /></div>",
});

describe("AudioPlayer", () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    saveMock.mockReset();
    writeFileMock.mockReset();
    removeMock.mockReset();
    invokeMock.mockReset();

    const settingsStore = useSettingsStore();
    settingsStore.$reset();
    settingsStore.updateOutputFormat("wav");

    const ttsStore = useTtsStore();
    ttsStore.$patch({
      audioBytes: new Uint8Array([1, 2, 3]),
      error: null,
    });
  });

  test("renders the Aero Glass playback console with labeled icon controls", async () => {
    const { default: AudioPlayer } = await import("./AudioPlayer.vue");
    const wrapper = mount(AudioPlayer, {
      global: {
        stubs: {
          VCard: passthroughStub,
          VBtn: buttonStub,
          VIcon: passthroughStub,
          VSlider: sliderStub,
        },
      },
    });

    expect(wrapper.find(".audio-player.glass-panel").exists()).toBe(true);
    expect(wrapper.text()).toContain("Playback Console");
    expect(wrapper.find('button[aria-label="Toggle playback"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Save generated audio"]').exists()).toBe(true);
  });

  test("preserves the original save error when temp file cleanup also fails", async () => {
    saveMock.mockResolvedValue("/tmp/output.wav");
    writeFileMock.mockRejectedValue(new Error("write failed"));
    removeMock.mockRejectedValue(new Error("cleanup failed"));

    const { default: AudioPlayer } = await import("./AudioPlayer.vue");
    const wrapper = mount(AudioPlayer, {
      global: {
        stubs: {
          VCard: passthroughStub,
          VBtn: buttonStub,
          VIcon: passthroughStub,
          VSlider: sliderStub,
        },
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[1].trigger("click");
    await flushPromises();

    const ttsStore = useTtsStore();
    expect(ttsStore.error).toContain("write failed");
    expect(removeMock).not.toHaveBeenCalled();
  });

  test("preserves the conversion error when temp file cleanup also fails", async () => {
    saveMock.mockResolvedValue("/tmp/output.wav");
    writeFileMock.mockResolvedValue(undefined);
    invokeMock.mockRejectedValue(new Error("convert failed"));
    removeMock.mockRejectedValue(new Error("cleanup failed"));

    const { default: AudioPlayer } = await import("./AudioPlayer.vue");
    const wrapper = mount(AudioPlayer, {
      global: {
        stubs: {
          VCard: passthroughStub,
          VBtn: buttonStub,
          VIcon: passthroughStub,
          VSlider: sliderStub,
        },
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[1].trigger("click");
    await flushPromises();

    const ttsStore = useTtsStore();
    expect(ttsStore.error).toContain("convert failed");
    expect(removeMock).toHaveBeenCalledWith("/tmp/output.wav.tmp.mp3");
  });
});
