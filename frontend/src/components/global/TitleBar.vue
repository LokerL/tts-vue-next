<template>
  <div class="title-bar">
    <span>{{ title }}</span>
  </div>
  <!-- https://github.com/electron/electron/issues/43371#issuecomment-2410786878 -->
  <iframe
    title="dragRestoreTrick"
    tabIndex="-1"
    srcDoc=""
    style="display: none"
  ></iframe>
</template>
<script setup>
  import { ref } from 'vue';
  import { ipc } from '@/utils/ipcRenderer';
  import { ipcApiRoute } from '@/api';
  const title = ref('TTS-Vue-Next');
  ipc?.invoke(ipcApiRoute.getTitle).then((r) => {
    title.value = r;
  });
</script>
<style scoped>
  .title-bar {
    border-bottom: 1px solid #e0e0e0;
    position: absolute;
    top: 0;
    left: 0;
    background: transparent;
    height: 30px;
    width: 100%;
    z-index: 9999;
    flex-shrink: 0;
    line-height: 30px;
    user-select: none;
    -webkit-app-region: drag;
    span {
      font-weight: bold;
      background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }
</style>
