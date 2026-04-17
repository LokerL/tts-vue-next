// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { useSettingsStore } from "../stores/settings";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const passthroughStub = defineComponent({
  template: "<div><slot /></div>",
});

const textFieldStub = defineComponent({
  props: {
    label: {
      type: String,
      default: "",
    },
    modelValue: {
      type: String,
      default: "",
    },
  },
  emits: ["click", "click:append-inner"],
  template: `
    <div>
      <button class="text-field-stub" @click="$emit('click')">{{ label }} {{ modelValue }}</button>
      <button class="text-field-append-stub" @click="$emit('click:append-inner'); $emit('click')">append</button>
    </div>
  `,
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

const switchStub = defineComponent({
  props: {
    label: {
      type: String,
      default: "",
    },
  },
  template: '<div class="switch-stub">{{ label }}</div>',
});

describe("Settings view", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue("C:/exports");

    const pinia = createPinia();
    setActivePinia(pinia);

    const settingsStore = useSettingsStore();
    settingsStore.$reset();
  });

  test("opens the folder picker only once when append icon is clicked", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const { default: Settings } = await import("./Settings.vue");
    const wrapper = mount(Settings, {
      global: {
        plugins: [pinia],
        stubs: {
          VContainer: passthroughStub,
          VCard: passthroughStub,
          VCardTitle: passthroughStub,
          VCardText: passthroughStub,
          VTextField: textFieldStub,
          VSelect: selectStub,
          VSwitch: switchStub,
          VAlert: passthroughStub,
        },
      },
    });

    await wrapper.find(".text-field-append-stub").trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("select_folder");
  });

  test("renders settings sections and updates save path from folder picker", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const { default: Settings } = await import("./Settings.vue");
    const wrapper = mount(Settings, {
      global: {
        plugins: [pinia],
        stubs: {
          VContainer: passthroughStub,
          VCard: passthroughStub,
          VCardTitle: passthroughStub,
          VCardText: passthroughStub,
          VTextField: textFieldStub,
          VSelect: selectStub,
          VSwitch: switchStub,
          VAlert: passthroughStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Output");
    expect(wrapper.text()).toContain("Processing");
    expect(wrapper.text()).toContain("About");
    expect(wrapper.text()).toContain("Default Format");
    expect(wrapper.text()).toContain("Auto-play after conversion");
    expect(wrapper.text()).not.toContain("Chunk Concurrency");

    await wrapper.find(".text-field-stub").trigger("click");
    await flushPromises();

    const settingsStore = useSettingsStore();
    expect(invokeMock).toHaveBeenCalledWith("select_folder");
    expect(settingsStore.savePath).toBe("C:/exports");
  });
});
