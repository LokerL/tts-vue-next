// @vitest-environment happy-dom

import rawTextInput from "./TextInput.vue?raw";
import { describe, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { useTtsStore } from "../../stores/tts";

const passthroughStub = defineComponent({
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
});

const textareaStub = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template:
    '<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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

describe("TextInput", () => {
  test("renders the Aero Glass script workspace and keeps text metrics", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const store = useTtsStore();
    store.$patch({
      text: "Hello 世界",
      converting: false,
    });

    const { default: TextInput } = await import("./TextInput.vue");
    const wrapper = mount(TextInput, {
      global: {
        plugins: [pinia],
        stubs: {
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
        },
      },
    });

    expect(wrapper.find(".text-panel.glass-panel").exists()).toBe(true);
    expect(wrapper.text()).toContain("Script Workspace");
    expect(wrapper.text()).toContain(
      "Draft, paste, or refine the text you want to synthesize.",
    );
    expect(wrapper.text()).toContain("8 chars");
    expect(wrapper.text()).toContain("12 bytes");
    expect(rawTextInput).not.toContain('variant="solo-filled"');
  });

  test("updates the store through textarea input", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const store = useTtsStore();
    const { default: TextInput } = await import("./TextInput.vue");
    const wrapper = mount(TextInput, {
      global: {
        plugins: [pinia],
        stubs: {
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
        },
      },
    });

    await wrapper.find("textarea").setValue("Fresh script");

    expect(store.text).toBe("Fresh script");
  });

  test("disables Clear when text is empty", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const { default: TextInput } = await import("./TextInput.vue");
    const wrapper = mount(TextInput, {
      global: {
        plugins: [pinia],
        stubs: {
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
        },
      },
    });

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  test("disables Clear while a conversion is running", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const store = useTtsStore();
    store.$patch({
      text: "hello",
      converting: true,
    });

    const { default: TextInput } = await import("./TextInput.vue");
    const wrapper = mount(TextInput, {
      global: {
        plugins: [pinia],
        stubs: {
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
        },
      },
    });

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });
});
