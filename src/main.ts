import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { vuetify } from "./plugins/vuetify";
import { router } from "./router";
import App from "./App.vue";
import "./styles/theme.css";
import i18n from "./plugins/i18n";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App);
app.use(pinia);
app.use(vuetify);
app.use(router);
app.use(i18n);
app.mount("#app");
