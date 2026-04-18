<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

const navItems = [
  { title: "文本转换", icon: "mdi-star", to: "/" },
  { title: "批量转换", icon: "mdi-file-multiple", to: "/batch" },
  { title: "设置", icon: "mdi-cog", to: "/settings" },
];
</script>

<template>
  <div class="app-shell">
    <v-navigation-drawer
      permanent
      width="150"
      class="app-sidebar glass-panel"
      elevation="0">
      <v-list nav density="comfortable" class="app-sidebar__nav">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :active="route.path === item.to"
          :exact="item.to === '/'"
          :title="item.title"
          :prepend-icon="item.icon" />
      </v-list>
    </v-navigation-drawer>

    <v-main class="app-main-shell">
      <div class="app-main">
        <router-view />
      </div>
    </v-main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);

  box-sizing: border-box;
}

.app-sidebar {
  align-self: stretch;
  padding: 10px 0px;
}

.app-sidebar__brand {
  display: grid;
  gap: 6px;
  padding: 4px 10px 18px;
}

.app-sidebar__title {
  margin: 0;
}

.app-sidebar__subtitle {
  margin: 0;
}

.app-sidebar__nav {
  display: grid;
  gap: 5px;
}

.app-sidebar__footer {
  margin-top: auto;
  padding: 18px 10px 4px;
}

.app-main-shell {
  min-width: 0;
  min-height: 0;
}

.app-main {
  height: 100%;
  width: calc(100vw - 150px);
  overflow-y: auto;
}
</style>
