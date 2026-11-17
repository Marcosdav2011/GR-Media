<template>
  <div class="teo-camera-panel">
    <section
      class="teo-studio-toggle"
      :class="{ 'teo-studio-toggle--active': studioMode }"
    >
      <div class="teo-studio-toggle__body">
        <q-icon name="mmm-video" size="20px" />
        <div>
          <div class="teo-studio-toggle__title">
            {{ t('teo-studio-mode') }}
          </div>
          <div class="teo-camera-card__hint">
            {{ t('teo-studio-mode-hint') }}
          </div>
        </div>
      </div>
      <q-toggle v-model="studioMode" color="primary" />
    </section>

    <div
      class="teo-camera-panel__grid"
      :class="{ 'teo-camera-panel__grid--studio': studioMode }"
    >
      <section class="teo-camera-card teo-camera-card--preview">
        <div class="teo-camera-card__head">
          <div>
            <div class="teo-camera-card__title">
              {{
                studioMode ? t('teo-preview-monitor') : t('teo-camera-preview')
              }}
            </div>
            <div class="teo-camera-card__hint">{{ previewHint }}</div>
          </div>
          <span
            :class="[
              'teo-camera-pill',
              { 'teo-camera-pill--live': previewIsLive },
            ]"
          >
            <span class="teo-camera-pill__dot" />
            {{ previewBadge }}
          </span>
        </div>

        <div
          class="teo-camera-preview"
          :class="{
            'is-panning': isPanning,
            'teo-camera-preview--pannable': canPan,
          }"
          @pointercancel="endPan"
          @pointerdown="startPan"
          @pointermove="movePan"
          @pointerup="endPan"
        >
          <video
            v-show="studioPreviewKind === 'camera'"
            ref="previewVideo"
            autoplay
            class="teo-camera-preview__video"
            muted
            playsinline
            :style="previewVideoStyle"
          />
          <video
            v-show="studioPreviewKind === 'capture'"
            ref="capturePreviewVideo"
            autoplay
            class="teo-camera-preview__video"
            muted
            playsinline
          />
          <img
            v-if="
              studioPreviewKind === 'media' &&
              mediaPreviewIsImage &&
              mediaPreviewUrl
            "
            alt=""
            class="teo-camera-preview__media"
            :src="mediaPreviewUrl"
          />
          <video
            v-else-if="
              studioPreviewKind === 'media' &&
              mediaPreviewIsVideo &&
              mediaPreviewUrl
            "
            :key="mediaPreviewUrl"
            ref="mediaPreviewVideo"
            autoplay
            class="teo-camera-preview__media"
            loop
            muted
            playsinline
            :src="mediaPreviewUrl"
            @loadedmetadata="onMediaPreviewMetadata"
            @timeupdate="onMediaPreviewTimeUpdate"
          />
          <div v-if="!previewHasSource" class="teo-camera-preview__placeholder">
            <q-icon :name="previewPlaceholderIcon" size="2rem" />
            <div class="text-caption">{{ previewPlaceholderText }}</div>
          </div>
        </div>

        <div v-if="previewRemaining" class="teo-camera-preview__time">
          {{ t('teo-time-left', { time: previewRemaining }) }}
        </div>

        <div v-if="studioPreviewKind === 'camera'" class="teo-framing">
          <div class="teo-framing__head">
            <div class="teo-framing__label">{{ t('teo-camera-zoom') }}</div>
            <span class="teo-framing__value">{{ zoomLabel }}</span>
            <q-btn
              :aria-label="t('teo-camera-framing-reset')"
              :disable="framingIsIdentity"
              flat
              icon="mmm-reset"
              round
              size="sm"
              @click="resetFraming"
            >
              <q-tooltip :delay="500">
                {{ t('teo-camera-framing-reset') }}
              </q-tooltip>
            </q-btn>
          </div>
          <q-slider
            v-model="zoom"
            dense
            :max="TEO_CAMERA_MAX_ZOOM"
            :min="1"
            :step="0.05"
          />
          <div class="teo-camera-card__hint">
            {{ t('teo-camera-framing-hint') }}
          </div>
        </div>

        <div
          v-if="studioMode && studioPreviewKind !== 'camera'"
          class="teo-studio-buttons"
        >
          <q-btn
            icon="mmm-video"
            :label="t('teo-camera-load-preview')"
            no-caps
            outline
            @click="loadCameraPreview"
          />
        </div>
      </section>

      <section
        v-if="studioMode"
        class="teo-camera-card teo-camera-card--program"
        :class="{ 'teo-camera-card--program-live': programIsLive }"
      >
        <div class="teo-camera-card__head">
          <div>
            <div class="teo-camera-card__title">
              {{ t('teo-program-monitor') }}
            </div>
            <div class="teo-camera-card__hint">{{ programHint }}</div>
          </div>
          <span
            class="teo-camera-pill"
            :class="{ 'teo-camera-pill--live': programIsLive }"
          >
            <span class="teo-camera-pill__dot" />
            {{ programIsLive ? t('teo-program-live') : t('teo-program-off') }}
          </span>
        </div>
        <div
          class="teo-program-screen"
          :class="{ 'teo-program-screen--live': programIsLive }"
        >
          <q-icon :name="programIcon" size="2rem" />
          <div v-if="programIsLive" class="teo-program-screen__title">
            {{ programLabel }}
          </div>
          <div class="teo-program-screen__screen">
            {{ programScreenLabel }}
          </div>
          <div v-if="programRemaining" class="teo-program-screen__time">
            {{ t('teo-time-left', { time: programRemaining }) }}
          </div>
          <div v-if="!programIsLive" class="text-caption">
            {{ t('teo-program-empty') }}
          </div>
        </div>
        <div class="teo-studio-buttons">
          <q-btn
            color="positive"
            :disable="!canGoOnAir"
            icon="mmm-play"
            :label="t('teo-go-on-air')"
            no-caps
            unelevated
            @click="goOnAir"
          />
          <q-btn
            color="negative"
            :disable="!programIsLive"
            icon="mmm-stop"
            :label="t('teo-cut-program')"
            no-caps
            outline
            @click="cutProgram"
          />
        </div>
        <div class="teo-transition">
          <q-select
            v-model="transitionType"
            dense
            emit-value
            :label="t('teo-transition')"
            map-options
            option-label="label"
            option-value="value"
            :options="transitionTypeOptions"
            outlined
          />
          <q-select
            v-if="transitionType !== 'cut'"
            v-model="transitionMs"
            dense
            emit-value
            :label="t('teo-transition-duration')"
            map-options
            option-label="label"
            option-value="value"
            :options="transitionDurationOptions"
            outlined
          />
        </div>
        <div class="teo-camera-card__hint">
          {{ t('teo-studio-controls-hint') }}
        </div>
        <div class="teo-camera-card__hint">
          {{ t('teo-studio-shortcuts-hint') }}
        </div>
      </section>

      <section class="teo-camera-card teo-camera-card--camera">
        <div class="teo-camera-card__head">
          <div class="teo-camera-card__title">{{ t('teo-camera') }}</div>
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
          :label="t('teo-detect-cameras')"
          :loading="detecting"
          no-caps
          outline
          @click="detectCameras"
        />
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
        <div v-if="!cameraOptions.length" class="teo-camera-card__hint">
          {{ t('teo-no-cameras-found') }}
        </div>
      </section>
    </div>

    <div class="teo-camera-panel__row">
      <section class="teo-camera-card teo-camera-card--screen">
        <div class="teo-camera-card__head">
          <div class="teo-camera-card__title">
            {{ t('teo-camera-screen') }}
          </div>
        </div>
        <template v-if="hasOutputScreen">
          <q-select
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
          <q-btn
            class="full-width"
            :disable="!canIdentify"
            icon="mmm-eye"
            :label="t('teo-identify-screen')"
            no-caps
            outline
            @click="identifySelectedScreen"
          />
          <div v-if="hasAuxiliaryScreen" class="teo-camera-aux">
            <q-icon name="mmm-fullscreen" size="16px" />
            <span>
              {{ t('teo-auxiliary-output') }} ·
              {{ auxiliaryScreenLabel }}
            </span>
          </div>
          <div v-if="hasAuxiliaryScreen" class="teo-camera-card__hint">
            {{ t('teo-auxiliary-output-hint') }}
          </div>
        </template>
        <div v-else class="teo-camera-card__hint">
          {{ t('teo-no-output-screen') }}
        </div>
      </section>

      <section class="teo-camera-card teo-camera-card--capture">
        <div class="teo-camera-card__head">
          <div class="teo-camera-card__title">
            {{ t('teo-capture-windows') }}
          </div>
          <q-btn
            :aria-label="t('teo-capture-refresh')"
            dense
            flat
            icon="mmm-refresh"
            :loading="loadingCaptureSources"
            round
            size="sm"
            @click="loadCaptureSources"
          >
            <q-tooltip :delay="500">{{ t('teo-capture-refresh') }}</q-tooltip>
          </q-btn>
        </div>
        <template v-if="hasOutputScreen">
          <q-select
            v-model="selectedCaptureSourceId"
            dense
            emit-value
            :label="t('teo-capture-source')"
            map-options
            option-label="label"
            option-value="value"
            :options="captureSourceOptions"
            outlined
          />
          <q-select
            v-model="selectedCaptureScreenIndex"
            dense
            emit-value
            :label="t('teo-capture-screen')"
            map-options
            option-label="label"
            option-value="value"
            :options="screenOptions"
            outlined
          />
          <div
            v-if="!captureSourceOptions.length"
            class="teo-camera-card__hint"
          >
            {{ t('teo-capture-empty') }}
          </div>
          <div v-if="captureSourceIsOutputScreen" class="teo-camera-alert">
            <q-icon name="warning" size="18px" />
            <span>{{ t('teo-capture-mirror-hint') }}</span>
          </div>
          <div v-if="teoCapture.activeSourceId" class="teo-camera-aux">
            <q-icon name="mmm-media-display-active" size="16px" />
            <span>
              {{
                t('teo-capture-active', {
                  source: teoCapture.activeSourceName,
                })
              }}
            </span>
          </div>
          <template v-if="studioMode">
            <q-btn
              v-if="
                !teoCapture.activeSourceId ||
                canLoadCapturePreview ||
                captureInPreview
              "
              class="full-width"
              :disable="!canLoadCapturePreview && !captureInPreview"
              :icon="
                captureInPreview
                  ? 'mmm-media-display-inactive'
                  : 'mmm-media-display-active'
              "
              :label="
                captureInPreview
                  ? t('teo-capture-hide-preview')
                  : t('teo-capture-load-preview')
              "
              no-caps
              outline
              @click="toggleCapturePreview"
            />
            <q-btn
              v-if="teoCapture.activeSourceId"
              class="full-width"
              color="negative"
              icon="mmm-media-display-inactive"
              :label="t('teo-capture-stop')"
              no-caps
              outline
              @click="stopCapture"
            />
          </template>
          <q-btn
            v-else-if="teoCapture.activeSourceId"
            class="full-width"
            color="negative"
            icon="mmm-media-display-inactive"
            :label="t('teo-capture-stop')"
            no-caps
            outline
            @click="stopCapture"
          />
          <q-btn
            v-else
            class="full-width"
            :disable="!canStartCapture"
            icon="mmm-media-display-active"
            :label="t('teo-capture-start')"
            no-caps
            outline
            @click="startCapture"
          />
          <div class="teo-camera-card__hint">
            {{
              studioMode && capturePreviewStream
                ? t('teo-preview-capture-hint')
                : t('teo-capture-hint')
            }}
          </div>
        </template>
        <div v-else class="teo-camera-card__hint">
          {{ t('teo-no-output-screen') }}
        </div>
      </section>

      <section class="teo-camera-card teo-camera-card--scenes">
        <div class="teo-camera-card__head">
          <div class="teo-camera-card__title">
            {{ t('teo-camera-scenes') }}
          </div>
        </div>
        <div v-if="teoCamera.scenes.length" class="teo-scenes">
          <div
            v-for="scene in teoCamera.scenes"
            :key="scene.id"
            class="teo-scene"
            :class="{
              'teo-scene--active': isSceneActive(scene),
              'teo-scene--preview': isSceneInPreview(scene),
            }"
          >
            <q-btn
              class="teo-scene__start"
              :disable="sceneActionDisabled"
              no-caps
              outline
              @click="activateScene(scene)"
            >
              <span class="teo-scene__text">
                <span class="teo-scene__name">{{ scene.name }}</span>
                <span class="teo-scene__meta">
                  {{ scene.cameraLabel }} · {{ layoutLabel(scene.layout) }}
                </span>
              </span>
              <q-icon :name="sceneIcon(scene)" size="18px" />
            </q-btn>
            <q-btn
              :aria-label="t('teo-scene-update')"
              class="teo-scene__update"
              :disable="!selectedCameraId"
              flat
              icon="mmm-refresh"
              round
              @click="updateScene(scene)"
            >
              <q-tooltip :delay="500">{{ t('teo-scene-update') }}</q-tooltip>
            </q-btn>
            <q-btn
              :aria-label="t('teo-scene-delete')"
              class="teo-scene__delete"
              color="negative"
              flat
              icon="mmm-delete"
              round
              @click="removeScene(scene)"
            >
              <q-tooltip :delay="500">{{ t('teo-scene-delete') }}</q-tooltip>
            </q-btn>
          </div>
        </div>
        <div v-else class="teo-camera-card__hint">
          {{ t('teo-scene-empty') }}
        </div>
        <q-input
          v-model="sceneName"
          dense
          :label="t('teo-scene-name')"
          outlined
          @keyup.enter="saveScene"
        />
        <q-btn
          class="full-width"
          :disable="!canSaveScene"
          icon="mmm-check"
          :label="t('teo-scene-save')"
          no-caps
          outline
          @click="saveScene"
        />
        <div class="teo-camera-card__hint">
          {{
            studioMode
              ? t('teo-camera-scenes-hint-studio')
              : t('teo-camera-scenes-hint')
          }}
        </div>
      </section>
    </div>

    <section v-if="studioMode" class="teo-camera-card teo-camera-card--media">
      <div class="teo-camera-card__head">
        <div>
          <div class="teo-camera-card__title">
            {{ t('teo-media-preview') }}
          </div>
          <div class="teo-camera-card__hint">
            {{ t('teo-media-preview-hint') }}
          </div>
        </div>
        <span
          class="teo-camera-pill"
          :class="{ 'teo-camera-pill--live': mediaInPreview }"
        >
          <span class="teo-camera-pill__dot" />
          {{ mediaInPreview ? t('teo-preview-live') : t('teo-preview-off') }}
        </span>
      </div>
      <template v-if="mediaPreviewOptions.length">
        <div class="teo-media-picker">
          <q-btn
            :aria-label="t('teo-media-previous')"
            dense
            flat
            icon="mmm-left"
            round
            @click="previewPreviousMedia"
          />
          <span class="teo-media-picker__count">
            {{ selectedMediaPosition }}
          </span>
          <q-btn
            :aria-label="t('teo-media-next')"
            dense
            flat
            icon="mmm-right"
            round
            @click="previewNextMedia"
          />
        </div>
        <div class="teo-media-queue" role="list">
          <button
            v-for="option in mediaQueue"
            :key="option.value"
            class="teo-media-queue__item"
            :class="{
              'is-live': option.live,
              'is-selected': option.value === mediaPreviewId,
            }"
            role="listitem"
            type="button"
            @click="selectMediaOption(option.value)"
          >
            <span class="teo-media-queue__title">{{ option.label }}</span>
            <span class="teo-media-queue__meta">{{ option.section }}</span>
            <span v-if="option.live" class="teo-media-queue__tag">
              {{ t('teo-media-queue-now') }}
            </span>
            <span v-else-if="option.next" class="teo-media-queue__tag">
              {{ t('teo-media-queue-next') }}
            </span>
          </button>
        </div>
        <div class="teo-studio-buttons">
          <q-btn
            :disable="!canLoadMediaPreview"
            :icon="mediaInPreview ? 'mmm-eye' : 'mmm-media'"
            :label="
              mediaInPreview
                ? t('teo-media-hide-preview')
                : t('teo-media-load-preview')
            "
            no-caps
            outline
            @click="toggleMediaPreview"
          />
        </div>
      </template>
      <div v-else class="teo-camera-card__hint">
        {{ t('teo-media-empty') }}
      </div>
    </section>

    <section v-if="studioMode" class="teo-camera-card teo-camera-card--layers">
      <div class="teo-camera-card__head">
        <div>
          <div class="teo-camera-card__title">{{ t('teo-layers') }}</div>
          <div class="teo-camera-card__hint">{{ t('teo-layers-hint') }}</div>
        </div>
        <q-btn
          :aria-label="t('teo-layers-reset')"
          dense
          flat
          icon="mmm-reset"
          round
          size="sm"
          @click="teoCamera.resetLayers()"
        >
          <q-tooltip :delay="500">{{ t('teo-layers-reset') }}</q-tooltip>
        </q-btn>
      </div>
      <div class="teo-layers">
        <div
          v-for="(layer, index) in orderedLayers"
          :key="layer.id"
          class="teo-layer"
          :class="{ 'teo-layer--hidden': layer.hidden }"
        >
          <q-icon :name="layer.icon" size="18px" />
          <span class="teo-layer__name">{{ layer.label }}</span>
          <q-btn
            :aria-label="t('teo-layer-move-up')"
            dense
            :disable="index === 0"
            flat
            icon="mmm-up"
            round
            size="sm"
            @click="teoCamera.moveLayer(layer.id, 'up')"
          />
          <q-btn
            :aria-label="t('teo-layer-move-down')"
            dense
            :disable="index === orderedLayers.length - 1"
            flat
            icon="mmm-down"
            round
            size="sm"
            @click="teoCamera.moveLayer(layer.id, 'down')"
          />
          <q-btn
            :aria-label="
              layer.hidden ? t('teo-layer-show') : t('teo-layer-hide')
            "
            dense
            flat
            :icon="layer.hidden ? 'mmm-file-hidden' : 'mmm-eye'"
            round
            size="sm"
            @click="teoCamera.setLayerHidden(layer.id)"
          />
        </div>
      </div>
    </section>

    <div class="teo-camera-actions">
      <q-btn
        v-if="!studioMode"
        class="teo-camera-actions__btn"
        color="primary"
        :disable="!canProject"
        icon="mmm-video"
        :label="t('teo-show-camera-on-screen')"
        no-caps
        unelevated
        @click="startProjection"
      />
      <q-btn
        v-if="!studioMode && teoCamera.activeCameraId"
        class="teo-camera-actions__btn"
        color="negative"
        icon="mmm-video-off"
        :label="t('teo-stop-camera')"
        no-caps
        outline
        @click="stopProjection"
      />
      <q-btn
        class="teo-camera-actions__btn"
        :disable="!canCaptureSnapshot"
        icon="mmm-image"
        :label="t('teo-save-snapshot')"
        :loading="savingSnapshot"
        no-caps
        outline
        @click="captureSnapshot"
      />
      <q-btn
        v-if="!cameraOnlyMode"
        class="teo-camera-actions__btn"
        flat
        icon="mmm-media-display-inactive"
        :label="t('show-media-display')"
        no-caps
        @click="showOutput"
      />
    </div>

    <div class="teo-camera-status">
      <div v-if="currentState.mediaIsPlaying" class="text-caption text-warning">
        {{ t('stop-playing-media-first') }}
      </div>
      <div
        v-else-if="teoCamera.activeCameraId"
        class="text-body2 text-positive"
      >
        {{
          t('teo-camera-active', {
            camera: teoCamera.activeCameraLabel,
            screen: activeScreenLabel,
          })
        }}
      </div>
      <div v-if="teoCamera.activeCameraId" class="teo-camera-status__muted">
        {{ t('teo-camera-auto-return') }}
      </div>
      <div class="teo-camera-status__muted">
        {{ t('teo-camera-output-hint') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CaptureSource,
  MediaItem,
  MediaSectionWithConfig,
  TeoCameraLayout,
  TeoCameraScene,
  TeoLayerId,
  TeoTransitionType,
} from 'src/types';

import { useBroadcastChannel, useEventListener } from '@vueuse/core';
import { useTeoCameraLayouts } from 'src/composables/useTeoCameraLayouts';
import { useTeoSceneLauncher } from 'src/composables/useTeoSceneLauncher';
import { useTeoScreens } from 'src/composables/useTeoScreens';
import { errorCatcher } from 'src/helpers/error-catcher';
import { createTemporaryNotification } from 'src/helpers/notifications';
import {
  IDENTITY_TEO_CAMERA_VIEW,
  normalizeTeoCameraView,
  TEO_CAMERA_MAX_ZOOM,
  teoCameraViewTransform,
} from 'src/helpers/teo-camera-view';
import {
  resolveTeoMediaPlaybackUrl,
  startTeoMediaProgram,
  stopTeoMediaProgram,
} from 'src/helpers/teo-media-program';
import {
  postTeoPreview,
  TEO_COMMAND_CHANNEL,
  type TeoStudioCommand,
  type TeoStudioCommandMessage,
} from 'src/helpers/teo-outputs';
import {
  normalizeTeoLayerOrder,
  TEO_TRANSITION_DURATIONS,
} from 'src/helpers/teo-studio-layers';
import { sleep } from 'src/utils/general';
import { isAudio, isImage, isVideo } from 'src/utils/media';
import { formatTime } from 'src/utils/time';
import { useCurrentStateStore } from 'stores/current-state';
import { useTeoCameraStore } from 'stores/teo-camera';
import { useTeoCaptureStore } from 'stores/teo-capture';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';

interface CameraOption {
  deviceId: string;
  label: string;
}

const { t } = useI18n();
const currentState = useCurrentStateStore();
const teoCamera = useTeoCameraStore();
const teoCapture = useTeoCaptureStore();

// Media playback is not part of a camera-only profile, so the control that
// switches the output back to the media display is hidden there.
const cameraOnlyMode = computed(
  () => !!currentState.currentSettings?.cameraOnlyMode,
);

const studioMode = computed({
  get: () => teoCamera.studioMode,
  set: (enabled: boolean) => {
    teoCamera.setStudioMode(enabled);
  },
});

const teoScreens = useTeoScreens();

const {
  activateOutput,
  auxiliaryScreenIndex,
  cameraScreenIndex,
  hasAuxiliaryScreen,
  hasOutputScreen,
  identifyScreen,
  preferredScreenIndex,
  screenLabel,
  screenOptions,
  screens,
  setCameraScreen,
} = teoScreens;

const devices = ref<CameraOption[]>([]);
const detecting = ref(false);
const captureSources = ref<CaptureSource[]>([]);
const loadingCaptureSources = ref(false);
const captureScreenIndex = ref<null | number>(null);
const selectedCaptureSourceId = ref('');
const previewVideo = useTemplateRef<HTMLVideoElement>('previewVideo');
const capturePreviewVideo = useTemplateRef<HTMLVideoElement>(
  'capturePreviewVideo',
);
const mediaPreviewVideo = useTemplateRef<HTMLVideoElement>('mediaPreviewVideo');
const previewStream = shallowRef<MediaStream | null>(null);
const capturePreviewStream = shallowRef<MediaStream | null>(null);
const previewError = ref('');
const capturePreviewError = ref('');
const studioPreviewKind = ref<'camera' | 'capture' | 'media'>('camera');
const mediaPreviewId = ref('');
const mediaPreviewUrl = ref('');

const { data: lastEndTimestamp } = useBroadcastChannel<number, number>({
  name: 'last-end-timestamp',
});
const { data: outputMediaDuration } = useBroadcastChannel<number, number>({
  name: 'media-duration',
});
const { data: outputMediaTime } = useBroadcastChannel<number, number>({
  name: 'current-time',
});
const { data: studioCommand } = useBroadcastChannel<
  TeoStudioCommandMessage,
  TeoStudioCommandMessage
>({
  name: TEO_COMMAND_CHANNEL,
});
const previewDuration = ref(0);
const previewPosition = ref(0);

const previewSceneId = ref<null | string>(null);
const savingSnapshot = ref(false);
const isPanning = ref(false);
let previewToken = 0;
let capturePreviewToken = 0;
let previewRestartTimer: ReturnType<typeof setTimeout> | undefined;
let panStart: null | {
  height: number;
  panX: number;
  panY: number;
  pointerId: number;
  width: number;
  x: number;
  y: number;
} = null;

const activeScreenLabel = computed(() =>
  teoCamera.activeScreenIndex === null
    ? ''
    : screenLabel(teoCamera.activeScreenIndex),
);

const auxiliaryScreenLabel = computed(() =>
  auxiliaryScreenIndex.value === null
    ? ''
    : screenLabel(auxiliaryScreenIndex.value),
);

const activePreviewStream = computed(() => {
  if (studioPreviewKind.value === 'capture') return capturePreviewStream.value;
  if (studioPreviewKind.value === 'camera') return previewStream.value;
  return null;
});

const mediaInPreview = computed(
  () => studioPreviewKind.value === 'media' && !!mediaPreviewUrl.value,
);

const mediaPreviewIsImage = computed(() => isImage(mediaPreviewUrl.value));
const mediaPreviewIsVideo = computed(() => isVideo(mediaPreviewUrl.value));
const mediaPreviewIsAudio = computed(() => isAudio(mediaPreviewUrl.value));

const mediaPreviewKind = computed<'audio' | 'image' | 'video'>(() => {
  if (mediaPreviewIsImage.value) return 'image';
  if (mediaPreviewIsAudio.value) return 'audio';
  return 'video';
});

// A media item has no camera device behind it, so the placeholder must not
// linger over the picture while the file loads.
const previewHasSource = computed(() =>
  studioPreviewKind.value === 'media'
    ? !!mediaPreviewUrl.value && !mediaPreviewIsAudio.value
    : !!activePreviewStream.value,
);

const cameraPreviewIsPaused = computed(
  () =>
    !!teoCamera.activeCameraId &&
    teoCamera.activeCameraId === teoCamera.selectedCameraId,
);

const previewPlaceholderText = computed(() => {
  if (studioPreviewKind.value === 'media') {
    return selectedMediaItem.value?.label ?? t('teo-media-empty');
  }
  if (studioPreviewKind.value === 'capture') {
    if (capturePreviewError.value) return t('teo-camera-preview-unavailable');
    return t('teo-camera-preview-starting');
  }
  if (cameraPreviewIsPaused.value) return t('teo-camera-preview-paused');
  if (previewError.value) return t('teo-camera-preview-unavailable');
  return t('teo-camera-preview-starting');
});

const previewPlaceholderIcon = computed(() => {
  if (studioPreviewKind.value === 'media') return 'mmm-media';
  if (studioPreviewKind.value === 'capture')
    return 'mmm-media-display-inactive';
  return cameraPreviewIsPaused.value ? 'mmm-video' : 'mmm-video-off';
});

const cameraOptions = computed(() =>
  devices.value.map((device) => ({
    deviceId: device.deviceId,
    label: device.label,
  })),
);

const captureSourceOptions = computed(() =>
  captureSources.value.map((source) => ({
    label: source.name,
    value: source.id,
  })),
);

interface MediaPreviewOption {
  item: MediaItem;
  label: string;
  section: string;
  value: string;
}

// Same naming the section picker uses: a custom or imported section without a
// label is shown as "Imported media".
const mediaSectionLabel = (section: MediaSectionWithConfig) => {
  const config = section.config;
  if (!config) return '';
  const isImported =
    config.uniqueId === 'imported-media' ||
    config.uniqueId?.startsWith('custom-');
  if (!config.label && isImported) return t('imported-media');
  return config.label || t(config.uniqueId || ''); // NOSONAR: '' means not set
};

// The day's media as the meeting page lists it, so the studio previews the
// same items the audience would get from the calendar.
const mediaPreviewOptions = computed<MediaPreviewOption[]>(() => {
  const sections = currentState.selectedDateObject?.mediaSections ?? [];
  return sections.flatMap((section) => {
    const sectionLabel = mediaSectionLabel(section);
    return (section.items ?? [])
      .filter((item) => !item.hidden && !!(item.fileUrl || item.streamUrl))
      .map((item) => ({
        item,
        label: item.title,
        section: sectionLabel,
        value: item.uniqueId,
      }));
  });
});

const selectedMediaItem = computed(() =>
  mediaPreviewOptions.value.find(
    (option) => option.value === mediaPreviewId.value,
  ),
);

const selectedMediaIndex = computed(() =>
  mediaPreviewOptions.value.findIndex(
    (option) => option.value === mediaPreviewId.value,
  ),
);

// The whole meeting order, not just the picked item: the operator needs to see
// what comes next while the current one is on air.
const mediaQueue = computed(() => {
  const liveId = currentState.mediaIsPlaying
    ? currentState.mediaPlaying.uniqueId
    : '';
  return mediaPreviewOptions.value.map((option, index) => ({
    ...option,
    live: option.value === liveId,
    next:
      selectedMediaIndex.value !== -1 && index === selectedMediaIndex.value + 1,
  }));
});

const selectedMediaPosition = computed(() => {
  if (!mediaPreviewOptions.value.length) return '';
  const position =
    selectedMediaIndex.value === -1 ? '–' : selectedMediaIndex.value + 1;
  return `${position} / ${mediaPreviewOptions.value.length}`;
});

const previewRemaining = computed(() => {
  if (studioPreviewKind.value !== 'media' || !mediaPreviewIsVideo.value) {
    return '';
  }
  if (previewDuration.value <= 0) return '';
  return formatTime(Math.max(previewDuration.value - previewPosition.value, 0));
});

// Where the capture goes: the multimedia output unless another screen is
// picked here.
const selectedCaptureScreenIndex = computed<null | number>({
  get: () => captureScreenIndex.value ?? preferredScreenIndex.value,
  set: (index: null | number) => {
    captureScreenIndex.value = index;
  },
});

const canStartCapture = computed(
  () =>
    !!selectedCaptureSourceId.value &&
    selectedCaptureScreenIndex.value !== null &&
    !currentState.mediaIsPlaying,
);

// The output window and its mirror both show the capture, so capturing the
// screen either of them sits on feeds the image back into itself. Those
// screens stay selectable; the panel just warns about the mirror effect.
const captureSourceIsOutputScreen = computed(() => {
  const source = captureSources.value.find(
    (candidate) => candidate.id === selectedCaptureSourceId.value,
  );
  if (!source?.displayId) return false;
  return [selectedCaptureScreenIndex.value, auxiliaryScreenIndex.value].some(
    (index) => {
      const screen = index === null ? undefined : screens.value[index];
      return !!screen && String(screen.id) === source.displayId;
    },
  );
});

const selectedCameraId = computed({
  get: () => teoCamera.selectedCameraId ?? '',
  set: (deviceId: string) => {
    previewSceneId.value = null;
    teoCamera.selectedCameraId = deviceId || null;
    const option = cameraOptions.value.find(
      (camera) => camera.deviceId === deviceId,
    );
    teoCamera.selectedCameraLabel = option?.label ?? '';
  },
});

const selectedCameraLabel = computed(
  () =>
    cameraOptions.value.find(
      (camera) => camera.deviceId === teoCamera.selectedCameraId,
    )?.label ?? teoCamera.selectedCameraLabel,
);

const { layoutLabel, layoutOptions } = useTeoCameraLayouts();

const selectedLayout = computed<TeoCameraLayout>({
  get: () => teoCamera.selectedLayout,
  set: (layout) => {
    previewSceneId.value = null;
    teoCamera.setSelectedLayout(layout);
  },
});

const transitionType = computed<TeoTransitionType>({
  get: () => teoCamera.transitionType,
  set: (type) => teoCamera.setTransition(type),
});

const transitionMs = computed<number>({
  get: () => teoCamera.transitionMs,
  set: (ms) => teoCamera.setTransition(teoCamera.transitionType, ms),
});

const transitionTypeOptions = computed(() => [
  { label: t('teo-transition-cut'), value: 'cut' },
  { label: t('teo-transition-fade'), value: 'fade' },
  { label: t('teo-transition-slide'), value: 'slide' },
]);

const transitionDurationOptions = computed(() =>
  TEO_TRANSITION_DURATIONS.map((ms) => ({
    label: `${(ms / 1000).toFixed(1)} s`,
    value: ms,
  })),
);

const cameraView = computed(() => normalizeTeoCameraView(teoCamera.view));

const zoom = computed<number>({
  get: () => cameraView.value.zoom,
  set: (value) => teoCamera.setCameraView({ ...cameraView.value, zoom: value }),
});

const zoomLabel = computed(() => `${cameraView.value.zoom}×`);

const previewVideoStyle = computed(() => ({
  transform: teoCameraViewTransform(cameraView.value),
}));

const framingIsIdentity = computed(
  () =>
    cameraView.value.zoom === 1 &&
    cameraView.value.panX === 0 &&
    cameraView.value.panY === 0,
);

const canPan = computed(
  () =>
    studioPreviewKind.value !== 'capture' &&
    !!previewStream.value &&
    cameraView.value.zoom > 1,
);

const startPan = (event: PointerEvent) => {
  if (!canPan.value) return;
  const element = event.currentTarget as HTMLElement;
  if (!element.clientWidth || !element.clientHeight) return;
  panStart = {
    height: element.clientHeight,
    panX: cameraView.value.panX,
    panY: cameraView.value.panY,
    pointerId: event.pointerId,
    width: element.clientWidth,
    x: event.clientX,
    y: event.clientY,
  };
  isPanning.value = true;
  element.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const movePan = (event: PointerEvent) => {
  if (!panStart || event.pointerId !== panStart.pointerId) return;
  teoCamera.setCameraView({
    panX: panStart.panX + ((event.clientX - panStart.x) / panStart.width) * 100,
    panY:
      panStart.panY + ((event.clientY - panStart.y) / panStart.height) * 100,
    zoom: cameraView.value.zoom,
  });
};

const endPan = (event: PointerEvent) => {
  if (!panStart) return;
  const element = event.currentTarget as HTMLElement;
  if (element.hasPointerCapture(panStart.pointerId)) {
    element.releasePointerCapture(panStart.pointerId);
  }
  panStart = null;
  isPanning.value = false;
};

const resetFraming = () => {
  teoCamera.setCameraView(IDENTITY_TEO_CAMERA_VIEW);
};

const sceneName = ref('');

const canSaveScene = computed(
  () => !!selectedCameraId.value && !!sceneName.value.trim(),
);

const { canActivateScene, launchScene, notifyCameraStarted, prepareScene } =
  useTeoSceneLauncher(teoScreens);

const isSceneActive = (scene: TeoCameraScene) =>
  !!teoCamera.activeCameraId && teoCamera.activeSceneId === scene.id;

const isSceneInPreview = (scene: TeoCameraScene) =>
  studioMode.value && previewSceneId.value === scene.id;

const sceneActionDisabled = computed(() =>
  studioMode.value ? currentState.mediaIsPlaying : !canActivateScene.value,
);

const sceneIcon = (scene: TeoCameraScene) => {
  if (isSceneActive(scene)) return 'mmm-media-display-active';
  if (studioMode.value) return 'mmm-eye';
  return 'mmm-play';
};

const saveScene = () => {
  const scene = teoCamera.addScene(sceneName.value);
  if (!scene) return;
  sceneName.value = '';
  createTemporaryNotification({
    icon: 'mmm-check',
    message: t('teo-scene-saved'),
    type: 'positive',
  });
};

const removeScene = (scene: TeoCameraScene) => {
  teoCamera.removeScene(scene.id);
};

const updateScene = (scene: TeoCameraScene) => {
  if (!teoCamera.updateScene(scene.id)) return;
  createTemporaryNotification({
    icon: 'mmm-refresh',
    message: t('teo-scene-updated'),
    type: 'positive',
  });
};

const activateScene = async (scene: TeoCameraScene) => {
  if (studioMode.value) {
    const camera = await prepareScene(scene);
    if (!camera) return;

    studioPreviewKind.value = 'camera';
    previewSceneId.value = scene.id;
    stopCapturePreview();
    stopMediaPreview();
    stopPreview();
    void startPreview();
    createTemporaryNotification({
      icon: 'mmm-eye',
      message: t('teo-scene-loaded-preview'),
      type: 'positive',
    });
    return;
  }

  teoCapture.stopCapture();
  // The output window cannot open a camera the preview is still holding.
  stopPreview();
  if (!(await launchScene(scene))) schedulePreviewRestart();
};

const previewIsLive = computed(
  () =>
    !!activePreviewStream.value ||
    mediaInPreview.value ||
    (!studioMode.value && !!teoCamera.activeCameraId),
);

const previewBadge = computed(() => {
  if (!studioMode.value && teoCamera.activeCameraId) {
    return t('teo-camera-on-screen');
  }
  return activePreviewStream.value || mediaInPreview.value
    ? t('teo-preview-live')
    : t('teo-preview-off');
});

const selectedCaptureSource = computed(() =>
  captureSources.value.find(
    (candidate) => candidate.id === selectedCaptureSourceId.value,
  ),
);

/**
 * Publishes what the preview is showing so the fullscreen multiview can show
 * it too. The camera device belongs to a single window, so the multiview only
 * receives this while it is open.
 */
const publishPreviewSource = () => {
  if (studioPreviewKind.value === 'media') {
    if (selectedMediaItem.value && mediaPreviewUrl.value) {
      postTeoPreview({
        kind: 'media',
        label: selectedMediaItem.value.label,
        mediaKind: mediaPreviewKind.value,
        sourceId: selectedMediaItem.value.value,
        url: mediaPreviewUrl.value,
      });
      return;
    }
    postTeoPreview({ kind: 'none', label: '', sourceId: '' });
    return;
  }

  if (studioPreviewKind.value === 'capture' && selectedCaptureSourceId.value) {
    postTeoPreview({
      kind: 'capture',
      label: selectedCaptureSource.value?.name ?? '',
      sourceId: selectedCaptureSourceId.value,
    });
    return;
  }

  if (selectedCameraId.value) {
    postTeoPreview({
      kind: 'camera',
      label: selectedCameraLabel.value,
      sourceId: selectedCameraId.value,
    });
    return;
  }

  postTeoPreview({ kind: 'none', label: '', sourceId: '' });
};

/** Asks the multiview to let go of the camera before it goes on air. */
const releaseMultiviewPreview = async () => {
  if (!teoCamera.multiviewOpen) return;
  postTeoPreview({ kind: 'none', label: '', sourceId: '' });
  await sleep(400);
};

const previewHint = computed(() => {
  if (studioPreviewKind.value === 'media') {
    const item = selectedMediaItem.value;
    return item ? `${item.label} · ${item.section}` : t('teo-media-empty');
  }
  if (studioPreviewKind.value === 'capture') {
    if (capturePreviewError.value) return t('teo-camera-preview-unavailable');
    return selectedCaptureSource.value?.name ?? t('teo-preview-capture-hint');
  }
  if (cameraPreviewIsPaused.value) return t('teo-camera-preview-paused');
  if (previewError.value) return t('teo-camera-preview-unavailable');
  if (!selectedCameraId.value) return t('teo-no-cameras-found');
  return selectedCameraLabel.value || t('teo-camera-preview');
});

const programIsMedia = computed(() => currentState.mediaIsPlaying);

// The output window reports its position and duration; only videos and songs
// have a running clock, so an image never shows a stale time.
const programRemaining = computed(() => {
  const url = currentState.mediaPlaying.url;
  if (!programIsMedia.value || (!isVideo(url) && !isAudio(url))) return '';
  const duration = outputMediaDuration.value ?? 0;
  if (duration <= 0) return '';
  const position = outputMediaTime.value ?? 0;
  return formatTime(Math.max(duration - position, 0));
});

const programIsLive = computed(
  () =>
    programIsMedia.value ||
    !!teoCamera.activeCameraId ||
    !!teoCapture.activeSourceId,
);

const programIsCapture = computed(() => !!teoCapture.activeSourceId);

const programMediaTitle = computed(
  () =>
    mediaPreviewOptions.value.find(
      (option) => option.value === currentState.mediaPlaying.uniqueId,
    )?.label ?? t('teo-layer-media'),
);

const programIcon = computed(() => {
  if (programIsMedia.value) return 'mmm-media';
  if (programIsCapture.value) return 'mmm-media-display-active';
  return teoCamera.activeCameraId ? 'mmm-video' : 'mmm-media-display-inactive';
});

const programLabel = computed(() => {
  if (programIsMedia.value) return programMediaTitle.value;
  if (programIsCapture.value) return teoCapture.activeSourceName;
  return teoCamera.activeCameraLabel;
});

const programScreenIndex = computed(() => {
  if (programIsMedia.value) return preferredScreenIndex.value;
  if (programIsCapture.value) return teoCapture.activeScreenIndex;
  return teoCamera.activeScreenIndex;
});

const programScreenLabel = computed(() =>
  programScreenIndex.value === null
    ? ''
    : screenLabel(programScreenIndex.value),
);

const programHint = computed(() => {
  if (programIsMedia.value) {
    return t('teo-media-active', { media: programMediaTitle.value });
  }
  if (programIsCapture.value) {
    return t('teo-capture-active', { source: teoCapture.activeSourceName });
  }
  if (teoCamera.activeCameraId) {
    return t('teo-camera-active', {
      camera: teoCamera.activeCameraLabel,
      screen: activeScreenLabel.value,
    });
  }
  return t('teo-program-empty');
});

const canLoadMediaPreview = computed(() => !!selectedMediaItem.value);

const mediaIsProgram = computed(
  () =>
    currentState.mediaIsPlaying &&
    currentState.mediaPlaying.uniqueId === selectedMediaItem.value?.value,
);

// Taking the item that is already on air would restart it from the beginning;
// another item can replace it while it plays, like changing the live source.
const canTakeMedia = computed(
  () =>
    !!mediaPreviewUrl.value &&
    !!selectedMediaItem.value &&
    !mediaIsProgram.value,
);

const canGoOnAir = computed(() => {
  if (studioPreviewKind.value === 'media') return canTakeMedia.value;
  if (currentState.mediaIsPlaying) return false;
  if (studioPreviewKind.value === 'capture') {
    return (
      !!selectedCaptureSourceId.value &&
      selectedCaptureScreenIndex.value !== null
    );
  }
  return !!selectedCameraId.value && cameraScreenIndex.value !== null;
});

const LAYER_ICONS: Record<TeoLayerId, string> = {
  camera: 'mmm-video',
  capture: 'mmm-window',
  media: 'mmm-media',
  yeartext: 'mmm-yeartext',
};

const layerLabel = (id: TeoLayerId) => {
  switch (id) {
    case 'camera':
      return t('teo-layer-camera');
    case 'capture':
      return t('teo-layer-capture');
    case 'media':
      return t('teo-layer-media');
    default:
      return t('teo-layer-yeartext');
  }
};

const orderedLayers = computed(() =>
  normalizeTeoLayerOrder(teoCamera.layerOrder).map((id) => ({
    hidden: teoCamera.hiddenLayers.includes(id),
    icon: LAYER_ICONS[id],
    id,
    label: layerLabel(id),
  })),
);

const selectedScreenIndex = computed({
  get: () => cameraScreenIndex.value,
  set: (index: null | number) => setCameraScreen(index),
});

const canIdentify = computed(
  () =>
    cameraScreenIndex.value !== null &&
    !currentState.mediaIsPlaying &&
    !teoCamera.activeCameraId,
);

const canProject = computed(
  () =>
    !!selectedCameraId.value &&
    cameraScreenIndex.value !== null &&
    !currentState.mediaIsPlaying,
);

const canCaptureSnapshot = computed(
  () => !!activePreviewStream.value && !savingSnapshot.value,
);

const cameraSnapshotFilename = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `teo-camera-${date}-${time}.png`;
};

const stopPreview = () => {
  previewToken++;
  if (previewRestartTimer) {
    clearTimeout(previewRestartTimer);
    previewRestartTimer = undefined;
  }
  previewStream.value?.getTracks().forEach((track) => track.stop());
  previewStream.value = null;
  if (previewVideo.value) {
    previewVideo.value.pause();
    previewVideo.value.srcObject = null;
  }
};

const stopCapturePreview = () => {
  capturePreviewToken++;
  capturePreviewStream.value?.getTracks().forEach((track) => track.stop());
  capturePreviewStream.value = null;
  if (capturePreviewVideo.value) {
    capturePreviewVideo.value.pause();
    capturePreviewVideo.value.srcObject = null;
  }
};

const resetMediaPreviewClock = () => {
  previewDuration.value = 0;
  previewPosition.value = 0;
};

const stopMediaPreview = () => {
  mediaPreviewUrl.value = '';
  resetMediaPreviewClock();
  mediaPreviewVideo.value?.pause();
};

const onMediaPreviewMetadata = () => {
  const video = mediaPreviewVideo.value;
  previewDuration.value =
    video && Number.isFinite(video.duration) ? video.duration : 0;
};

const onMediaPreviewTimeUpdate = () => {
  const video = mediaPreviewVideo.value;
  if (!video) return;
  previewPosition.value = video.currentTime;
  if (!previewDuration.value && Number.isFinite(video.duration)) {
    previewDuration.value = video.duration;
  }
};

const isExpectedMediaError = (error: unknown) => {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'NotAllowedError' ||
    error.name === 'NotFoundError' ||
    error.name === 'NotReadableError'
  );
};

const canRunCameraPreview = () => {
  if (currentState.mediaIsPlaying || !selectedCameraId.value) return false;
  // While the multiview window is open it owns the camera device; the main
  // window gets it back when that window closes.
  if (teoCamera.multiviewOpen) return false;
  if (!studioMode.value) {
    return !teoCamera.activeCameraId && !teoCapture.activeSourceId;
  }
  // In studio mode a camera on air only blocks the preview of that same
  // device; another camera or a window capture can still be previewed.
  return teoCamera.activeCameraId !== selectedCameraId.value;
};

const startPreview = async () => {
  if (!canRunCameraPreview()) return;

  const deviceId = selectedCameraId.value;
  if (!deviceId) return;

  stopPreview();
  const token = ++previewToken;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId },
    });

    if (token !== previewToken || !canRunCameraPreview()) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    previewStream.value = stream;
    previewError.value = '';
    if (previewVideo.value) {
      previewVideo.value.srcObject = stream;
      await previewVideo.value.play();
    }
  } catch (error) {
    if (token !== previewToken) return;
    previewError.value = t('teo-camera-preview-unavailable');
    if (!isExpectedMediaError(error)) {
      errorCatcher(error, {
        contexts: { fn: { name: 'startTeoCameraPreview' } },
      });
    }
  }
};

const startCapturePreview = async () => {
  const sourceId = selectedCaptureSourceId.value;
  if (
    !studioMode.value ||
    !sourceId ||
    currentState.mediaIsPlaying ||
    teoCamera.multiviewOpen ||
    sourceId === teoCapture.activeSourceId
  ) {
    return;
  }

  stopCapturePreview();
  const token = ++capturePreviewToken;
  try {
    // The capture preview uses Electron's legacy desktop-capture constraints,
    // the same way the output window opens a selected window or screen.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
        },
      },
    } as unknown as MediaStreamConstraints);

    if (token !== capturePreviewToken || !studioMode.value) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    capturePreviewStream.value = stream;
    capturePreviewError.value = '';
    if (capturePreviewVideo.value) {
      capturePreviewVideo.value.srcObject = stream;
      await capturePreviewVideo.value.play();
    }
  } catch (error) {
    if (token !== capturePreviewToken) return;
    capturePreviewError.value = t('teo-capture-preview-unavailable');
    if (!isExpectedMediaError(error)) {
      errorCatcher(error, {
        contexts: { fn: { name: 'startTeoCapturePreview' } },
      });
    }
  }
};

const restartActivePreview = () => {
  if (studioMode.value && studioPreviewKind.value === 'capture') {
    return startCapturePreview();
  }
  // A media preview owns no device, so there is nothing to reopen.
  if (studioMode.value && studioPreviewKind.value === 'media') return;
  return startPreview();
};

const schedulePreviewRestart = () => {
  if (previewRestartTimer) clearTimeout(previewRestartTimer);
  // Give the output window a moment to release the camera device.
  previewRestartTimer = setTimeout(() => {
    previewRestartTimer = undefined;
    void restartActivePreview();
  }, 500);
};

const captureSnapshot = async () => {
  const video =
    studioPreviewKind.value === 'capture'
      ? capturePreviewVideo.value
      : previewVideo.value;
  if (!activePreviewStream.value || !video?.videoWidth || !video.videoHeight) {
    createTemporaryNotification({
      icon: 'mmm-video-off',
      message: t('teo-snapshot-no-preview'),
      type: 'warning',
    });
    return;
  }

  savingSnapshot.value = true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (!blob) {
      createTemporaryNotification({
        icon: 'mmm-image-broken',
        message: t('teo-snapshot-failed'),
        type: 'negative',
      });
      return;
    }

    const result = await globalThis.electronApi.saveFileDialog(
      cameraSnapshotFilename(),
      'png',
    );
    if (result?.canceled || !result?.filePath) return;

    const filePath = result.filePath.toLowerCase().endsWith('.png')
      ? result.filePath
      : `${result.filePath}.png`;
    await globalThis.electronApi.fs.writeFile(
      filePath,
      new Uint8Array(await blob.arrayBuffer()),
    );

    createTemporaryNotification({
      caption: filePath,
      icon: 'mmm-image',
      message: t('teo-snapshot-saved'),
      type: 'positive',
    });
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'captureTeoCameraSnapshot' } },
    });
    createTemporaryNotification({
      icon: 'mmm-image-broken',
      message: t('teo-snapshot-failed'),
      type: 'negative',
    });
  } finally {
    savingSnapshot.value = false;
  }
};

const refreshDevices = async () => {
  try {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = allDevices.filter(
      (device) => device.kind === 'videoinput',
    );

    devices.value = videoInputs.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${t('teo-camera')} ${index + 1}`,
    }));

    const selected = devices.value.find(
      (device) => device.deviceId === teoCamera.selectedCameraId,
    );
    const fallback = devices.value[0];
    const next = selected ?? fallback;

    teoCamera.selectedCameraId = next?.deviceId ?? null;
    teoCamera.selectedCameraLabel = next?.label ?? '';
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'refreshTeoCameras' } },
    });
  }
};

const detectCameras = async () => {
  // Release the preview first so the probe can open the camera.
  studioPreviewKind.value = 'camera';
  previewSceneId.value = null;
  stopCapturePreview();
  stopPreview();
  await releaseMultiviewPreview();
  detecting.value = true;
  try {
    // Requesting the camera once both unlocks friendly device labels and
    // triggers the OS permission prompt. The stream is stopped immediately;
    // the selected camera is only opened again by the media output window.
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    await refreshDevices();
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'detectTeoCameras' } },
    });
    createTemporaryNotification({
      caption: t('camera-access-required-explain'),
      icon: 'mmm-video-off',
      message: t('camera-access-required'),
      type: 'negative',
    });
  } finally {
    detecting.value = false;
    if (!teoCamera.activeCameraId) schedulePreviewRestart();
    if (teoCamera.multiviewOpen) publishPreviewSource();
  }
};

const identifySelectedScreen = () => {
  const index = cameraScreenIndex.value;
  if (index === null) return;
  identifyScreen(index, { persist: false });
};

const loadCaptureSources = async () => {
  if (loadingCaptureSources.value) return;
  loadingCaptureSources.value = true;
  try {
    captureSources.value = await globalThis.electronApi.getCaptureSources();
    const stillAvailable = captureSourceOptions.value.some(
      (source) => source.value === selectedCaptureSourceId.value,
    );
    if (!stillAvailable) {
      selectedCaptureSourceId.value =
        captureSourceOptions.value[0]?.value ?? '';
    }
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'loadCaptureSources' } },
    });
  } finally {
    loadingCaptureSources.value = false;
  }
};

const startCapture = async () => {
  const source = captureSources.value.find(
    (candidate) => candidate.id === selectedCaptureSourceId.value,
  );
  const screenIndex = selectedCaptureScreenIndex.value;
  if (!source || screenIndex === null) return;

  stopPreview();
  await releaseMultiviewPreview();
  if (!teoCapture.startCapture(source, screenIndex)) {
    schedulePreviewRestart();
    createTemporaryNotification({
      caption: t('stop-playing-media-first-explain'),
      icon: 'mmm-media',
      message: t('stop-playing-media-first'),
      type: 'warning',
    });
    return;
  }

  createTemporaryNotification({
    icon: 'mmm-media-display-active',
    message: t('teo-capture-started'),
    type: 'positive',
  });
};

const stopCapture = () => {
  teoCapture.stopCapture();
  if (teoCamera.multiviewOpen) publishPreviewSource();
};

const captureInPreview = computed(() => studioPreviewKind.value === 'capture');

const canLoadCapturePreview = computed(
  () =>
    studioMode.value &&
    !!selectedCaptureSourceId.value &&
    !teoCamera.multiviewOpen &&
    !currentState.mediaIsPlaying &&
    selectedCaptureSourceId.value !== teoCapture.activeSourceId,
);

const toggleCapturePreview = () => {
  if (studioPreviewKind.value === 'capture') {
    studioPreviewKind.value = 'camera';
    previewSceneId.value = null;
    stopCapturePreview();
    void startPreview();
    return;
  }

  studioPreviewKind.value = 'capture';
  previewSceneId.value = null;
  stopPreview();
  stopMediaPreview();
  void startCapturePreview();
};

/**
 * Loads the chosen item into the preview without starting it on the output.
 * The preview reads the file itself, so the audience keeps seeing whatever is
 * on the program until the take.
 */
const loadMediaPreview = async () => {
  const option = selectedMediaItem.value;
  if (!option) return;

  previewSceneId.value = null;
  stopPreview();
  stopCapturePreview();
  studioPreviewKind.value = 'media';
  mediaPreviewUrl.value = '';
  resetMediaPreviewClock();

  const url = await resolveTeoMediaPlaybackUrl(option.item);
  if (
    studioPreviewKind.value !== 'media' ||
    mediaPreviewId.value !== option.value
  ) {
    return;
  }
  mediaPreviewUrl.value = url;
  publishPreviewSource();
};

/**
 * Returns the preview to the camera. The multiview asks for this too, so the
 * operator never has to go back to the main window just to recover it.
 */
const loadCameraPreview = () => {
  previewSceneId.value = null;
  stopCapturePreview();
  stopMediaPreview();
  studioPreviewKind.value = 'camera';
  publishPreviewSource();
  void startPreview();
};

const selectMediaOption = (value: string) => {
  mediaPreviewId.value = value;
  if (studioPreviewKind.value !== 'media') void loadMediaPreview();
};

const toggleMediaPreview = () => {
  if (studioPreviewKind.value === 'media') {
    loadCameraPreview();
    return;
  }
  void loadMediaPreview();
};
const shiftMediaPreview = (step: number) => {
  const options = mediaPreviewOptions.value;
  if (!options.length) return;
  const index = options.findIndex(
    (option) => option.value === mediaPreviewId.value,
  );
  const nextIndex =
    index === -1 ? 0 : (index + step + options.length) % options.length;
  const option = options[nextIndex] ?? options[0];
  if (!option) return;
  mediaPreviewId.value = option.value;
};

const previewPreviousMedia = () => shiftMediaPreview(-1);

const previewNextMedia = () => shiftMediaPreview(1);

const takeMediaOnAir = () => {
  const option = selectedMediaItem.value;
  const url = mediaPreviewUrl.value;
  if (!option || !url || !canTakeMedia.value) return;

  teoCamera.postTakeTransition('media');
  startTeoMediaProgram(option.item, url);
  createTemporaryNotification({
    icon: 'mmm-media',
    message: t('teo-media-sent'),
    type: 'positive',
  });
};

const notifyMediaPlayingWarning = () => {
  createTemporaryNotification({
    caption: t('stop-playing-media-first-explain'),
    icon: 'mmm-media',
    message: t('stop-playing-media-first'),
    type: 'warning',
  });
};

const goOnAir = async () => {
  if (studioPreviewKind.value === 'media') {
    takeMediaOnAir();
    return;
  }

  if (currentState.mediaIsPlaying) {
    notifyMediaPlayingWarning();
    return;
  }

  if (studioPreviewKind.value === 'capture') {
    const source = selectedCaptureSource.value;
    const screenIndex = selectedCaptureScreenIndex.value;
    if (!source || screenIndex === null) return;

    stopCapturePreview();
    stopPreview();
    if (teoCamera.activeCameraId) teoCamera.stopCameraProjection();
    await releaseMultiviewPreview();
    teoCamera.postTakeTransition('capture');
    if (!teoCapture.startCapture(source, screenIndex)) {
      schedulePreviewRestart();
      notifyMediaPlayingWarning();
      return;
    }

    createTemporaryNotification({
      icon: 'mmm-media-display-active',
      message: t('teo-capture-started'),
      type: 'positive',
    });
    return;
  }

  const screenIndex = cameraScreenIndex.value;
  const cameraId = selectedCameraId.value;
  if (!cameraId || screenIndex === null) return;

  if (teoCapture.activeSourceId) teoCapture.stopCapture();
  stopCapturePreview();
  // The output window cannot open a camera the preview is still holding.
  stopPreview();
  await releaseMultiviewPreview();
  teoCamera.postTakeTransition('camera');
  const started = teoCamera.startCameraProjection(
    cameraId,
    selectedCameraLabel.value,
    screenIndex,
    teoCamera.selectedLayout,
    teoCamera.view,
  );

  if (!started) {
    schedulePreviewRestart();
    notifyMediaPlayingWarning();
    return;
  }

  if (previewSceneId.value) teoCamera.activeSceneId = previewSceneId.value;
  notifyCameraStarted(screenIndex);
};

const cutProgram = () => {
  if (programIsMedia.value) {
    stopTeoMediaProgram();
    if (teoCamera.multiviewOpen) publishPreviewSource();
    return;
  }
  if (teoCapture.activeSourceId) teoCapture.stopCapture();
  if (teoCamera.activeCameraId) teoCamera.stopCameraProjection();
  schedulePreviewRestart();
  if (teoCamera.multiviewOpen) publishPreviewSource();
};

const loadCaptureInPreview = () => {
  if (studioPreviewKind.value === 'capture') return;
  if (!canLoadCapturePreview.value) return;
  studioPreviewKind.value = 'capture';
  previewSceneId.value = null;
  stopPreview();
  stopMediaPreview();
  void startCapturePreview();
};

const runStudioCommand = (action: TeoStudioCommand) => {
  if (!studioMode.value) return;
  switch (action) {
    case 'cut':
      cutProgram();
      return;
    case 'preview-camera':
      loadCameraPreview();
      return;
    case 'preview-capture':
      loadCaptureInPreview();
      return;
    case 'preview-next':
      if (studioPreviewKind.value === 'media') previewNextMedia();
      return;
    case 'preview-previous':
      if (studioPreviewKind.value === 'media') previewPreviousMedia();
      return;
    case 'take':
      void goOnAir();
      return;
  }
};

const startProjection = async () => {
  const screenIndex = cameraScreenIndex.value;
  if (!selectedCameraId.value || screenIndex === null) return;

  teoCapture.stopCapture();
  // The output window cannot open a camera the preview is still holding.
  stopPreview();
  await releaseMultiviewPreview();
  const started = teoCamera.startCameraProjection(
    selectedCameraId.value,
    selectedCameraLabel.value,
    screenIndex,
  );

  if (!started) {
    schedulePreviewRestart();
    createTemporaryNotification({
      caption: t('stop-playing-media-first-explain'),
      icon: 'mmm-media',
      message: t('stop-playing-media-first'),
      type: 'warning',
    });
    return;
  }

  notifyCameraStarted(screenIndex);
};

const stopProjection = () => {
  teoCamera.stopCameraProjection();
  if (teoCamera.multiviewOpen) publishPreviewSource();
};

const showOutput = () => {
  teoCamera.stopCameraProjection();
  teoCapture.stopCapture();
  activateOutput();
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('input, textarea, select, [contenteditable="true"]');
};

// vMix-style operation: the operator takes, cuts and steps the preview without
// aiming at a button. Only while studio mode is on, and never while a dialog,
// a menu or a text field is waiting for the keyboard.
const onStudioShortcut = (event: KeyboardEvent) => {
  if (!studioMode.value || isTypingTarget(event.target)) return;
  if (document.querySelector('.q-dialog, .q-menu')) return;

  switch (event.key) {
    case 'ArrowLeft':
      if (studioPreviewKind.value !== 'media') return;
      event.preventDefault();
      previewPreviousMedia();
      return;
    case 'ArrowRight':
      if (studioPreviewKind.value !== 'media') return;
      event.preventDefault();
      previewNextMedia();
      return;
    case 'Delete':
      event.preventDefault();
      cutProgram();
      return;
    case 'Enter':
      event.preventDefault();
      void goOnAir();
      return;
    default:
      return;
  }
};

watch(studioMode, (enabled) => {
  previewSceneId.value = null;
  if (enabled) {
    if (!previewStream.value) void startPreview();
    return;
  }

  studioPreviewKind.value = 'camera';
  stopCapturePreview();
  stopMediaPreview();
  if (!previewStream.value) schedulePreviewRestart();
});

watch(mediaPreviewId, () => {
  if (studioPreviewKind.value !== 'media') return;
  void loadMediaPreview();
});

// Keep the picker on a real item when the selected day changes or the list is
// refreshed from the meeting page.
watch(
  mediaPreviewOptions,
  (options) => {
    if (options.some((option) => option.value === mediaPreviewId.value)) {
      return;
    }
    mediaPreviewId.value = options[0]?.value ?? '';
  },
  { immediate: true },
);

watch(studioCommand, (message) => {
  if (!message) return;
  runStudioCommand(message.action);
});

useEventListener(globalThis, 'keydown', onStudioShortcut);

// This page replaces the meeting page, so while it is open nothing else clears
// the program when a taken video ends. Without this the output would keep the
// last frame and the panel would still claim media is on air. The operator's
// preview goes back to the camera so the next take starts from a live shot.
watch(lastEndTimestamp, (timestamp) => {
  if (!timestamp || !studioMode.value || !currentState.mediaIsPlaying) return;
  stopTeoMediaProgram();
  loadCameraPreview();
});

watch(selectedCameraId, () => {
  if (studioMode.value) {
    if (studioPreviewKind.value !== 'camera') return;
    stopPreview();
    void startPreview();
    return;
  }
  if (!teoCamera.activeCameraId) void startPreview();
});

watch(selectedCaptureSourceId, () => {
  if (!studioMode.value || studioPreviewKind.value !== 'capture') return;
  capturePreviewError.value = '';
  stopCapturePreview();
  void startCapturePreview();
});

watch(
  () => teoCamera.activeCameraId,
  (activeCameraId) => {
    if (studioMode.value) {
      if (studioPreviewKind.value !== 'camera') return;
      stopPreview();
      if (activeCameraId) void startPreview();
      else schedulePreviewRestart();
      return;
    }
    if (activeCameraId) {
      stopPreview();
      return;
    }
    schedulePreviewRestart();
  },
);

watch(
  () => currentState.mediaIsPlaying,
  (playing) => {
    if (playing) {
      stopPreview();
      stopCapturePreview();
      return;
    }
    schedulePreviewRestart();
  },
);

// The preview and the capture both need the panel's video resources. In studio
// mode a capture on air only owns the source being captured, so a camera
// preview can stay up; otherwise the camera preview steps aside.
watch(
  () => teoCapture.activeSourceId,
  (sourceId) => {
    if (studioMode.value) {
      if (studioPreviewKind.value === 'capture') {
        stopCapturePreview();
        if (!sourceId) schedulePreviewRestart();
        return;
      }
      if (!sourceId) schedulePreviewRestart();
      return;
    }
    if (sourceId) {
      stopPreview();
      return;
    }
    schedulePreviewRestart();
  },
);

// The multiview shows the same preview on its own window. It owns the camera
// while it is open, so this window stops its streams and publishes the source
// for it; when the window closes the preview comes back here.
watch([studioPreviewKind, selectedCameraId, selectedCaptureSourceId], () => {
  publishPreviewSource();
});

watch(
  () => teoCamera.multiviewOpen,
  (open) => {
    if (open) {
      stopPreview();
      stopCapturePreview();
    }
    publishPreviewSource();
    if (!open) schedulePreviewRestart();
  },
);

onMounted(async () => {
  await refreshDevices();
  void startPreview();
  void loadCaptureSources();
});

onBeforeUnmount(() => {
  stopPreview();
  stopCapturePreview();
});
</script>

<style scoped>
.teo-camera-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.teo-camera-panel__grid {
  align-items: start;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr);
}

.teo-studio-toggle {
  align-items: center;
  background: rgba(12, 52, 60, 0.035);
  border: 1px dashed rgba(12, 52, 60, 0.18);
  border-radius: 16px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 12px 16px;
}

.teo-studio-toggle--active {
  background: linear-gradient(
    120deg,
    rgba(29, 95, 168, 0.12),
    rgba(45, 212, 191, 0.1)
  );
  border-color: rgba(29, 95, 168, 0.35);
}

.teo-studio-toggle__body {
  align-items: center;
  display: flex;
  gap: 12px;
}

.teo-studio-toggle__body > .q-icon {
  color: var(--q-primary);
}

.teo-studio-toggle__title {
  color: #0c1a24;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.teo-camera-panel__grid--studio {
  grid-template-columns:
    minmax(0, 1.5fr) minmax(220px, 0.85fr)
    minmax(240px, 0.9fr);
}

.teo-camera-card--program {
  background: linear-gradient(
    180deg,
    rgba(12, 52, 60, 0.08),
    rgba(12, 52, 60, 0.02)
  );
  border-color: rgba(12, 52, 60, 0.16);
}

.teo-camera-card--program-live {
  border-color: rgba(220, 38, 38, 0.45);
  box-shadow: 0 10px 30px rgba(220, 38, 38, 0.12);
}

.teo-program-screen {
  align-items: center;
  aspect-ratio: 16 / 9;
  background: #05090c;
  border-radius: 12px;
  color: rgb(255 255 255 / 55%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
  text-align: center;
  width: 100%;
}

.teo-program-screen--live {
  background: radial-gradient(
    circle at 50% 40%,
    rgba(220, 38, 38, 0.28),
    #0b0f14 70%
  );
  color: #fff;
}

.teo-program-screen__title {
  font-size: 0.9rem;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teo-program-screen__screen {
  font-size: 0.72rem;
}

.teo-program-screen__time {
  background: rgba(0, 0, 0, 0.35);
  border-radius: 999px;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
}

.teo-studio-buttons {
  display: flex;
  gap: 8px;
}

.teo-studio-buttons .q-btn {
  flex: 1 1 0;
}

.teo-transition {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.teo-layers {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.teo-layer {
  align-items: center;
  background: rgba(12, 52, 60, 0.035);
  border-radius: 10px;
  display: flex;
  gap: 6px;
  padding: 4px 8px;
}

.teo-layer > .q-icon {
  color: var(--q-primary);
}

.teo-layer__name {
  color: #0c1a24;
  flex: 1 1 auto;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teo-layer--hidden {
  opacity: 0.55;
}

.teo-layer--hidden .teo-layer__name {
  text-decoration: line-through;
}

.teo-camera-panel__row {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.teo-camera-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(12, 52, 60, 0.09);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.teo-camera-card__head {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.teo-camera-card__title {
  color: #0c1a24;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.teo-camera-card__hint {
  color: rgba(12, 26, 36, 0.55);
  font-size: 0.76rem;
  line-height: 1.4;
}

.teo-camera-pill {
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

.teo-camera-pill__dot {
  background: #94a3b8;
  border-radius: 50%;
  height: 7px;
  width: 7px;
}

.teo-camera-pill--live {
  background: rgba(45, 212, 191, 0.14);
  color: #0f766e;
}

.teo-camera-pill--live .teo-camera-pill__dot {
  background: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.18);
}

.teo-camera-preview {
  aspect-ratio: 16 / 9;
  background-color: #05090c;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.teo-camera-preview--pannable {
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.teo-camera-preview--pannable.is-panning {
  cursor: grabbing;
}

.teo-camera-preview__video {
  height: 100%;
  object-fit: cover;
  transform-origin: center center;
  width: 100%;
}

/* Media keeps its aspect ratio in the preview, like on the output screen. */
.teo-camera-preview__media {
  height: 100%;
  object-fit: contain;
  width: 100%;
}

.teo-camera-preview__time {
  background: rgba(0, 0, 0, 0.55);
  border-radius: 999px;
  bottom: 10px;
  color: #fff;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  padding: 3px 10px;
  position: absolute;
  right: 10px;
}

.teo-media-picker {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.teo-media-picker__count {
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.teo-media-queue {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}

.teo-media-queue__item {
  align-items: center;
  background: rgba(12, 52, 60, 0.04);
  border: 1px solid rgba(12, 52, 60, 0.12);
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 0 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 6px 10px;
  text-align: left;
}

.teo-media-queue__item:hover {
  background: rgba(29, 95, 168, 0.08);
}

.teo-media-queue__item.is-selected {
  border-color: rgba(29, 95, 168, 0.55);
  background: rgba(29, 95, 168, 0.12);
}

.teo-media-queue__item.is-live {
  box-shadow: inset 3px 0 0 #21ba45;
}

.teo-media-queue__title {
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teo-media-queue__meta {
  color: rgba(12, 52, 60, 0.6);
  font-size: 0.7rem;
  grid-column: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teo-media-queue__tag {
  background: rgba(29, 95, 168, 0.14);
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  grid-column: 2;
  grid-row: 1 / span 2;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  text-transform: uppercase;
}

.teo-media-queue__item.is-live .teo-media-queue__tag {
  background: rgba(33, 186, 69, 0.16);
  color: #0d7a33;
}

.teo-camera-preview__placeholder {
  align-items: center;
  color: rgb(255 255 255 / 72%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: absolute;
  text-align: center;
}

.teo-framing {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.teo-framing__head {
  align-items: center;
  display: flex;
  gap: 8px;
}

.teo-framing__label {
  color: rgba(12, 26, 36, 0.55);
  flex: 1 1 auto;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.teo-framing__value {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.teo-camera-aux {
  align-items: center;
  background: rgba(45, 212, 191, 0.12);
  border-radius: 12px;
  color: #0f766e;
  display: flex;
  font-size: 0.78rem;
  font-weight: 600;
  gap: 8px;
  padding: 8px 10px;
}

.teo-camera-alert {
  align-items: flex-start;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 12px;
  color: #92400e;
  display: flex;
  font-size: 0.78rem;
  gap: 8px;
  line-height: 1.4;
  padding: 8px 10px;
}

.teo-scenes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.teo-scene {
  align-items: center;
  display: flex;
  gap: 6px;
}

.teo-scene__start {
  flex: 1 1 auto;
  min-width: 0;
}

.teo-scene__start :deep(.q-btn__content) {
  flex: 1 1 auto;
  gap: 10px;
  justify-content: space-between;
  min-width: 0;
}

.teo-scene__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-align: left;
}

.teo-scene__name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teo-scene__meta {
  color: rgba(12, 26, 36, 0.55);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teo-scene--preview .teo-scene__start {
  background: rgba(29, 95, 168, 0.08);
  color: var(--q-primary);
}

.teo-scene--active .teo-scene__start {
  background: rgba(45, 212, 191, 0.08);
  color: var(--q-primary);
}

.teo-scene--active .teo-scene__meta {
  color: var(--q-primary);
}

.teo-camera-actions {
  align-items: stretch;
  background: rgba(12, 52, 60, 0.035);
  border: 1px dashed rgba(12, 52, 60, 0.14);
  border-radius: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
}

.teo-camera-actions__btn {
  flex: 1 1 190px;
  min-height: 40px;
}

.teo-camera-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.teo-camera-status__muted {
  color: rgba(12, 26, 36, 0.55);
  font-size: 0.78rem;
  line-height: 1.45;
}

body.body--dark .teo-camera-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

body.body--dark .teo-camera-card__title {
  color: #f4fbfa;
}

body.body--dark .teo-camera-card__hint,
body.body--dark .teo-camera-status__muted,
body.body--dark .teo-framing__label,
body.body--dark .teo-scene__meta {
  color: rgba(226, 240, 238, 0.6);
}

body.body--dark .teo-camera-pill {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(226, 240, 238, 0.72);
}

body.body--dark .teo-camera-pill--live {
  background: rgba(45, 212, 191, 0.16);
  color: #a7f3d0;
}

body.body--dark .teo-camera-aux {
  background: rgba(45, 212, 191, 0.12);
  color: #a7f3d0;
}

body.body--dark .teo-camera-alert {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.4);
  color: #fcd34d;
}

body.body--dark .teo-camera-actions {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(94, 234, 212, 0.18);
}

body.body--dark .teo-studio-toggle {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(94, 234, 212, 0.18);
}

body.body--dark .teo-studio-toggle__title {
  color: #f4fbfa;
}

body.body--dark .teo-camera-card--program {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

body.body--dark .teo-camera-card--program-live {
  border-color: rgba(248, 113, 113, 0.5);
}

body.body--dark .teo-layer {
  background: rgba(255, 255, 255, 0.04);
}

body.body--dark .teo-layer__name {
  color: #f4fbfa;
}

@media (max-width: 1180px) {
  .teo-camera-panel__grid--studio {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .teo-camera-panel__grid--studio .teo-camera-card--camera {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1040px) {
  .teo-camera-panel__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .teo-camera-panel__grid,
  .teo-camera-panel__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .teo-camera-panel__grid--studio .teo-camera-card--camera {
    grid-column: auto;
  }
}
</style>
