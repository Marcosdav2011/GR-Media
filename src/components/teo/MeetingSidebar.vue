<template>
  <aside class="meeting-side">
    <q-tabs
      v-model="tab"
      active-color="primary"
      class="meeting-side__tabs"
      dense
      indicator-color="primary"
      inline-label
      no-caps
    >
      <q-tab
        icon="mmm-calendar-month"
        :label="t('teo-sidebar-meeting')"
        name="meeting"
      />
      <q-tab
        icon="mmm-fullscreen"
        :label="t('teo-sidebar-screens')"
        name="screens"
      />
      <q-tab icon="mmm-video" :label="t('teo-sidebar-camera')" name="camera" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated class="meeting-side__panels">
      <q-tab-panel class="meeting-side__panel" name="meeting">
        <section class="meeting-side__card">
          <div class="meeting-side__title">
            {{ t('teo-sidebar-now-playing') }}
          </div>
          <div v-if="mediaIsPlaying" class="meeting-side__now">
            <q-icon color="primary" name="mmm-media" size="18px" />
            <span class="meeting-side__now-title">
              {{ playingItemLabel || t('teo-sidebar-media') }}
            </span>
          </div>
          <div v-else class="meeting-side__hint">
            {{ t('teo-sidebar-nothing-playing') }}
          </div>
          <q-btn
            v-if="mediaIsPlaying"
            class="full-width"
            color="negative"
            icon="mmm-stop"
            :label="t('teo-sidebar-stop')"
            no-caps
            outline
            @click="emit('stop-media')"
          />
        </section>

        <section class="meeting-side__card">
          <div class="meeting-side__title">
            {{ t('teo-sidebar-sections') }}
          </div>
          <q-list v-if="sections.length" dense>
            <q-item
              v-for="section in sections"
              :key="section.id"
              class="meeting-side__section"
              clickable
              @click="emit('select-section', section.id)"
            >
              <q-item-section avatar>
                <q-icon name="mmm-media" size="18px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ section.label }}</q-item-label>
                <q-item-label caption>
                  {{ t('teo-calendar-items', { count: section.count }) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="meeting-side__hint">
            {{ t('teo-sidebar-no-sections') }}
          </div>
        </section>
      </q-tab-panel>

      <q-tab-panel class="meeting-side__panel" name="screens">
        <q-btn
          class="full-width"
          :color="teoCamera.multiviewOpen ? 'primary' : undefined"
          icon="mmm-fullscreen"
          :label="
            teoCamera.multiviewOpen
              ? t('teo-multiview-close')
              : t('teo-multiview-open')
          "
          no-caps
          outline
          @click="toggleMultiview"
        />
        <div class="meeting-side__hint">
          {{ t('teo-sidebar-screens-hint') }}
        </div>
        <MonitorPreviews
          v-if="tab === 'screens'"
          class="meeting-side__monitors"
        />
      </q-tab-panel>

      <q-tab-panel class="meeting-side__panel" name="camera">
        <section class="meeting-side__card">
          <div class="meeting-side__title">{{ t('teo-sidebar-camera') }}</div>
          <div class="meeting-side__status">
            <span
              class="meeting-side__pill"
              :class="{
                'meeting-side__pill--live': !!teoCamera.activeCameraId,
              }"
            >
              <span class="meeting-side__dot" />
              {{ cameraStatus }}
            </span>
          </div>
          <q-select
            v-model="selectedCameraId"
            dense
            emit-value
            :label="t('select-camera')"
            map-options
            option-label="label"
            option-value="deviceId"
            :options="cameraOptions"
            outlined
          />
          <q-btn
            class="full-width"
            :disable="detecting"
            icon="mmm-refresh"
            :label="t('teo-detect-cameras')"
            :loading="detecting"
            no-caps
            outline
            @click="detectCameras"
          />
          <q-select
            v-if="hasOutputScreen"
            v-model="selectedScreenIndex"
            dense
            emit-value
            :label="t('teo-camera-screen')"
            map-options
            option-label="label"
            option-value="value"
            :options="screenOptions"
            outlined
          />
          <div v-else class="meeting-side__hint">
            {{ t('teo-no-output-screen') }}
          </div>
          <q-select
            v-model="selectedLayout"
            dense
            emit-value
            :label="t('teo-camera-layout')"
            map-options
            option-label="label"
            option-value="value"
            :options="layoutOptions"
            outlined
          />
          <div class="meeting-side__actions">
            <q-btn
              color="positive"
              :disable="!canProject"
              icon="mmm-play"
              :label="t('teo-sidebar-project')"
              no-caps
              unelevated
              @click="projectCamera"
            />
            <q-btn
              color="negative"
              :disable="!teoCamera.activeCameraId"
              icon="mmm-stop"
              :label="t('teo-stop-camera')"
              no-caps
              outline
              @click="stopCamera"
            />
          </div>
          <div v-if="mediaIsPlaying" class="meeting-side__hint">
            {{ t('stop-playing-media-first') }}
          </div>
        </section>

        <section class="meeting-side__card">
          <div class="meeting-side__title">{{ t('teo-camera-zoom') }}</div>
          <q-slider
            dense
            :label-value="zoomLabel"
            :max="TEO_CAMERA_MAX_ZOOM"
            :min="1"
            :model-value="currentView.zoom"
            :step="0.1"
            @update:model-value="setZoom"
          />
          <div class="meeting-side__title">{{ t('teo-sidebar-pan-x') }}</div>
          <q-slider
            dense
            :max="panLimit"
            :min="-panLimit"
            :model-value="currentView.panX"
            :step="1"
            @update:model-value="setPanX"
          />
          <div class="meeting-side__title">{{ t('teo-sidebar-pan-y') }}</div>
          <q-slider
            dense
            :max="panLimit"
            :min="-panLimit"
            :model-value="currentView.panY"
            :step="1"
            @update:model-value="setPanY"
          />
          <q-btn
            class="full-width"
            :disable="framingIsIdentity"
            icon="mmm-reset"
            :label="t('teo-camera-framing-reset')"
            no-caps
            outline
            @click="resetFraming"
          />
        </section>

        <section class="meeting-side__card">
          <div class="meeting-side__title">{{ t('teo-camera-scenes') }}</div>
          <div v-if="teoCamera.scenes.length" class="meeting-side__scenes">
            <q-btn
              v-for="scene in teoCamera.scenes"
              :key="scene.id"
              class="meeting-side__scene"
              :class="{
                'meeting-side__scene--active': isSceneActive(scene),
              }"
              :disable="!canActivateScene"
              no-caps
              outline
              @click="takeScene(scene)"
            >
              <span class="meeting-side__scene-text">
                <span class="meeting-side__scene-name">{{ scene.name }}</span>
                <span class="meeting-side__scene-meta">
                  {{ scene.cameraLabel }} · {{ layoutLabel(scene.layout) }}
                </span>
              </span>
              <q-icon name="mmm-play" size="18px" />
            </q-btn>
          </div>
          <div v-else class="meeting-side__hint">
            {{ t('teo-scene-empty') }}
          </div>
        </section>
      </q-tab-panel>
    </q-tab-panels>
  </aside>
</template>

<script setup lang="ts">
import type { TeoCameraLayout, TeoCameraScene, TeoCameraView } from 'src/types';

import MonitorPreviews from 'components/MonitorPreviews.vue';
import { useTeoCameraLayouts } from 'src/composables/useTeoCameraLayouts';
import { useTeoSceneLauncher } from 'src/composables/useTeoSceneLauncher';
import { useTeoScreens } from 'src/composables/useTeoScreens';
import { errorCatcher } from 'src/helpers/error-catcher';
import {
  IDENTITY_TEO_CAMERA_VIEW,
  TEO_CAMERA_MAX_ZOOM,
} from 'src/helpers/teo-camera-view';
import { useCurrentStateStore } from 'stores/current-state';
import { useTeoCameraStore } from 'stores/teo-camera';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

interface SidebarSection {
  count: number;
  id: string;
  label: string;
}

defineProps<{
  playingItemLabel: string;
  sections: SidebarSection[];
}>();

const emit = defineEmits<{
  (e: 'select-section', id: string): void;
  (e: 'stop-media'): void;
}>();

const { t } = useI18n();
const currentState = useCurrentStateStore();
const teoCamera = useTeoCameraStore();
const { layoutLabel, layoutOptions } = useTeoCameraLayouts();
const teoScreens = useTeoScreens();
const { canActivateScene, launchScene } = useTeoSceneLauncher(teoScreens);
const {
  cameraScreenIndex,
  fetchScreens,
  hasOutputScreen,
  screenLabel,
  screenOptions,
  setCameraScreen,
} = teoScreens;

const tab = ref<'camera' | 'meeting' | 'screens'>('meeting');

const mediaIsPlaying = computed(() => currentState.mediaIsPlaying);

const cameraOptions = ref<{ deviceId: string; label: string }[]>([]);
const detecting = ref(false);

const selectedCameraId = computed({
  get: () => teoCamera.selectedCameraId ?? '',
  set: (deviceId: string) => {
    teoCamera.selectedCameraId = deviceId || null;
    teoCamera.selectedCameraLabel =
      cameraOptions.value.find((camera) => camera.deviceId === deviceId)
        ?.label ?? '';
  },
});

const selectedScreenIndex = computed({
  get: () => cameraScreenIndex.value,
  set: (index: null | number) => {
    if (index !== null) setCameraScreen(index);
  },
});

const selectedLayout = computed({
  get: () => teoCamera.selectedLayout,
  set: (layout: TeoCameraLayout) => teoCamera.setSelectedLayout(layout),
});

const currentView = computed<TeoCameraView>(() => teoCamera.view);
const panLimit = computed(() => 50 * (currentView.value.zoom - 1));
const zoomLabel = computed(() => `${currentView.value.zoom.toFixed(1)}x`);
const framingIsIdentity = computed(
  () =>
    currentView.value.zoom === 1 &&
    currentView.value.panX === 0 &&
    currentView.value.panY === 0,
);

const setZoom = (zoom: null | number) => {
  if (zoom === null) return;
  teoCamera.setCameraView({ ...currentView.value, zoom });
};

const setPanX = (panX: null | number) => {
  if (panX === null) return;
  teoCamera.setCameraView({ ...currentView.value, panX });
};

const setPanY = (panY: null | number) => {
  if (panY === null) return;
  teoCamera.setCameraView({ ...currentView.value, panY });
};

const resetFraming = () => {
  teoCamera.setCameraView(IDENTITY_TEO_CAMERA_VIEW);
};

const cameraStatus = computed(() => {
  if (!teoCamera.activeCameraId) return t('teo-camera-idle');
  const screen =
    teoCamera.activeScreenIndex === null
      ? t('teo-output-screen')
      : screenLabel(teoCamera.activeScreenIndex);
  return t('teo-camera-active', {
    camera: teoCamera.activeCameraLabel,
    screen,
  });
});

const canProject = computed(
  () =>
    !!teoCamera.selectedCameraId &&
    cameraScreenIndex.value !== null &&
    !mediaIsPlaying.value,
);

const refreshCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraOptions.value = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `${t('teo-camera')} ${index + 1}`,
      }));
    if (!teoCamera.selectedCameraId && cameraOptions.value[0]) {
      const first = cameraOptions.value[0];
      teoCamera.selectedCameraId = first.deviceId;
      teoCamera.selectedCameraLabel = first.label;
    }
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'refreshSidebarCameras' } },
    });
  }
};

// Opening a camera once is what lets Chromium report their labels, which is
// what makes the list usable; it is released again straight away.
const detectCameras = async () => {
  detecting.value = true;
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ video: true });
    probe.getTracks().forEach((track) => track.stop());
  } catch (error) {
    errorCatcher(error, { contexts: { fn: { name: 'detectSidebarCameras' } } });
  } finally {
    await refreshCameras();
    detecting.value = false;
  }
};

const projectCamera = () => {
  const deviceId = teoCamera.selectedCameraId;
  const screenIndex = cameraScreenIndex.value;
  if (!deviceId || screenIndex === null) return;
  teoCamera.startCameraProjection(
    deviceId,
    teoCamera.selectedCameraLabel,
    screenIndex,
    teoCamera.selectedLayout,
    teoCamera.view,
  );
};

const stopCamera = () => {
  teoCamera.stopCameraProjection();
};

const toggleMultiview = () => {
  teoCamera.setMultiviewOpen(!teoCamera.multiviewOpen);
};

const isSceneActive = (scene: TeoCameraScene) =>
  !!teoCamera.activeCameraId && teoCamera.activeSceneId === scene.id;

const takeScene = (scene: TeoCameraScene) => {
  void launchScene(scene);
};

const onDevicesChanged = () => {
  void refreshCameras();
};

onMounted(() => {
  void refreshCameras();
  void fetchScreens();
  navigator.mediaDevices?.addEventListener('devicechange', onDevicesChanged);
});

onBeforeUnmount(() => {
  navigator.mediaDevices?.removeEventListener('devicechange', onDevicesChanged);
});
</script>

<style scoped>
.meeting-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 330px;
}

.meeting-side__tabs {
  border-bottom: 1px solid rgba(12, 52, 60, 0.09);
}

.meeting-side__panels {
  background: transparent;
  flex: 1 1 auto;
  min-height: 0;
}

.meeting-side__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.meeting-side__card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(12, 52, 60, 0.09);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.meeting-side__title {
  color: #0c1a24;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meeting-side__hint {
  color: rgba(12, 26, 36, 0.55);
  font-size: 0.76rem;
  line-height: 1.35;
}

.meeting-side__now {
  align-items: center;
  display: flex;
  gap: 8px;
}

.meeting-side__now-title {
  color: #0c1a24;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.meeting-side__status {
  display: flex;
}

.meeting-side__pill {
  align-items: center;
  background: rgba(12, 52, 60, 0.06);
  border-radius: 999px;
  color: rgba(12, 26, 36, 0.6);
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 600;
  gap: 6px;
  letter-spacing: 0.03em;
  padding: 4px 10px;
}

.meeting-side__pill--live {
  background: rgba(45, 212, 191, 0.14);
  color: #0f766e;
}

.meeting-side__dot {
  background: #14b8a6;
  border-radius: 50%;
  height: 7px;
  width: 7px;
}

.meeting-side__actions {
  display: flex;
  gap: 8px;
}

.meeting-side__actions > * {
  flex: 1 1 0;
}

.meeting-side__scenes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meeting-side__scene {
  justify-content: space-between;
  padding: 6px 10px;
  text-align: left;
}

.meeting-side__scene--active {
  border-color: var(--q-primary);
  color: var(--q-primary);
}

.meeting-side__scene-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meeting-side__scene-name {
  font-size: 0.82rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-side__scene-meta {
  color: rgba(12, 26, 36, 0.55);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-side__section :deep(.q-item__label) {
  font-size: 0.82rem;
}

.meeting-side__monitors :deep(.teo-monitors) {
  gap: 10px;
  grid-template-columns: 1fr;
}

body.body--dark .meeting-side__card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

body.body--dark .meeting-side__title,
body.body--dark .meeting-side__now-title {
  color: #f4fbfa;
}

body.body--dark .meeting-side__hint,
body.body--dark .meeting-side__scene-meta {
  color: rgba(226, 240, 238, 0.6);
}

body.body--dark .meeting-side__pill {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(226, 240, 238, 0.72);
}

body.body--dark .meeting-side__pill--live {
  background: rgba(45, 212, 191, 0.16);
  color: #a7f3d0;
}
</style>
