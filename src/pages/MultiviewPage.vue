<template>
  <div class="mm">
    <header class="mm__header">
      <div class="mm__brand">
        <q-icon name="mmm-video" size="22px" />
        <span class="mm__brand-name">GR Media</span>
        <span class="mm__badge">{{ t('teo-multiview') }}</span>
      </div>
      <div class="mm__head-right">
        <span class="mm__clock">{{ clock }}</span>
        <q-btn
          :aria-label="t('teo-multiview-close')"
          class="mm__close"
          dense
          flat
          icon="mmm-clear"
          round
          @click="closeMultiview"
        >
          <q-tooltip :delay="500">{{ t('teo-multiview-close') }}</q-tooltip>
        </q-btn>
      </div>
    </header>

    <div class="mm__grid">
      <section class="mm__tile mm__tile--preview">
        <header class="mm__tile-head">
          <span class="mm__tile-label mm__tile-label--preview">
            {{ t('teo-multiview-preview') }}
          </span>
          <span class="mm__tile-meta">{{ previewLabel }}</span>
        </header>
        <div class="mm__frame">
          <img
            v-if="previewKind === 'media' && previewUrl && previewIsImage"
            alt=""
            class="mm__media"
            :src="previewUrl"
          />
          <video
            v-else-if="previewKind === 'media' && previewUrl && previewIsVideo"
            :key="previewUrl"
            ref="mediaPreviewVideo"
            autoplay
            class="mm__media"
            loop
            muted
            playsinline
            :src="previewUrl"
            @loadedmetadata="onMediaPreviewMetadata"
            @timeupdate="onMediaPreviewTimeUpdate"
          />
          <video
            v-show="previewKind !== 'media'"
            ref="previewVideo"
            autoplay
            class="mm__media"
            muted
            playsinline
            :style="previewStyle"
          />
          <div v-if="!previewHasSource" class="mm__empty">
            <q-icon :name="previewIcon" size="2.4rem" />
            <span>{{ previewPlaceholder }}</span>
          </div>
          <span v-if="previewRemaining" class="mm__time">
            {{ t('teo-time-left', { time: previewRemaining }) }}
          </span>
        </div>
        <div class="mm__controls">
          <q-btn
            :aria-label="t('teo-media-previous')"
            dense
            flat
            icon="mmm-left"
            @click="sendCommand('preview-previous')"
          />
          <q-btn
            dense
            flat
            :label="t('teo-layer-camera')"
            no-caps
            @click="sendCommand('preview-camera')"
          />
          <q-btn
            :aria-label="t('teo-media-next')"
            dense
            flat
            icon="mmm-right"
            @click="sendCommand('preview-next')"
          />
          <span class="mm__controls-spacer" />
          <q-btn
            color="positive"
            dense
            :label="t('teo-go-on-air')"
            no-caps
            unelevated
            @click="sendCommand('take')"
          />
          <q-btn
            color="negative"
            dense
            :label="t('teo-cut-program')"
            no-caps
            outline
            @click="sendCommand('cut')"
          />
        </div>
      </section>

      <section
        class="mm__tile mm__tile--program"
        :class="{ 'mm__tile--program-live': program?.live }"
      >
        <header class="mm__tile-head">
          <span class="mm__tile-label mm__tile-label--program">
            {{ t('teo-multiview-program') }}
          </span>
          <span v-if="program?.live" class="mm__live">
            <span class="mm__live-dot" />
            {{ t('teo-program-live') }}
          </span>
          <span v-if="program?.displayNumber" class="mm__tile-meta">
            {{
              t('teo-screen', {
                number: program?.displayNumber,
              })
            }}
          </span>
          <span v-if="programRemaining" class="mm__tile-meta">
            {{ t('teo-time-left', { time: programRemaining }) }}
          </span>
        </header>
        <div class="mm__frame">
          <img
            v-if="program?.live && program.image"
            alt=""
            class="mm__media"
            :src="program.image"
          />
          <div v-else class="mm__empty">
            <q-icon
              :name="
                program?.live
                  ? 'mmm-image-broken'
                  : 'mmm-media-display-inactive'
              "
              size="2.4rem"
            />
            <span>
              {{
                program?.live
                  ? t('teo-monitor-no-frame')
                  : t('teo-monitor-inactive')
              }}
            </span>
          </div>
        </div>
      </section>

      <section class="mm__strip">
        <article
          v-for="preview in secondaryPreviews"
          :key="preview.role"
          class="mm__tile mm__tile--small"
        >
          <header class="mm__tile-head">
            <q-icon :name="preview.icon" size="16px" />
            <span class="mm__tile-label">{{ preview.label }}</span>
            <span
              class="mm__tile-meta"
              :class="{ 'mm__tile-meta--live': preview.live }"
            >
              {{
                preview.displayNumber
                  ? t('teo-screen', { number: preview.displayNumber })
                  : t('teo-monitor-inactive')
              }}
            </span>
          </header>
          <div class="mm__frame mm__frame--small">
            <img
              v-if="preview.live && preview.image"
              alt=""
              class="mm__media"
              :src="preview.image"
            />
            <div v-else class="mm__empty mm__empty--small">
              <q-icon :name="preview.icon" size="1.4rem" />
              <span>
                {{
                  preview.live
                    ? t('teo-monitor-no-frame')
                    : t('teo-monitor-inactive')
                }}
              </span>
            </div>
          </div>
        </article>
      </section>
    </div>

    <footer class="mm__footer">
      <span class="mm__footer-label">{{ t('teo-multiview-sources') }}</span>
      <span
        v-for="layer in layers"
        :key="layer.id"
        class="mm__layer"
        :class="{ 'mm__layer--hidden': layer.hidden }"
      >
        <q-icon :name="layer.icon" size="16px" />
        {{ layer.label }}
      </span>
      <span class="mm__footer-hint">
        {{ t('teo-multiview-controls-hint') }}
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { MonitorPreviewRole, TeoLayerId } from 'src/types';

import { useBroadcastChannel, useEventListener } from '@vueuse/core';
import { useMonitorPreviews } from 'src/composables/useMonitorPreviews';
import { errorCatcher } from 'src/helpers/error-catcher';
import {
  normalizeTeoCameraView,
  teoCameraViewTransform,
} from 'src/helpers/teo-camera-view';
import {
  postTeoStudioCommand,
  readCachedLayerState,
  readCachedPreviewSource,
  TEO_LAYERS_CHANNEL,
  TEO_PREVIEW_CHANNEL,
  type TeoLayerState,
  type TeoPreviewMessage,
  type TeoStudioCommand,
} from 'src/helpers/teo-outputs';
import {
  DEFAULT_TEO_LAYER_ORDER,
  normalizeTeoLayerOrder,
} from 'src/helpers/teo-studio-layers';
import { isAudio, isVideo } from 'src/utils/media';
import { formatTime } from 'src/utils/time';
import { useTeoCameraStore } from 'stores/teo-camera';
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

const ROLE_ICONS: Record<MonitorPreviewRole, string> = {
  auxiliary: 'mmm-fullscreen',
  main: 'mmm-media-display-active',
  timer: 'mmm-alarm',
  website: 'mmm-window',
};

const LAYER_ICONS: Record<TeoLayerId, string> = {
  camera: 'mmm-video',
  capture: 'mmm-window',
  media: 'mmm-media',
  yeartext: 'mmm-yeartext',
};

// The main window releases the camera before the multiview opens its own
// stream and hands it back when it needs it; a short wait covers that handoff.
const PREVIEW_HANDOFF_DELAY_MS = 250;
const PREVIEW_RETRY_DELAY_MS = 800;

const { t } = useI18n();
const teoCamera = useTeoCameraStore();

const { previews } = useMonitorPreviews(500);

const previewVideo = useTemplateRef<HTMLVideoElement>('previewVideo');
const mediaPreviewVideo = useTemplateRef<HTMLVideoElement>('mediaPreviewVideo');
const previewStream = shallowRef<MediaStream | null>(null);
const previewKind = ref<TeoPreviewMessage['kind']>('none');
const previewLabel = ref('');
const previewUrl = ref('');
const previewMediaKind = ref<TeoPreviewMessage['mediaKind']>('video');
const previewError = ref('');
const cachedPreviewSource = ref<null | TeoPreviewMessage>(
  readCachedPreviewSource(),
);
const clock = ref('');
let previewToken = 0;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

const { data: previewMessage } = useBroadcastChannel<
  TeoPreviewMessage,
  TeoPreviewMessage
>({
  name: TEO_PREVIEW_CHANNEL,
});

const { data: outputMediaDuration } = useBroadcastChannel<number, number>({
  name: 'media-duration',
});
const { data: outputMediaTime } = useBroadcastChannel<number, number>({
  name: 'current-time',
});
const { data: mediaPlayingUrl } = useBroadcastChannel<string, string>({
  name: 'media-url',
});

const previewDuration = ref(0);
const previewPosition = ref(0);

const cachedLayerState = ref<null | TeoLayerState>(readCachedLayerState());

const { data: layerState } = useBroadcastChannel<TeoLayerState, TeoLayerState>({
  name: TEO_LAYERS_CHANNEL,
});

const layers = computed(() => {
  const state = layerState.value ?? cachedLayerState.value;
  const order = normalizeTeoLayerOrder(state?.order ?? DEFAULT_TEO_LAYER_ORDER);
  const hidden = state?.hidden ?? [];
  return order.map((id) => ({
    hidden: hidden.includes(id),
    icon: LAYER_ICONS[id],
    id,
    label: layerLabel(id),
  }));
});

const program = computed(
  () => previews.value.find((preview) => preview.role === 'main') ?? null,
);

const secondaryPreviews = computed(() =>
  previews.value
    .filter((preview) => preview.role !== 'main')
    .map((preview) => ({
      ...preview,
      icon: ROLE_ICONS[preview.role],
      label: roleLabel(preview.role),
    })),
);

const previewIsImage = computed(() => previewMediaKind.value === 'image');
const previewIsVideo = computed(() => previewMediaKind.value === 'video');
const previewIsAudio = computed(() => previewMediaKind.value === 'audio');

const previewHasSource = computed(() =>
  previewKind.value === 'media'
    ? !!previewUrl.value && !previewIsAudio.value
    : !!previewStream.value,
);

const previewPlaceholder = computed(() => {
  if (previewKind.value === 'none') return t('teo-multiview-preview');
  if (previewKind.value === 'media') {
    return previewLabel.value || t('teo-multiview-preview-unavailable');
  }
  if (previewError.value) return t('teo-multiview-preview-unavailable');
  return t('teo-camera-preview-starting');
});

const previewIcon = computed(() => {
  if (previewKind.value === 'media') return 'mmm-media';
  return previewKind.value === 'capture'
    ? 'mmm-media-display-inactive'
    : 'mmm-video-off';
});

const previewRemaining = computed(() => {
  if (previewKind.value !== 'media' || !previewIsVideo.value) return '';
  if (previewDuration.value <= 0) return '';
  return formatTime(Math.max(previewDuration.value - previewPosition.value, 0));
});

// The output window reports its position and duration; only videos and songs
// have a running clock, so an image never shows a stale time.
const programRemaining = computed(() => {
  const url = mediaPlayingUrl.value;
  if (!url || (!isVideo(url) && !isAudio(url))) return '';
  const duration = outputMediaDuration.value ?? 0;
  if (duration <= 0) return '';
  const position = outputMediaTime.value ?? 0;
  return formatTime(Math.max(duration - position, 0));
});

function onMediaPreviewMetadata() {
  const video = mediaPreviewVideo.value;
  previewDuration.value =
    video && Number.isFinite(video.duration) ? video.duration : 0;
}

function onMediaPreviewTimeUpdate() {
  const video = mediaPreviewVideo.value;
  if (!video) return;
  previewPosition.value = video.currentTime;
  if (!previewDuration.value && Number.isFinite(video.duration)) {
    previewDuration.value = video.duration;
  }
}

function resetPreviewClock() {
  previewDuration.value = 0;
  previewPosition.value = 0;
}

function sendCommand(action: TeoStudioCommand) {
  postTeoStudioCommand(action);
}

const previewStyle = computed(() =>
  previewKind.value === 'camera'
    ? {
        '--teo-multiview-view': 'cover',
        transform: teoCameraViewTransform(
          normalizeTeoCameraView(teoCamera.view),
        ),
      }
    : {},
);

function applyPreviewSource(message: null | TeoPreviewMessage) {
  cachedPreviewSource.value = message;
  previewLabel.value = message?.label ?? '';
  previewKind.value = message?.kind ?? 'none';
  previewMediaKind.value = message?.mediaKind ?? 'video';
  previewError.value = '';
  stopPreview();

  if (!message || message.kind === 'none') return;

  if (message.kind === 'media') {
    // A media preview is just a file: there is no device to open and no
    // handoff to wait for.
    previewUrl.value = message.url ?? '';
    return;
  }

  // The main window stops its stream right before announcing the handoff, so
  // waiting a moment lets the camera device become free.
  clearPreviewTimer();
  previewTimer = setTimeout(() => {
    previewTimer = undefined;
    void openPreview(message);
  }, PREVIEW_HANDOFF_DELAY_MS);
}

function clearPreviewTimer() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = undefined;
  }
}

function closeMultiview() {
  globalThis.electronApi.toggleMultiviewWindow(false);
}

function isExpectedMediaError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'NotAllowedError' ||
    error.name === 'NotFoundError' ||
    error.name === 'NotReadableError'
  );
}

function layerLabel(id: TeoLayerId) {
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
}

async function openPreview(
  message: TeoPreviewMessage,
  attempt = 0,
): Promise<void> {
  stopPreview();
  if (message.kind === 'none' || message.kind === 'media' || !message.sourceId)
    return;

  const token = previewToken;
  try {
    const constraints = (message.kind === 'capture'
      ? {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: message.sourceId,
            },
          },
        }
      : {
          audio: false,
          video: { deviceId: message.sourceId },
        }) as unknown as MediaStreamConstraints;

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (token !== previewToken) {
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

    if (attempt === 0) {
      previewTimer = setTimeout(() => {
        previewTimer = undefined;
        void openPreview(message, 1);
      }, PREVIEW_RETRY_DELAY_MS);
      return;
    }

    previewError.value = t('teo-multiview-preview-unavailable');
    if (!isExpectedMediaError(error)) {
      errorCatcher(error, {
        contexts: { fn: { name: 'openMultiviewPreview' } },
      });
    }
  }
}

function roleLabel(role: MonitorPreviewRole) {
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
}

function stopPreview() {
  previewToken++;
  clearPreviewTimer();
  previewStream.value?.getTracks().forEach((track) => track.stop());
  previewStream.value = null;
  previewUrl.value = '';
  resetPreviewClock();
  if (previewVideo.value) {
    previewVideo.value.pause();
    previewVideo.value.srcObject = null;
  }
  mediaPreviewVideo.value?.pause();
}

function updateClock() {
  clock.value = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

watch(
  () => previewMessage.value,
  (message) => {
    if (message) applyPreviewSource(message);
  },
);

useEventListener(globalThis, 'keydown', (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      sendCommand('preview-previous');
      return;
    case 'ArrowRight':
      event.preventDefault();
      sendCommand('preview-next');
      return;
    case 'Backspace':
    case 'Delete':
      event.preventDefault();
      sendCommand('cut');
      return;
    case 'Enter':
      event.preventDefault();
      sendCommand('take');
      return;
    case 'Escape':
      event.preventDefault();
      closeMultiview();
      return;
    default:
      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        sendCommand('preview-camera');
      }
  }
});

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  applyPreviewSource(cachedPreviewSource.value);
});

onBeforeUnmount(() => {
  stopPreview();
  if (clockTimer) clearInterval(clockTimer);
});
</script>

<style scoped>
.mm {
  background:
    radial-gradient(circle at 18% 0%, rgba(29, 95, 168, 0.18), transparent 55%),
    #05080b;
  color: #e8f2f1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  width: 100vw;
}

.mm__header {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  padding: 12px 22px;
}

.mm__brand {
  align-items: center;
  display: flex;
  gap: 10px;
}

.mm__brand > .q-icon {
  color: #2dd4bf;
}

.mm__brand-name {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mm__badge {
  background: rgba(45, 212, 191, 0.14);
  border: 1px solid rgba(45, 212, 191, 0.35);
  border-radius: 999px;
  color: #99f6e4;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  padding: 4px 10px;
  text-transform: uppercase;
}

.mm__head-right {
  align-items: center;
  display: flex;
  gap: 14px;
}

.mm__clock {
  color: rgba(232, 242, 241, 0.78);
  font-variant-numeric: tabular-nums;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.mm__close {
  color: rgba(232, 242, 241, 0.72);
}

.mm__grid {
  display: grid;
  flex: 1 1 auto;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1.7fr) minmax(0, 1fr);
  min-height: 0;
  padding: 14px 18px 8px;
}

.mm__tile {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 10px 12px 12px;
}

.mm__tile--preview {
  border-color: rgba(45, 212, 191, 0.28);
}

.mm__tile--program-live {
  border-color: rgba(239, 68, 68, 0.55);
  box-shadow: inset 0 0 42px rgba(239, 68, 68, 0.12);
}

.mm__tile--small {
  padding: 8px 10px 10px;
}

.mm__strip {
  display: grid;
  gap: 12px;
  grid-column: 1 / -1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 0;
}

.mm__tile-head {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  min-width: 0;
}

.mm__tile-head > .q-icon {
  color: rgba(232, 242, 241, 0.6);
}

.mm__tile-label {
  color: rgba(232, 242, 241, 0.9);
  flex: 1 1 auto;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.mm__tile-label--preview {
  color: #99f6e4;
}

.mm__tile-label--program {
  color: #fca5a5;
}

.mm__tile-meta {
  color: rgba(232, 242, 241, 0.5);
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.mm__tile-meta--live {
  color: #5eead4;
}

.mm__live {
  align-items: center;
  background: rgba(239, 68, 68, 0.16);
  border-radius: 999px;
  color: #fecaca;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.64rem;
  font-weight: 800;
  gap: 6px;
  letter-spacing: 0.12em;
  padding: 3px 9px;
  text-transform: uppercase;
}

.mm__live-dot {
  background: #ef4444;
  border-radius: 50%;
  height: 7px;
  width: 7px;
}

.mm__frame {
  align-items: center;
  background: #000;
  border-radius: 10px;
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.mm__time {
  background: rgba(0, 0, 0, 0.55);
  border-radius: 999px;
  bottom: 8px;
  color: #fff;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  padding: 2px 9px;
  position: absolute;
  right: 8px;
}

.mm__controls {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding-top: 6px;
}

.mm__controls-spacer {
  flex: 1 1 auto;
}

.mm__controls .q-btn {
  min-height: 30px;
  padding: 2px 8px;
}

.mm__media {
  height: 100%;
  object-fit: var(--teo-multiview-view, contain);
  transform-origin: center center;
  width: 100%;
}

.mm__empty {
  align-items: center;
  color: rgba(232, 242, 241, 0.45);
  display: flex;
  flex-direction: column;
  font-size: 0.82rem;
  gap: 10px;
  padding: 18px;
  text-align: center;
}

.mm__empty--small {
  font-size: 0.7rem;
  gap: 6px;
  padding: 8px;
}

.mm__footer {
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  padding: 9px 22px;
}

.mm__footer-label {
  color: rgba(232, 242, 241, 0.45);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.mm__layer {
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  color: rgba(232, 242, 241, 0.82);
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 600;
  gap: 6px;
  padding: 3px 10px;
}

.mm__layer > .q-icon {
  color: #5eead4;
}

.mm__layer--hidden {
  color: rgba(232, 242, 241, 0.35);
  text-decoration: line-through;
}

.mm__layer--hidden > .q-icon {
  color: rgba(232, 242, 241, 0.3);
}

.mm__footer-hint {
  color: rgba(232, 242, 241, 0.4);
  font-size: 0.68rem;
  margin-left: auto;
}

@media (max-width: 900px) {
  .mm__grid {
    grid-template-rows: minmax(0, 1.3fr) minmax(0, 1fr);
  }

  .mm__strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mm__footer-hint {
    display: none;
  }
}
</style>
