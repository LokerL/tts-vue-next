<script setup lang="ts">
import TitleBar from "./components/layout/TitleBar.vue";
import AppLayout from "./components/layout/AppLayout.vue";
</script>

<template>
  <v-app>
    <TitleBar />
    <AppLayout />
  </v-app>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

#app {
  height: 100%;
}
</style>
