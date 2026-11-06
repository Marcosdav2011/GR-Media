<template>
  <span class="teo-brand" :class="`teo-brand--${tone}`">
    <img alt="" aria-hidden="true" class="teo-brand__mark" :src="markSrc" />
    <span class="teo-brand__text">
      <span class="teo-brand__name">GR Media</span>
      <span class="teo-brand__sub">MEDIA STUDIO</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import markColor from 'src/assets/brand/gr-media-mark-color.png';
import markLight from 'src/assets/brand/gr-media-mark-light.png';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ tone?: 'dark' | 'light' }>(), {
  tone: 'dark',
});

const markSrc = computed(() =>
  props.tone === 'light' ? markColor : markLight,
);
</script>

<style scoped>
.teo-brand {
  align-items: center;
  display: inline-flex;
  gap: 10px;
}

.teo-brand__mark {
  filter: drop-shadow(0 6px 14px rgba(29, 95, 168, 0.4));
  flex-shrink: 0;
  height: 36px;
  width: auto;
}

.teo-brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.teo-brand__name {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.teo-brand__sub {
  color: #7cb7ff;
  font-size: 0.52rem;
  font-weight: 600;
  letter-spacing: 0.26em;
  margin-top: 4px;
  opacity: 0.85;
}

.teo-brand--dark .teo-brand__name {
  color: #fff;
}

.teo-brand--light .teo-brand__name {
  color: #0c1a24;
}

.teo-brand--light .teo-brand__sub {
  color: #0b4d8f;
}
</style>
