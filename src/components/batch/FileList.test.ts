// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import i18n from "../../plugins/i18n";
import { useBatchStore } from "../../stores/batch";

const { invokeMock, messageErrorMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  messageErrorMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: vi.fn().mockResolvedValue(vi.fn()),
  }),
}));

vi.mock("vuetify-message-vue3", () => ({
  useMessage: () => ({
    error: messageErrorMock,
  }),
}));

const cardStub = defineComponent({
  template: '<section :class="$attrs.class"><slot /></section>',
});

const tableStub = defineComponent({
  template: '<table :class="$attrs.class"><slot /></table>',
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

const iconStub = defineComponent({
  template: '<span><slot /></span>',
});

const chipStub = defineComponent({
  template: '<span><slot /></span>',
});

const progressStub = defineComponent({
  template: '<div class="progress-stub" />',
});

const fileUploadStub = defineComponent({
  template: '<div data-test="file-upload-stub" />',
});

describe("FileList", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invokeMock.mockReset();
    messageErrorMock.mockReset();
  });

  async function mountFileList() {
    const { default: FileList } = await import("./FileList.vue");

    i18n.global.locale.value = "en";

    return mount(FileList, {
      global: {
        plugins: [i18n],
        stubs: {
          VCard: cardStub,
          VTable: tableStub,
          VBtn: buttonStub,
          VIcon: iconStub,
          VChip: chipStub,
          VProgressLinear: progressStub,
          FileUpload: fileUploadStub,
        },
      },
    });
  }

  test("renders the upload entry in the empty state", async () => {
    const wrapper = await mountFileList();

    expect(wrapper.text()).toContain("No files queued yet");
    expect(wrapper.find('[data-test="file-upload-stub"]').exists()).toBe(true);
  });

  test("shows toast when show-in-folder fails", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({
      files: [
        {
          id: "file-1",
          name: "alpha.txt",
          path: "C:/docs/alpha.txt",
          size: 0,
          status: "done",
          progress: 100,
          outputPath: "C:/docs/alpha.mp3",
        },
      ],
    });
    invokeMock.mockRejectedValue(new Error("open folder failed"));

    const wrapper = await mountFileList();
    const showInFolderButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("mdi-folder-open-outline"));

    expect(showInFolderButton).toBeDefined();

    await showInFolderButton?.trigger("click");
    await flushPromises();

    expect(messageErrorMock).toHaveBeenCalledWith("open folder failed");
  });

  test("shows toast when a file enters error state", async () => {
    const batchStore = useBatchStore();
    batchStore.$patch({
      files: [
        {
          id: "file-1",
          name: "alpha.txt",
          path: "C:/docs/alpha.txt",
          size: 0,
          status: "pending",
          progress: 0,
        },
      ],
    });

    await mountFileList();

    batchStore.$patch({
      files: [
        {
          id: "file-1",
          name: "alpha.txt",
          path: "C:/docs/alpha.txt",
          size: 0,
          status: "error",
          progress: 0,
          error: "convert failed",
        },
      ],
    });
    await flushPromises();

    expect(messageErrorMock).toHaveBeenCalledWith("alpha.txt: convert failed");
  });
});
