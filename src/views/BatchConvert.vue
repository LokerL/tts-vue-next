<script setup lang="ts">
import BatchOptions from "../components/batch/BatchOptions.vue";
import FileList from "../components/batch/FileList.vue";
</script>

<template>
  <v-container fluid class="batch-page">
    <section class="batch-workspace">
      <div class="batch-workspace__list-control">
        <div class="batch-workspace__list">
          <FileList />
        </div>

        <div class="batch-workspace__control">
          <BatchOptions />
        </div>
      </div>
    </section>
  </v-container>
</template>

<style scoped>
.batch-page {
  padding: 10px;
  height: 100%;
  background:
    radial-gradient(
      circle at top right,
      rgba(var(--v-theme-primary), 0.08),
      transparent 22%
    ),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0.98)
    );
}

.batch-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-workspace__list-control {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 10px;
  min-height: 0;
}

.batch-workspace__list {
  flex: 1;
  flex-grow: 1;
  min-width: 0;
}

.batch-workspace__control {
  height: 100%;
  width: 300px;
}
</style>
