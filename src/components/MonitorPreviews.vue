<template>
  <div class="teo-monitors">
    <article v-for="tile in tiles" :key="tile.role" class="teo-monitor">
      <header class="teo-monitor__head">
        <q-icon :name="tile.icon" size="18px" />
        <span class="teo-monitor__label">{{ tile.label }}</span>
        <span
          class="teo-monitor__screen"
          :class="{ 'teo-monitor__screen--live': tile.live }"
        >
          <span v-if="tile.live" class="teo-monitor__dot" />
          {{ tile.screenLabel }}
        </span>
      </header>
      <div class="teo-monitor__frame">
        <img
          v-if="tile.live && tile.image"
          alt=""
          class="teo-monitor__image"
          :src="tile.image"
        />
        <div v-else class="teo-monitor__empty">
          <q-icon
            :name="
              tile.live ? 'mmm-image-broken' : 'mmm-media-display-inactive'
            "
            size="1.6rem"
          />
          <span>
            {{
              tile.live ? t('teo-monitor-no-frame') : t('teo-monitor-inactive')
            }}
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { MonitorPreview, MonitorPreviewRole } from 'src/types';

import { errorCatcher } from 'src/helpers/error-catcher';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

// A still frame every second is enough to confirm what each screen shows,
// and keeps the capture cost negligible while the page is open.
const PREVIEW_REFRESH_MS = 1000;

const ROLE_ICONS: Record<MonitorPreviewRole, string> = {
  auxiliary: 'mmm-fullscreen',
  main: 'mmm-media-display-active',
  timer: 'mmm-alarm',
  website: 'mmm-window',
};

const { t } = useI18n();
const previews = ref<MonitorPreview[]>([]);
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let refreshing = false;

const roleLabel = (role: MonitorPreviewRole) => {
  switch (role) {
    case 'auxiliary':
      return t('teo-monitor-role-auxiliary');
    case 'timer':
      return t('teo-monitor-role-timer');
    case 'website':
      return t('teo-monitor-role-website');
    default:
      return t('teo-monitor-role-main');
  }
};

const tiles = computed(() =>
  previews.value.map((preview) => ({
    ...preview,
    icon: ROLE_ICONS[preview.role],
    label: roleLabel(preview.role),
    screenLabel:
      preview.displayNumber === null
        ? t('teo-monitor-inactive')
        : t('teo-screen', { number: preview.displayNumber }),
  })),
);

const refresh = async () => {
  if (refreshing || document.hidden) return;
  refreshing = true;
  try {
    previews.value = await globalThis.electronApi.getMonitorPreviews();
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'MonitorPreviews.refresh' } },
    });
  } finally {
    refreshing = false;
  }
};

onMounted(() => {
  void refresh();
  refreshTimer = setInterval(() => void refresh(), PREVIEW_REFRESH_MS);
  document.addEventListener('visibilitychange', refresh);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  document.removeEventListener('visibilitychange', refresh);
});
</script>

<style scoped>
.teo-monitors {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.teo-monitor {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(12, 52, 60, 0.09);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.teo-monitor__head {
  align-items: center;
  display: flex;
  gap: 8px;
}

.teo-monitor__head > .q-icon {
  color: var(--q-primary);
}

.teo-monitor__label {
  color: #0c1a24;
  flex: 1 1 auto;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.teo-monitor__screen {
  align-items: center;
  background: rgba(12, 52, 60, 0.06);
  border-radius: 999px;
  color: rgba(12, 26, 36, 0.6);
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  gap: 6px;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  text-transform: uppercase;
}

.teo-monitor__screen--live {
  background: rgba(45, 212, 191, 0.14);
  color: #0f766e;
}

.teo-monitor__dot {
  background: #14b8a6;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.18);
  height: 7px;
  width: 7px;
}

.teo-monitor__frame {
  align-items: center;
  aspect-ratio: 16 / 9;
  background: #05090c;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  overflow: hidden;
  width: 100%;
}

.teo-monitor__image {
  display: block;
  height: 100%;
  object-fit: contain;
  width: 100%;
}

.teo-monitor__empty {
  align-items: center;
  color: rgb(255 255 255 / 55%);
  display: flex;
  flex-direction: column;
  font-size: 0.76rem;
  gap: 6px;
  padding: 12px;
  text-align: center;
}

body.body--dark .teo-monitor {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

body.body--dark .teo-monitor__label {
  color: #f4fbfa;
}

body.body--dark .teo-monitor__screen {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(226, 240, 238, 0.72);
}

body.body--dark .teo-monitor__screen--live {
  background: rgba(45, 212, 191, 0.16);
  color: #a7f3d0;
}

@media (max-width: 760px) {
  .teo-monitors {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
