// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import i18n from "../plugins/i18n";
import { useSettingsStore } from "../stores/settings";

const { invokeMock, messageErrorMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  messageErrorMock: vi.fn(),
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
    items: {
      type: Array,
      default: () => [],
    },
    label: {
      type: String,
      default: "",
    },
    modelValue: {
      type: [String, Number],
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template: `
    <label>
      <span>{{ label }}</span>
      <select
        class="select-stub"
        :data-label="label"
        :value="modelValue"
        @change="$emit('update:modelValue', Number($event.target.value))"
      >
        <option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option>
      </select>
    </label>
  `,
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

async function mountSettings() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const { default: Settings } = await import("./Settings.vue");
  return mount(Settings, {
    global: {
      plugins: [pinia, i18n],
      stubs: {
        VContainer: passthroughStub,
        VCard: passthroughStub,
        VCardItem: passthroughStub,
        VCardTitle: passthroughStub,
        VCardText: passthroughStub,
        VAvatar: passthroughStub,
        VIcon: passthroughStub,
        VTextField: textFieldStub,
        VSelect: selectStub,
        VSwitch: switchStub,
      },
    },
  });
}

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
    const wrapper = await mountSettings();

    await wrapper.find(".text-field-append-stub").trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("select_folder");
  });

  test("renders processing controls including chunk concurrency and updates save path", async () => {
    const wrapper = await mountSettings();

    expect(wrapper.text()).toContain("Output");
    expect(wrapper.text()).toContain("Processing");
    expect(wrapper.text()).toContain("Default Format");
    expect(wrapper.text()).toContain("Display Language");
    expect(wrapper.text()).toContain("Auto-play after conversion");
    expect(wrapper.text()).toContain("Max Retries");
    expect(wrapper.text()).toContain("File Concurrency");
    expect(wrapper.text()).toContain("Chunk Concurrency");

    const settingsStore = useSettingsStore();
    const chunkConcurrencySelect = wrapper
      .findAll(".select-stub")
      .find((select) => select.attributes("data-label") === "Chunk Concurrency");

    expect(chunkConcurrencySelect).toBeDefined();
    await chunkConcurrencySelect!.setValue("5");
    expect(settingsStore.chunkConcurrency).toBe(5);

    await wrapper.find(".text-field-stub").trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledWith("select_folder");
    expect(settingsStore.savePath).toBe("C:/exports");
  });
});
