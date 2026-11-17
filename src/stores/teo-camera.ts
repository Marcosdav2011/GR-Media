import type {
  TeoCameraLayout,
  TeoCameraScene,
  TeoCameraView,
  TeoLayerId,
  TeoTransitionType,
} from 'src/types';

import { defineStore } from 'pinia';
import { errorCatcher } from 'src/helpers/error-catcher';
import { toggleMediaWindowVisibility } from 'src/helpers/mediaPlayback';
import {
  IDENTITY_TEO_CAMERA_VIEW,
  normalizeTeoCameraView,
  teoCameraViewsEqual,
} from 'src/helpers/teo-camera-view';
import {
  postTeoCamera,
  postTeoCameraLayout,
  postTeoCameraView,
  postTeoLayerState,
  postTeoScreenIdentify,
  postTeoTransition,
} from 'src/helpers/teo-outputs';
import {
  DEFAULT_TEO_LAYER_ORDER,
  moveTeoLayer,
  normalizeTeoLayerOrder,
  normalizeTeoTransitionMs,
  toggleTeoLayerHidden,
} from 'src/helpers/teo-studio-layers';
import { uuid } from 'src/shared/vanilla';
import { useCurrentStateStore } from 'stores/current-state';

interface Store {
  activeCameraId: null | string;
  activeCameraLabel: string;
  activeSceneId: null | string;
  activeScreenIndex: null | number;
  hiddenLayers: TeoLayerId[];
  layerOrder: TeoLayerId[];
  multiviewOpen: boolean;
  preferredCameraScreen: null | number;
  preferredOutputScreen: null | number;
  scenes: TeoCameraScene[];
  selectedCameraId: null | string;
  selectedCameraLabel: string;
  selectedLayout: TeoCameraLayout;
  studioMode: boolean;
  transitionMs: number;
  transitionType: TeoTransitionType;
  view: TeoCameraView;
}

export const useTeoCameraStore = defineStore('teo-camera', {
  actions: {
    /**
     * Starts a saved camera setup. The screen comes from the caller because
     * the scene may name a monitor that is no longer connected.
     */
    activateScene(id: string, screenIndex: number): boolean {
      const scene = this.scenes.find((candidate) => candidate.id === id);
      if (!scene) return false;

      const started = this.startCameraProjection(
        scene.cameraId,
        scene.cameraLabel,
        screenIndex,
        scene.layout,
        scene.view,
      );
      if (started) this.activeSceneId = scene.id;
      return started;
    },

    addScene(name: string): null | TeoCameraScene {
      const cameraId = this.selectedCameraId;
      const trimmedName = name.trim();
      if (!cameraId || !trimmedName) return null;

      const scene: TeoCameraScene = {
        cameraId,
        cameraLabel: this.selectedCameraLabel,
        id: uuid(),
        layout: this.selectedLayout,
        name: trimmedName,
        screenIndex: this.preferredCameraScreen ?? this.preferredOutputScreen,
        view: { ...this.view },
      };
      this.scenes.push(scene);
      return scene;
    },

    /** The multiview window was closed from inside itself (Escape). */
    handleMultiviewClosed() {
      this.multiviewOpen = false;
    },

    /**
     * Loads a saved setup into the preview without going on air, so the
     * operator can check it before taking it live.
     */
    loadSceneIntoPreview(id: string): boolean {
      const scene = this.scenes.find((candidate) => candidate.id === id);
      if (!scene) return false;

      this.selectedCameraId = scene.cameraId;
      this.selectedCameraLabel = scene.cameraLabel;
      this.selectedLayout = scene.layout;
      this.view = normalizeTeoCameraView(scene.view);
      return true;
    },

    moveLayer(id: TeoLayerId, direction: 'down' | 'up') {
      this.layerOrder = moveTeoLayer(this.layerOrder, id, direction);
      this.publishLayerState();
    },

    /**
     * Announces the configured transition just before the incoming source is
     * published, so the output can animate it instead of cutting.
     */
    postTakeTransition(target: 'camera' | 'capture' | 'media') {
      if (this.transitionType === 'cut') return;
      postTeoTransition({
        durationMs: normalizeTeoTransitionMs(this.transitionMs),
        target,
        type: this.transitionType,
      });
    },

    /** Makes the output adopt the current stacking and visibility at once. */
    publishLayerState() {
      postTeoLayerState({
        hidden: [...this.hiddenLayers],
        order: normalizeTeoLayerOrder(this.layerOrder),
      });
    },

    removeScene(id: string) {
      this.scenes = this.scenes.filter((scene) => scene.id !== id);
      // The camera keeps running; only the shortcut to it is gone.
      if (this.activeSceneId === id) this.activeSceneId = null;
    },

    resetLayers() {
      this.layerOrder = [...DEFAULT_TEO_LAYER_ORDER];
      this.hiddenLayers = [];
    },

    resumeCameraProjection() {
      const screenIndex = this.activeScreenIndex;
      if (!this.activeCameraId || screenIndex === null) return;

      try {
        // Playback may have hidden the output window meanwhile. Only request
        // showing it when it is actually hidden: showing an already visible
        // window would steal focus from the main window.
        if (!useCurrentStateStore().mediaWindowVisible) {
          toggleMediaWindowVisibility(true);
        }
        globalThis.electronApi.moveMediaWindow(screenIndex, true);
        postTeoScreenIdentify('');
        this.publishLayerState();
        postTeoCameraLayout(this.selectedLayout);
        postTeoCameraView(this.view);
        postTeoCamera(this.activeCameraId);
      } catch (error) {
        errorCatcher(error, {
          contexts: {
            fn: { name: 'resumeCameraProjection', screenIndex },
          },
        });
      }
    },

    setActiveScreen(index: number) {
      if (this.activeCameraId) this.activeScreenIndex = index;
    },

    /**
     * Changes the framing shown on the output. Scenes capture it, so adjusting
     * it while one runs makes the running output no longer match that scene.
     */
    setCameraView(view: Partial<TeoCameraView>) {
      const nextView = normalizeTeoCameraView(view);
      if (teoCameraViewsEqual(nextView, this.view)) return;
      this.view = nextView;
      // In studio mode the preview is prepared first; framing changes must not
      // reach the audience until the operator takes it on air.
      if (!this.activeCameraId || this.studioMode) return;
      this.activeSceneId = null;
      try {
        postTeoCameraView(nextView);
      } catch (error) {
        errorCatcher(error, {
          contexts: { fn: { name: 'setTeoCameraView' } },
        });
      }
    },

    setLayerHidden(id: TeoLayerId) {
      this.hiddenLayers = toggleTeoLayerHidden(this.hiddenLayers, id);
      this.publishLayerState();
    },

    /**
     * Opens or closes the fullscreen multiview window. The camera preview in
     * this window steps aside while it is open: two windows cannot hold the
     * same camera device.
     */
    setMultiviewOpen(open: boolean) {
      if (this.multiviewOpen === open) return;
      this.multiviewOpen = open;
      try {
        globalThis.electronApi.toggleMultiviewWindow(open);
      } catch (error) {
        errorCatcher(error, {
          contexts: { fn: { name: 'setTeoMultiviewOpen' } },
        });
      }
    },

    /** Applies a layout to a running camera without reopening the device. */
    setSelectedLayout(layout: TeoCameraLayout) {
      if (this.selectedLayout === layout) return;
      this.selectedLayout = layout;
      if (!this.activeCameraId || this.studioMode) return;
      // The running output no longer matches the scene that started it.
      this.activeSceneId = null;
      try {
        postTeoCameraLayout(layout);
      } catch (error) {
        errorCatcher(error, {
          contexts: { fn: { name: 'setTeoCameraLayout' } },
        });
      }
    },

    /**
     * Layers are a studio device: leaving the mode returns the output to the
     * plain stacking, so a hidden yeartext or media layer can't leak into a
     * normal meeting.
     */
    setStudioMode(enabled: boolean) {
      if (this.studioMode === enabled) return;
      this.studioMode = enabled;
      if (enabled) {
        this.publishLayerState();
      } else {
        this.resetLayers();
        this.publishLayerState();
      }
    },

    setTransition(type: TeoTransitionType, ms?: number) {
      this.transitionType = type;
      if (typeof ms === 'number') {
        this.transitionMs = normalizeTeoTransitionMs(ms);
      }
    },

    startCameraProjection(
      deviceId: string,
      label: string,
      screenIndex: number,
      layout?: TeoCameraLayout,
      view?: null | Partial<TeoCameraView>,
    ): boolean {
      try {
        const currentState = useCurrentStateStore();
        if (currentState.mediaIsPlaying) return false;

        const nextLayout = layout ?? this.selectedLayout;
        const nextView = normalizeTeoCameraView(view ?? this.view);
        this.selectedCameraId = deviceId;
        this.selectedCameraLabel = label;
        this.selectedLayout = nextLayout;
        this.view = nextView;
        this.activeCameraId = deviceId;
        this.activeCameraLabel = label;
        this.activeSceneId = null;
        this.activeScreenIndex = screenIndex;

        // Show the output window first, then move it explicitly: showing it
        // runs MMM's automatic placement pass, which the explicit target must
        // override on multi-screen setups. Always request showing because the
        // window is created hidden while `mediaWindowVisible` starts as true.
        toggleMediaWindowVisibility(true);
        globalThis.electronApi.moveMediaWindow(screenIndex, true);
        postTeoScreenIdentify('');
        this.publishLayerState();
        postTeoCameraLayout(nextLayout);
        postTeoCameraView(nextView);
        postTeoCamera(deviceId);
        return true;
      } catch (error) {
        errorCatcher(error, {
          contexts: {
            fn: {
              name: 'startCameraProjection',
              screenIndex,
            },
          },
        });
        return false;
      }
    },

    stopCameraProjection() {
      try {
        postTeoCamera('');
        postTeoScreenIdentify('');
        this.activeCameraId = null;
        this.activeCameraLabel = '';
        this.activeSceneId = null;
        this.activeScreenIndex = null;

        // The multimedia screen is the idle output: hand the window back to
        // it so the yeartext does not stay on the camera screen.
        const mediaScreen = this.preferredOutputScreen;
        if (mediaScreen !== null) {
          globalThis.electronApi.moveMediaWindow(mediaScreen, true);
        }
      } catch (error) {
        errorCatcher(error, {
          contexts: { fn: { name: 'stopCameraProjection' } },
        });
      }
    },

    /**
     * Hides the camera layer while media plays but keeps the assignment, so
     * `resumeCameraProjection` can bring it back when playback ends.
     */
    suspendCameraProjection() {
      if (!this.activeCameraId) return;
      try {
        postTeoCamera('');
      } catch (error) {
        errorCatcher(error, {
          contexts: { fn: { name: 'suspendCameraProjection' } },
        });
      }
    },

    /**
     * Overwrites a saved scene with the current camera, layout, output screen
     * and framing, so it can be kept up to date without deleting it and
     * saving it again under the same name.
     */
    updateScene(id: string): boolean {
      const scene = this.scenes.find((candidate) => candidate.id === id);
      const cameraId = this.selectedCameraId;
      if (!scene || !cameraId) return false;

      scene.cameraId = cameraId;
      scene.cameraLabel = this.selectedCameraLabel;
      scene.layout = this.selectedLayout;
      scene.screenIndex =
        this.activeScreenIndex ??
        this.preferredCameraScreen ??
        this.preferredOutputScreen;
      scene.view = { ...this.view };
      return true;
    },
  },
  persist: {
    pick: [
      'hiddenLayers',
      'layerOrder',
      'preferredCameraScreen',
      'preferredOutputScreen',
      'scenes',
      'selectedCameraId',
      'selectedCameraLabel',
      'selectedLayout',
      'studioMode',
      'transitionMs',
      'transitionType',
      'view',
    ],
  },
  state: (): Store => ({
    activeCameraId: null,
    activeCameraLabel: '',
    activeSceneId: null,
    activeScreenIndex: null,
    hiddenLayers: [],
    layerOrder: [...DEFAULT_TEO_LAYER_ORDER],
    multiviewOpen: false,
    preferredCameraScreen: null,
    preferredOutputScreen: null,
    scenes: [],
    selectedCameraId: null,
    selectedCameraLabel: '',
    selectedLayout: 'fullscreen',
    studioMode: false,
    transitionMs: 500,
    transitionType: 'cut',
    view: { ...IDENTITY_TEO_CAMERA_VIEW },
  }),
});
