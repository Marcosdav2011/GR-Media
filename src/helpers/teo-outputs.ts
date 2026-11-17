import type {
  TeoCameraLayout,
  TeoCameraView,
  TeoLayerId,
  TeoTransitionType,
} from 'src/types';

import { errorCatcher } from 'src/helpers/error-catcher';

/**
 * GR MEDIA output channels.
 *
 * TEO owns the camera output, so it uses its own channel instead of MMM's
 * `camera-stream`. MMM publishes a display camera there automatically
 * (`displayCameraId`), which would replace the yeartext on the output screen
 * even when no camera was assigned in TEO. `teo-screen-identify` shows a
 * temporary screen number on the output window.
 */
export const TEO_CAMERA_CHANNEL = 'teo-camera-stream';
export const TEO_CAMERA_LAYOUT_CHANNEL = 'teo-camera-layout';
export const TEO_CAMERA_VIEW_CHANNEL = 'teo-camera-view';
export const TEO_CAPTURE_CHANNEL = 'teo-capture-source';
export const TEO_CAPTURE_STATUS_CHANNEL = 'teo-capture-status';
export const TEO_COMMAND_CHANNEL = 'teo-studio-command';
export const TEO_LAYERS_CHANNEL = 'teo-studio-layers';
export const TEO_PREVIEW_CHANNEL = 'teo-preview-source';
export const TEO_PREVIEW_CACHE_KEY = 'teo-preview-source';
export const TEO_SCREEN_IDENTIFY_CHANNEL = 'teo-screen-identify';
export const TEO_TRANSITION_CHANNEL = 'teo-studio-transition';

/**
 * The yeartext is also mirrored into shared localStorage. BroadcastChannel
 * only reaches windows that are already listening, so an output window
 * created late (or one that missed its startup request) could otherwise stay
 * black until the yeartext happened to change again.
 */
export const TEO_YEARTEXT_CACHE_KEY = 'teo-yeartext';

/**
 * Layer order and visibility follow the same reasoning: the output window
 * reads the last published state on startup, since it may have missed the
 * BroadcastChannel message that set it.
 */
export const TEO_LAYERS_CACHE_KEY = 'teo-studio-layers';

export const cacheYeartext = (yeartext: null | string | undefined) => {
  try {
    localStorage.setItem(TEO_YEARTEXT_CACHE_KEY, yeartext ?? '');
  } catch {
    // Storage can be unavailable in restricted windows; the broadcast below
    // still carries the value to every listening output.
  }
};

/**
 * The media window reports back when it could not open a captured source, or
 * when the source goes away (its window closed, the screen was unplugged).
 * Without it the main window would keep claiming the capture is running while
 * the output stays black or frozen.
 */
export interface TeoCaptureStatusMessage {
  ok: boolean;
  sourceId: string;
}

/** Stacking and visibility of the studio sources on the output. */
export interface TeoLayerState {
  hidden: TeoLayerId[];
  order: TeoLayerId[];
}

/**
 * Tells the multiview which source the main window is preparing. A camera can
 * only be held by one window at a time, so when the multiview is open the
 * main window releases it and hands the device over here; `none` asks the
 * multiview to let go so the output can open it instead. A media preview
 * carries its file URL instead of a device, so it needs no handoff.
 */
export interface TeoPreviewMessage {
  kind: 'camera' | 'capture' | 'media' | 'none';
  label: string;
  /** For `media`, how the preview renders the file. */
  mediaKind?: 'audio' | 'image' | 'video';
  sourceId: string;
  /** For `media`, the file URL the preview shows. */
  url?: string;
}

export interface TeoScreenIdentifyMessage {
  label: string;
  /**
   * Monotonic token so sending the same screen twice still counts as a new
   * message in the media window. Without it, Vue would skip the watcher when
   * the label string is unchanged and the overlay would not reappear.
   */
  token: number;
}

/**
 * Operator commands from the multiview window, which has no access to the
 * studio stores: the main window owns them, so the multiview asks it to move
 * the preview or to take it on air.
 */
export type TeoStudioCommand =
  | 'cut'
  | 'preview-camera'
  | 'preview-capture'
  | 'preview-next'
  | 'preview-previous'
  | 'take';

export interface TeoStudioCommandMessage {
  action: TeoStudioCommand;
  token: number;
}

/** A take that the output should animate instead of showing abruptly. */
export interface TeoTransitionMessage {
  durationMs: number;
  target: 'camera' | 'capture' | 'media';
  token: number;
  type: Exclude<TeoTransitionType, 'cut'>;
}

let cameraChannel: BroadcastChannel | null = null;
let cameraLayoutChannel: BroadcastChannel | null = null;
let cameraViewChannel: BroadcastChannel | null = null;
let captureChannel: BroadcastChannel | null = null;
let captureStatusChannel: BroadcastChannel | null = null;
let commandChannel: BroadcastChannel | null = null;
let identifyChannel: BroadcastChannel | null = null;
let layersChannel: BroadcastChannel | null = null;
let previewChannel: BroadcastChannel | null = null;
let transitionChannel: BroadcastChannel | null = null;

const getChannel = (
  name: string,
  cached: BroadcastChannel | null,
): BroadcastChannel | null => {
  if (cached) return cached;
  if (typeof BroadcastChannel === 'undefined') return null;

  try {
    return new BroadcastChannel(name);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { channel: name, name: 'getTeoOutputChannel' } },
    });
    return null;
  }
};

export const postTeoCamera = (deviceId: string) => {
  try {
    cameraChannel = getChannel(TEO_CAMERA_CHANNEL, cameraChannel);
    cameraChannel?.postMessage(deviceId);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoCamera' } },
    });
  }
};

export const postTeoCameraLayout = (layout: '' | TeoCameraLayout) => {
  try {
    cameraLayoutChannel = getChannel(
      TEO_CAMERA_LAYOUT_CHANNEL,
      cameraLayoutChannel,
    );
    cameraLayoutChannel?.postMessage(layout);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoCameraLayout' } },
    });
  }
};

export const postTeoCameraView = (view: TeoCameraView) => {
  try {
    cameraViewChannel = getChannel(TEO_CAMERA_VIEW_CHANNEL, cameraViewChannel);
    cameraViewChannel?.postMessage(view);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoCameraView' } },
    });
  }
};

export const postTeoCapture = (sourceId: string) => {
  try {
    captureChannel = getChannel(TEO_CAPTURE_CHANNEL, captureChannel);
    captureChannel?.postMessage(sourceId);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoCapture' } },
    });
  }
};

/**
 * Tells the multiview which camera the preview is using. The multiview opens
 * that device itself, so it must follow changes made in the Cameras page.
 */
export const readCachedPreviewSource = (): null | TeoPreviewMessage => {
  try {
    const raw = localStorage.getItem(TEO_PREVIEW_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { kind, label, mediaKind, sourceId, url } =
      parsed as Partial<TeoPreviewMessage>;
    if (
      (kind !== 'camera' &&
        kind !== 'capture' &&
        kind !== 'media' &&
        kind !== 'none') ||
      typeof sourceId !== 'string'
    ) {
      return null;
    }
    if (kind === 'media') {
      if (typeof url !== 'string' || !url) return null;
      let resolvedKind: 'audio' | 'image' | 'video' = 'video';
      if (mediaKind === 'image') resolvedKind = 'image';
      else if (mediaKind === 'audio') resolvedKind = 'audio';
      return {
        kind,
        label: typeof label === 'string' ? label : '',
        mediaKind: resolvedKind,
        sourceId,
        url,
      };
    }
    return { kind, label: typeof label === 'string' ? label : '', sourceId };
  } catch {
    return null;
  }
};

/**
 * Publishes the preview source. The cache lets a multiview window created later
 * catch up, since BroadcastChannel does not replay past messages.
 */
export const postTeoPreview = (message: TeoPreviewMessage) => {
  try {
    localStorage.setItem(TEO_PREVIEW_CACHE_KEY, JSON.stringify(message));
  } catch {
    // The broadcast still reaches an already open multiview window.
  }
  try {
    previewChannel = getChannel(TEO_PREVIEW_CHANNEL, previewChannel);
    previewChannel?.postMessage(message);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoPreview' } },
    });
  }
};

/**
 * Asks the main window, which owns the studio state, to move the preview or to
 * take it on air. The multiview only mirrors those actions.
 */
export const postTeoStudioCommand = (action: TeoStudioCommand) => {
  try {
    commandChannel = getChannel(TEO_COMMAND_CHANNEL, commandChannel);
    commandChannel?.postMessage({
      action,
      token: Date.now(),
    } satisfies TeoStudioCommandMessage);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { action, name: 'postTeoStudioCommand' } },
    });
  }
};

export const postTeoCaptureStatus = (message: TeoCaptureStatusMessage) => {
  try {
    captureStatusChannel = getChannel(
      TEO_CAPTURE_STATUS_CHANNEL,
      captureStatusChannel,
    );
    captureStatusChannel?.postMessage(message);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoCaptureStatus' } },
    });
  }
};

export const postTeoScreenIdentify = (text: string) => {
  try {
    identifyChannel = getChannel(TEO_SCREEN_IDENTIFY_CHANNEL, identifyChannel);
    identifyChannel?.postMessage({
      label: text,
      token: Date.now(),
    } satisfies TeoScreenIdentifyMessage);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoScreenIdentify' } },
    });
  }
};

export const readCachedLayerState = (): null | TeoLayerState => {
  try {
    const raw = localStorage.getItem(TEO_LAYERS_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { hidden, order } = parsed as Partial<TeoLayerState>;
    if (!Array.isArray(hidden) || !Array.isArray(order)) return null;
    return { hidden, order } as TeoLayerState;
  } catch {
    return null;
  }
};

export const postTeoLayerState = (state: TeoLayerState) => {
  try {
    localStorage.setItem(TEO_LAYERS_CACHE_KEY, JSON.stringify(state));
  } catch {
    // The broadcast still reaches open outputs when storage is unavailable.
  }
  try {
    layersChannel = getChannel(TEO_LAYERS_CHANNEL, layersChannel);
    layersChannel?.postMessage(state);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoLayerState' } },
    });
  }
};

export const postTeoTransition = (
  transition: Omit<TeoTransitionMessage, 'token'>,
) => {
  try {
    transitionChannel = getChannel(TEO_TRANSITION_CHANNEL, transitionChannel);
    transitionChannel?.postMessage({
      ...transition,
      token: Date.now(),
    } satisfies TeoTransitionMessage);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'postTeoTransition' } },
    });
  }
};
