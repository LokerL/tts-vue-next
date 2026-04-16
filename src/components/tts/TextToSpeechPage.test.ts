// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import type { Voice } from "../../types";
import { useTtsStore } from "../../stores/tts";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const voicesFixture: Voice[] = [
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
];

const passthroughStub = defineComponent({
  template: "<div><slot /></div>",
});

const textareaStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template:
    '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

const buttonStub = defineComponent({
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const selectStub = defineComponent({
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    modelValue: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>',
});

const sliderStub = defineComponent({
  template: "<div><slot /></div>",
});

describe("TextToSpeech view", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "get_voices") {
        return voicesFixture;
      }

      return [];
    });
  });

  test("mounts the real TTS sections together", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const ttsStore = useTtsStore();
    ttsStore.$patch({
      text: "hello",
      converting: false,
      audioBytes: null,
      audioUrl: null,
      error: null,
    });

    const { default: TextToSpeech } = await import("../../views/TextToSpeech.vue");
    const wrapper = mount(TextToSpeech, {
      global: {
        plugins: [pinia],
        stubs: {
          VContainer: passthroughStub,
          VRow: passthroughStub,
          VCol: passthroughStub,
          VCard: passthroughStub,
          VCardItem: passthroughStub,
          VAvatar: passthroughStub,
          VIcon: passthroughStub,
          VCardTitle: passthroughStub,
          VCardSubtitle: passthroughStub,
          VCardText: passthroughStub,
          VTextarea: textareaStub,
          VDivider: passthroughStub,
          VCardActions: passthroughStub,
          VChip: passthroughStub,
          VSpacer: passthroughStub,
          VBtn: buttonStub,
          VSlider: sliderStub,
          VSelect: selectStub,
          VSheet: passthroughStub,
          VAlert: passthroughStub,
        },
      },
    });

    await flushPromises();

    const buttonLabels = wrapper
      .findAll("button")
      .map((button) => button.text())
      .filter(Boolean);

    expect(wrapper.text()).toContain("Input Text");
    expect(wrapper.text()).toContain("Voice & Output");
    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.find("audio").exists()).toBe(true);
    expect(buttonLabels).toContain("Clear");
    expect(buttonLabels).toContain("Start Conversion");
    expect(invokeMock).toHaveBeenCalledWith("get_voices");
  });
});
