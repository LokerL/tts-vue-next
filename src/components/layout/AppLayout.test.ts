// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";

const passthroughStub = defineComponent({
  template: '<div><slot /></div>',
});

const listItemStub = defineComponent({
  props: {
    title: {
      type: String,
      default: "",
    },
    to: {
      type: [String, Object],
      default: undefined,
    },
    active: {
      type: Boolean,
      default: false,
    },
    exact: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    toValue(): string {
      return typeof this.to === "string" ? this.to : "";
    },
  },
  template:
    '<div class="list-item-stub" :data-title="title" :data-to="toValue" :data-active="String(active)" :data-exact="String(exact)">{{ title }}<slot /></div>',
});

async function mountLayout(path = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/batch", component: { template: "<div />" } },
      { path: "/settings", component: { template: "<div />" } },
    ],
  });

  await router.push(path);
  await router.isReady();

  const pinia = createPinia();
  setActivePinia(pinia);

  const { default: AppLayout } = await import("./AppLayout.vue");
  const wrapper = mount(AppLayout, {
    global: {
      plugins: [router, pinia],
      stubs: {
        VNavigationDrawer: passthroughStub,
        VList: passthroughStub,
        VListItem: listItemStub,
        VMain: passthroughStub,
      },
    },
  });

  return { wrapper, router };
}

describe("AppLayout", () => {
  test("renders the branded sidebar shell", async () => {
    const { wrapper } = await mountLayout();

    expect(wrapper.text()).toContain("TTS Vue Next");
    expect(wrapper.text()).toContain("Desktop voice workspace");
    expect(wrapper.text()).toContain("Text to Speech");
    expect(wrapper.text()).toContain("Batch Convert");
    expect(wrapper.text()).toContain("Settings");
    expect(wrapper.find(".app-shell").exists()).toBe(true);
    expect(wrapper.find(".app-main-shell").exists()).toBe(true);
  });

  test("binds navigation items declaratively with route targets and exact matching", async () => {
    const { wrapper } = await mountLayout("/batch");

    const items = wrapper.findAll(".list-item-stub");

    expect(items).toHaveLength(3);
    expect(items[0].attributes("data-to")).toBe("/");
    expect(items[0].attributes("data-exact")).toBe("true");
    expect(items[0].attributes("data-active")).toBe("false");
    expect(items[1].attributes("data-to")).toBe("/batch");
    expect(items[1].attributes("data-active")).toBe("true");
    expect(items[2].attributes("data-to")).toBe("/settings");
  });

  test("uses full-height shell layout without viewport calc magic numbers", async () => {
    const source = await import("./AppLayout.vue?raw");

    expect(source.default).not.toContain("calc(100vh");
    expect(source.default).toContain("min-height: 100vh");
    expect(source.default).toContain("display: grid");
  });
});
