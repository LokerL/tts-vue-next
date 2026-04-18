<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  APP_VERSION,
  GITHUB_REPO_URL,
  GITHUB_LATEST_RELEASE_API,
} from "../../constants/project";

const route = useRoute();
const { t } = useI18n();
const latestVersion = ref<string | null>(null);
const hasUpdate = ref(false);

const navItems = computed(() => [
  { title: t("nav.textToSpeech"), icon: "mdi-star", to: "/" },
  { title: t("nav.batchConvert"), icon: "mdi-file-multiple", to: "/batch" },
  { title: t("nav.settings"), icon: "mdi-cog", to: "/settings" },
]);

function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, "").split("-")[0] ?? "";
}

function isVersionNewer(latest: string, current: string): boolean {
  const latestParts = normalizeVersion(latest)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const currentParts = normalizeVersion(current)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(latestParts.length, currentParts.length);

  for (let index = 0; index < length; index += 1) {
    const latestValue = latestParts[index] ?? 0;
    const currentValue = currentParts[index] ?? 0;

    if (latestValue > currentValue) {
      return true;
    }

    if (latestValue < currentValue) {
      return false;
    }
  }

  return false;
}

async function checkLatestVersion() {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { tag_name?: string };
    let tagName = data.tag_name?.trim();
    if (!tagName) {
      return;
    }

    latestVersion.value = tagName;
    hasUpdate.value = isVersionNewer(tagName, APP_VERSION);
  } catch {
    latestVersion.value = null;
    hasUpdate.value = false;
  }
}

const versionLabel = computed(() => {
  const current = `v${normalizeVersion(APP_VERSION)}`;

  if (hasUpdate.value && latestVersion.value) {
    const latest = `v${normalizeVersion(latestVersion.value)}`;
    return t("nav.versionUpdateAvailable", { current, latest });
  }

  return t("nav.versionCurrent", { version: current });
});

async function openReleasePage() {
  try {
    await openUrl(`${GITHUB_REPO_URL}/releases/latest`);
  } catch {
    return;
  }
}

onMounted(() => {
  void checkLatestVersion();
});
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
      <div
        class="app-sidebar__footer"
        :class="{ 'app-sidebar__footer--update': hasUpdate }"
        data-testid="sidebar-version"
        @click="openReleasePage">
        <v-icon
          v-if="hasUpdate"
          size="14"
          class="app-sidebar__version-icon"
          data-testid="sidebar-version-update-icon">
          mdi-arrow-up-bold-box-outline
        </v-icon>
        <span>{{ versionLabel }}</span>
      </div>
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
  display: flex;
  flex-direction: column;
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
  flex: 1;
}

.app-sidebar__footer {
  width: 100%;
  text-align: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  cursor: pointer;
  position: fixed;
  bottom: 0;
}

.app-sidebar__footer--update {
  color: rgb(var(--v-theme-warning));
}

.app-sidebar__version-icon {
  flex-shrink: 0;
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
