<template>
  <section id="hero">
    <h1 class="tagline">
      <span class="accent">Electron-Egg</span>
    </h1>
    <p class="description">A fast, desktop software development framework</p>
    <p class="actions">
      <a class="setup" href="https://www.kaka996.com/" target="_blank">
        Get Started
      </a>
    </p>
    <p class="actions">
      <a class="setup" @click="test">测试生成语音</a>
    </p>
    <p class="actions">
      <a class="setup" @click="test2">获取列表</a>
    </p>
  </section>
</template>
<script setup>
  import { ipc, edge } from '@/api';
  const test = () => {
    ipc
      ?.invoke(edge.tts, {
        config: {
          voice: 'zh-CN-XiaoyiNeural',
          lang: 'zh-CN',
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          saveSubtitles: false,
          proxy: null,
          rate: 'default',
          pitch: 'default',
          volume: 'default',
          timeout: 10000,
        },
        text: '你好啊，今天天气怎么样',
        outputFilePath: 'C:\\Users\\Lenovo\\Desktop\\test.mp3',
      })
      .then((r) => {
        console.log(r);
      });
  };
  const test2 = () => {
    ipc?.invoke(edge.getVoices).then((r) => {
      console.log(r);
    });
  };
</script>
<style scoped>
  section {
    padding: 42px 32px;
  }

  #hero {
    padding: 150px 32px;
    text-align: center;
    height: 100%;
  }

  .tagline {
    font-size: 52px;
    line-height: 1.25;
    font-weight: bold;
    letter-spacing: -1.5px;
    max-width: 960px;
    margin: 0px auto;
  }

  html:not(.dark) .accent,
  .dark .tagline {
    background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .description {
    max-width: 960px;
    line-height: 1.5;
    color: var(--vt-c-text-2);
    transition: color 0.5s;
    font-size: 22px;
    margin: 24px auto 40px;
  }

  .actions a {
    font-size: 16px;
    display: inline-block;
    background-color: var(--vt-c-bg-mute);
    padding: 8px 18px;
    font-weight: 500;
    border-radius: 8px;
    transition:
      background-color 0.5s,
      color 0.5s;
    text-decoration: none;
  }

  .actions .setup {
    color: var(--vt-c-text-code);
    background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
  }

  .actions .setup:hover {
    background-color: var(--vt-c-gray-light-4);
    transition-duration: 0.2s;
  }
</style>
