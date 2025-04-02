<template>
  <div class="title-bar">
    <span>{{ title }}</span>
  </div>
</template>
<script setup>
  import { ref } from 'vue';
  import { ipc } from '@/utils/ipcRenderer';
  import { ipcApiRoute } from '@/api';
  const title = ref('');
  ipc.invoke(ipcApiRoute.getTitle).then((r) => {
    title.value = r;
  });
</script>
<style scoped>
  .title-bar {
    border-bottom: 1px solid #e0e0e0;
    height: 30px;
    width: 100%;
    z-index: 9999;
    flex-shrink: 0;
    line-height: 30px;
    user-select: none;
    -webkit-app-region: drag;
  }
</style>
