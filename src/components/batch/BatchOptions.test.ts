// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import i18n from "../../plugins/i18n";
import { useBatchStore } from "../../stores/batch";
import type { BatchFile } from "../../types";

const cardStub = defineComponent({
  template: '<section><slot /></section>',
});

const cardItemStub = defineComponent({
  template: '<div><slot /><slot name="prepend" /><slot name="append" /></div>',
});

const cardTextStub = defineComponent({
  template: '<div><slot /></div>',
});

const cardActionsStub = defineComponent({
  template: '<div><slot /></div>',
});

const buttonStub = defineComponent({
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click"],
  template:
    '<button :disabled="disabled" :data-loading="loading" @click="$emit(\'click\')"><slot /></button>',
});

const selectStub = defineComponent({
  props: {
    label: {
      type: String,
      default: "",
    },
  },
  template: '<label>{{ label }}</label>',
});

const sliderStub = defineComponent({
  template: '<div class="slider-stub" />',
});

const dividerStub = defineComponent({
  template: '<hr />',
});

const avatarStub = defineComponent({
  template: '<div><slot /></div>',
});

const iconStub = defineComponent({
  template: '<span><slot /></span>',
});

const voiceSelectorStub = defineComponent({
  template: '<div>Language Voice</div>',
});

const sampleFile: BatchFile = {
  id: "1",
  name: "a.txt",
  path: "C:/a.txt",
  size: 0,
  status: "pending",
  progress: 0,
};

describe("BatchOptions", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    i18n.global.locale.value = "en";
  });

  async function mountBatchOptions(overrides?: {
    files?: BatchFile[];
    converting?: boolean;
  }) {
    const batchStore = useBatchStore();

    batchStore.$patch({
      files: overrides?.files ?? batchStore.files,
      converting: overrides?.converting ?? batchStore.converting,
    });

    const { default: BatchOptions } = await import("./BatchOptions.vue");

    return mount(BatchOptions, {
      global: {
        plugins: [i18n],
        stubs: {
          VCard: cardStub,
          VCardItem: cardItemStub,
          VCardText: cardTextStub,
          VCardActions: cardActionsStub,
          VBtn: buttonStub,
          VSelect: selectStub,
          VSlider: sliderStub,
          VDivider: dividerStub,
          VAvatar: avatarStub,
          VIcon: iconStub,
          VoiceSelector: voiceSelectorStub,
        },
      },
    });
  }

  test("renders shared voice fields and batch actions", async () => {
    const wrapper = await mountBatchOptions({ files: [sampleFile] });

    expect(wrapper.text()).toContain("Language");
    expect(wrapper.text()).toContain("Voice");
    expect(wrapper.text()).toContain("Rate");
    expect(wrapper.text()).toContain("Pitch");
    expect(wrapper.text()).toContain("Volume");
    expect(wrapper.text()).toContain("Output Format");
    expect(wrapper.text()).toContain("File Concurrency");
    expect(wrapper.text()).toContain("Start All");
    expect(wrapper.text()).toContain("Clear");
  });

  test("disables both action buttons when there are no files", async () => {
    const wrapper = await mountBatchOptions({ files: [] });
    const [startButton, clearButton] = wrapper.findAll("button");

    expect(startButton.attributes("disabled")).toBeDefined();
    expect(startButton.attributes("data-loading")).toBe("false");
    expect(clearButton.attributes("disabled")).toBeDefined();
  });

  test("shows loading on the primary action and disables the secondary action while converting", async () => {
    const wrapper = await mountBatchOptions({
      files: [sampleFile],
      converting: true,
    });
    const [startButton, clearButton] = wrapper.findAll("button");

    expect(startButton.attributes("disabled")).toBeUndefined();
    expect(startButton.attributes("data-loading")).toBe("true");
    expect(clearButton.attributes("disabled")).toBeDefined();
  });

  test("dispatches batch actions through the store", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({ files: [sampleFile] });

    const convertAllSpy = vi.spyOn(batchStore, "convertAll").mockResolvedValue();
    const clearFilesSpy = vi.spyOn(batchStore, "clearFiles");

    const wrapper = await mountBatchOptions();
    const [startButton, clearButton] = wrapper.findAll("button");

    await startButton.trigger("click");
    await clearButton.trigger("click");

    expect(convertAllSpy).toHaveBeenCalledTimes(1);
    expect(clearFilesSpy).toHaveBeenCalledTimes(1);
  });
});
