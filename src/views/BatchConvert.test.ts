// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { useBatchStore } from "../stores/batch";

const { messageErrorMock } = vi.hoisted(() => ({
  messageErrorMock: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("vuetify-message-vue3", () => ({
  useMessage: () => ({
    error: messageErrorMock,
  }),
}));

const passthroughStub = defineComponent({
  template: '<div :class="$attrs.class"><slot /></div>',
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
    label: {
      type: String,
      default: "",
    },
  },
  template: '<div class="select-stub">{{ label }}</div>',
});

const cardStub = defineComponent({
  template: '<section :class="$attrs.class"><slot /></section>',
});

const tableStub = defineComponent({
  template: '<table :class="$attrs.class"><slot /></table>',
});

const progressStub = defineComponent({
  template: '<div class="progress-stub" />',
});

const avatarStub = defineComponent({
  template: '<div :class="$attrs.class"><slot /></div>',
});

const iconStub = defineComponent({
  template: '<span :class="$attrs.class"><slot /></span>',
});

const chipStub = defineComponent({
  template: '<span><slot /></span>',
});

describe("BatchConvert view", () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const batchStore = useBatchStore();
    batchStore.$reset();
    batchStore.files = [
      {
        id: "file-1",
        name: "alpha.txt",
        path: "C:/docs/alpha.txt",
        size: 0,
        status: "pending",
        progress: 0,
      },
    ];
  });

  test("renders the batch controls and concurrency selector", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const batchStore = useBatchStore();
    batchStore.files = [
      {
        id: "file-1",
        name: "alpha.txt",
        path: "C:/docs/alpha.txt",
        size: 0,
        status: "pending",
        progress: 0,
      },
    ];

    const { default: BatchConvert } = await import("./BatchConvert.vue");
    const wrapper = mount(BatchConvert, {
      global: {
        plugins: [pinia],
        stubs: {
          VContainer: passthroughStub,
          VRow: passthroughStub,
          VCol: passthroughStub,
          VBtn: buttonStub,
          VSelect: selectStub,
          VSpacer: passthroughStub,
          VCard: cardStub,
          VTable: tableStub,
          VProgressLinear: progressStub,
          VAvatar: avatarStub,
          VIcon: iconStub,
          VChip: chipStub,
        },
      },
    });

    const buttonLabels = wrapper
      .findAll("button")
      .map((button) => button.text())
      .filter(Boolean);

    expect(wrapper.text()).toContain("Drop text files into the queue");
    expect(wrapper.text()).toContain("Queue Progress");
    expect(wrapper.text()).toContain("Concurrency");
    expect(buttonLabels).toContain("Start All");
    expect(buttonLabels).toContain("Clear");
  });

  test("renders the Aero Glass batch workspace layout", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const { default: BatchConvert } = await import("./BatchConvert.vue");
    const wrapper = mount(BatchConvert, {
      global: {
        plugins: [pinia],
        stubs: {
          VContainer: passthroughStub,
          VRow: passthroughStub,
          VCol: passthroughStub,
          VBtn: buttonStub,
          VSelect: selectStub,
          VSpacer: passthroughStub,
          VCard: cardStub,
          VTable: tableStub,
          VProgressLinear: progressStub,
          VAvatar: avatarStub,
          VIcon: iconStub,
          VChip: chipStub,
        },
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(["page-shell", "batch-page"]));
    expect(wrapper.find(".batch-page__hero.section-hero.glass-panel").exists()).toBe(true);
    expect(wrapper.text()).toContain("Batch Workflow Studio");
    expect(wrapper.text()).toContain("Convert document queues with clear progress controls");
    expect(wrapper.find(".batch-workspace").exists()).toBe(true);
    expect(wrapper.find(".batch-workspace__upload .file-upload.glass-panel").exists()).toBe(true);
    expect(wrapper.find(".batch-workspace__list .file-list.glass-panel").exists()).toBe(true);
    expect(wrapper.find(".batch-workspace__actions .batch-actions.glass-panel").exists()).toBe(true);
    expect(wrapper.text()).toContain("Drop text files into the queue");
    expect(wrapper.text()).toContain("Queue Progress");

    const styles = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n");
    expect(styles).not.toContain("calc(100vh");
  });
});
