// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { useTtsStore } from "../../stores/tts";

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

describe("TextInput", () => {
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
