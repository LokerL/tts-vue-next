// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
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

const cardStub = defineComponent({
  inheritAttrs: false,
  template: '<section v-bind="$attrs"><slot /></section>',
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
  template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const avatarStub = defineComponent({
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
});

const iconStub = defineComponent({
  inheritAttrs: false,
  template: '<span v-bind="$attrs"><slot /></span>',
});

describe("FileUpload", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    openMock.mockReset();
  });

  async function mountFileUpload() {
    const { default: FileUpload } = await import("./FileUpload.vue");

    return mount(FileUpload, {
      global: {
        plugins: [pinia],
        stubs: {
          VCard: cardStub,
          VBtn: buttonStub,
          VAvatar: avatarStub,
          VIcon: iconStub,
        },
      },
    });
  }

  test("opens the file picker when clicked and not converting", async () => {
    openMock.mockResolvedValue(["C:/docs/alpha.txt"]);

    const wrapper = await mountFileUpload();

    await wrapper.find(".file-upload").trigger("click");

    expect(openMock).toHaveBeenCalledTimes(1);
  });

  test("does not open the file picker while converting", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({ converting: true });

    const wrapper = await mountFileUpload();

    await wrapper.find(".file-upload").trigger("click");

    expect(openMock).not.toHaveBeenCalled();
  });

  test("does not add dropped files while converting", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({ converting: true });
    const addFilesSpy = vi.spyOn(batchStore, "addFiles");

    const wrapper = await mountFileUpload();

    const dataTransfer = {
      getData: vi.fn(() => "file:///C:/docs/alpha.txt"),
    };

    await wrapper.find(".file-upload").trigger("drop", {
      dataTransfer,
    });

    expect(addFilesSpy).not.toHaveBeenCalled();
  });

  test("shows a visible disabled state while converting", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({ converting: true });

    const wrapper = await mountFileUpload();

    const card = wrapper.find(".file-upload");
    const button = wrapper.find("button");

    expect(card.classes()).toContain("file-upload--disabled");
    expect(button.attributes("disabled")).toBeDefined();
  });
});
