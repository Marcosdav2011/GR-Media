<template>
  <div class="teo-multiview-shell">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { initializeElectronApi } from 'src/helpers/electron-api-manager';
import { onBeforeUnmount, onMounted } from 'vue';

void initializeElectronApi('MultiviewLayout');

onMounted(() => {
  document.body.style.overflow = 'hidden';
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.teo-multiview-shell {
  background: #05080b;
  height: 100vh;
  overflow: hidden;
  width: 100vw;
}
</style>
