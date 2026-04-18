// @vitest-environment happy-dom

import { describe, expect, test, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";

vi.mock("../components/batch/FileList.vue", () => ({
  default: {
    name: "FileList",
    template: '<div class="file-list-stub" />',
  },
}));

vi.mock("../components/batch/BatchOptions.vue", () => ({
  default: {
    name: "BatchOptions",
    template: '<div class="batch-options-stub" />',
  },
}));

const containerStub = defineComponent({
  template: '<div :class="$attrs.class"><slot /></div>',
});

describe("BatchConvert view", () => {
  test("uses a TextToSpeech-style two-column workspace", async () => {
    const { default: BatchConvert } = await import("./BatchConvert.vue");

    const wrapper = mount(BatchConvert, {
      global: {
        stubs: {
          VContainer: containerStub,
        },
      },
    });

    expect(wrapper.find(".batch-workspace__list-control").exists()).toBe(true);
    expect(wrapper.find(".batch-workspace__list .file-list-stub").exists()).toBe(true);
    expect(wrapper.find(".batch-workspace__control .batch-options-stub").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Batch Convert");
    expect(wrapper.text()).not.toContain("Start All");
    expect(wrapper.text()).not.toContain("Clear");
    expect(wrapper.find(".batch-workspace__actions").exists()).toBe(false);
  });
});
