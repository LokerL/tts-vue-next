// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";

const {
  closeMock,
  getCurrentWindowMock,
  isMaximizedMock,
  minimizeMock,
  onResizedMock,
  toggleMaximizeMock,
  unlistenMock,
} = vi.hoisted(() => ({
  closeMock: vi.fn(),
  getCurrentWindowMock: vi.fn(),
  isMaximizedMock: vi.fn(),
  minimizeMock: vi.fn(),
  onResizedMock: vi.fn(),
  toggleMaximizeMock: vi.fn(),
  unlistenMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: getCurrentWindowMock,
}));

vi.mock("vuetify", () => {
  const current = { value: { dark: false } };
  return {
    useTheme: () => ({
      global: {
        current,
      },
    }),
  };
});

const appWindowMock = {
  close: closeMock,
  isMaximized: isMaximizedMock,
  minimize: minimizeMock,
  onResized: onResizedMock,
  toggleMaximize: toggleMaximizeMock,
};

const buttonStub = defineComponent({
  props: {
    ariaLabel: {
      type: String,
      default: "",
    },
  },
  emits: ["click"],
  template:
    '<button :aria-label="ariaLabel || $attrs[\'aria-label\']" @click="$emit(\'click\')"><slot /></button>',
});

const iconStub = defineComponent({
  template: '<span class="icon-stub"><slot /></span>',
});

const passthroughStub = defineComponent({
  template: '<div><slot /></div>',
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function mountTitleBar(errorHandler?: (error: unknown) => void) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const { useSettingsStore } = await import("../../stores/settings");
  useSettingsStore();

  const { default: TitleBar } = await import("./TitleBar.vue");
  return mount(TitleBar, {
    global: {
      config: errorHandler ? { errorHandler } : {},
      plugins: [pinia],
      stubs: {
        VAppBar: passthroughStub,
        VBtn: buttonStub,
        VIcon: iconStub,
        VSpacer: passthroughStub,
      },
    },
  });
}

describe("TitleBar", () => {
  beforeEach(() => {
    closeMock.mockReset();
    getCurrentWindowMock.mockReset();
    isMaximizedMock.mockReset();
    minimizeMock.mockReset();
    onResizedMock.mockReset();
    toggleMaximizeMock.mockReset();
    unlistenMock.mockReset();

    getCurrentWindowMock.mockReturnValue(appWindowMock);
    isMaximizedMock.mockResolvedValue(false);
    onResizedMock.mockResolvedValue(unlistenMock);
    minimizeMock.mockResolvedValue(undefined);
    toggleMaximizeMock.mockResolvedValue(undefined);
    closeMock.mockResolvedValue(undefined);
  });

  test("hydrates maximize icon from the real window state and updates on resize", async () => {
    isMaximizedMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const wrapper = await mountTitleBar();
    await flushPromises();

    expect(wrapper.text()).toContain("mdi-window-restore");
    expect(onResizedMock).toHaveBeenCalledTimes(1);

    const resizeHandler = onResizedMock.mock.calls[0]?.[0];
    expect(typeof resizeHandler).toBe("function");

    await resizeHandler({ payload: { width: 1200, height: 800 } });
    await flushPromises();

    expect(wrapper.text()).toContain("mdi-window-maximize");
  });

  test("cleans up a late resize listener if unmounted before registration resolves", async () => {
    const deferredUnlisten = createDeferred<() => void>();
    onResizedMock.mockReturnValue(deferredUnlisten.promise);

    const wrapper = await mountTitleBar();
    await flushPromises();

    wrapper.unmount();
    expect(unlistenMock).not.toHaveBeenCalled();

    deferredUnlisten.resolve(unlistenMock);
    await flushPromises();

    expect(unlistenMock).toHaveBeenCalledTimes(1);
  });

  test("handles resize listener registration failures locally", async () => {
    const errors: unknown[] = [];
    onResizedMock.mockRejectedValue(new Error("resize registration failed"));

    const wrapper = await mountTitleBar((error) => {
      errors.push(error);
    });
    await flushPromises();
    wrapper.unmount();

    expect(errors).toHaveLength(0);
  });

  test("uses close button hover styling without active-class", async () => {
    const source = await import("./TitleBar.vue?raw");

    expect(source.default).not.toContain("active-class");
    expect(source.default).toContain(".close-btn:hover");
  });

  test("uses safe async handlers for window actions and reports failures accessibly", async () => {
    minimizeMock.mockRejectedValue(new Error("minimize failed"));
    toggleMaximizeMock.mockRejectedValue(new Error("maximize failed"));
    closeMock.mockRejectedValue(new Error("close failed"));

    const unhandledRejections: unknown[] = [];
    const captureUnhandledRejection = (event: PromiseRejectionEvent) => {
      unhandledRejections.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", captureUnhandledRejection);

    const wrapper = await mountTitleBar();
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    const buttons = wrapper.findAll("button");
    await buttons[1].trigger("click");
    await flushPromises();
    await buttons[2].trigger("click");
    await flushPromises();
    await buttons[3].trigger("click");
    await flushPromises();

    window.removeEventListener("unhandledrejection", captureUnhandledRejection);

    expect(unhandledRejections).toHaveLength(0);
    expect(wrapper.get('[role="alert"]').text()).toBe("Window action failed. Please try again.");
  });

  test("exposes accessible labels on icon-only controls", async () => {
    const wrapper = await mountTitleBar();

    const labels = wrapper.findAll("button").map((button) => button.attributes("aria-label"));

    expect(labels).toEqual([
      "Toggle theme",
      "Minimize window",
      "Toggle maximize window",
      "Close window",
    ]);
  });
});
