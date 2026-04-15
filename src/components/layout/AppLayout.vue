<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const navItems = [
  { title: "Text to Speech", icon: "mdi-text-to-speech", to: "/" },
  { title: "Batch Convert", icon: "mdi-file-multiple", to: "/batch" },
  { title: "Settings", icon: "mdi-cog", to: "/settings" },
];

function navigate(to: string) {
  router.push(to);
}
</script>

<template>
  <v-navigation-drawer rail permanent class="nav-rail">
    <v-list nav density="compact" class="mt-2">
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :active="route.path === item.to"
        :title="item.title"
        :prepend-icon="item.icon"
        @click="navigate(item.to)"
      />
    </v-list>
  </v-navigation-drawer>

  <v-main class="app-main">
    <router-view />
  </v-main>
</template>

<style scoped>
.nav-rail {
  margin-top: 36px;
}

.app-main {
  margin-top: 36px;
  height: calc(100vh - 36px);
  overflow-y: auto;
}
</style>
