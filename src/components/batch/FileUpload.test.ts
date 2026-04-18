// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import i18n from "../../plugins/i18n";
import { useBatchStore } from "../../stores/batch";

const { openMock, messageErrorMock } = vi.hoisted(() => ({
  openMock: vi.fn(),
  messageErrorMock: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: openMock,
}));

vi.mock("vuetify-message-vue3", () => ({
  useMessage: () => ({
    error: messageErrorMock,
  }),
}));

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


describe("FileUpload", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    openMock.mockReset();
    messageErrorMock.mockReset();
    i18n.global.locale.value = "en";
  });

  async function mountFileUpload() {
    const { default: FileUpload } = await import("./FileUpload.vue");

    return mount(FileUpload, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          VBtn: buttonStub,
        },
      },
    });
  }

  test("renders a picker button", async () => {
    const wrapper = await mountFileUpload();

    expect(wrapper.text()).toContain("Choose Files");
    expect(wrapper.find("button").exists()).toBe(true);
  });

  test("opens the file picker when clicked and not converting", async () => {
    openMock.mockResolvedValue(["C:/docs/alpha.txt"]);

    const wrapper = await mountFileUpload();

    await wrapper.find("button").trigger("click");

    expect(openMock).toHaveBeenCalledTimes(1);
  });

  test("renders a disabled picker button while converting", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({ converting: true });

    const wrapper = await mountFileUpload();

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });
});
