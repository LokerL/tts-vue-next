import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "text-to-speech",
    component: () => import("../views/TextToSpeech.vue"),
  },
  {
    path: "/batch",
    name: "batch-convert",
    component: () => import("../views/BatchConvert.vue"),
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("../views/Settings.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
