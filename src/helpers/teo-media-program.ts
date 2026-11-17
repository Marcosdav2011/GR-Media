import type { MediaItem } from 'src/types';

import { errorCatcher } from 'src/helpers/error-catcher';
import { toggleMediaWindowVisibility } from 'src/helpers/mediaPlayback';
import {
  stopZoomSharingAfterMedia,
  triggerZoomScreenShare,
} from 'src/helpers/zoom';
import { sendObsSceneEvent } from 'src/utils/obs';
import {
  type MediaPlayingState,
  useCurrentStateStore,
} from 'stores/current-state';

/**
 * Studio mode plays media through the same output state the meeting page uses,
 * but from the Cameras page, where that page's broadcasters are not mounted.
 * These helpers start and stop a media item on the program output on their
 * own, so a preview can be taken on air without going back to the calendar.
 */

const emptyMediaPlayingState = (): MediaPlayingState => ({
  action: '',
  currentPosition: 0,
  currentPositionUpdatedAt: 0,
  duration: 0,
  pan: { x: 0, y: 0 },
  playbackConfirmedToken: 0,
  playbackRate: 1,
  playToken: 0,
  seekTo: 0,
  shouldLoop: false,
  slideshowAudioUrl: '',
  subtitlesUrl: '',
  uniqueId: '',
  url: '',
  zoom: 1,
});

const mediaChannels = new Map<string, BroadcastChannel>();

const postMediaChannel = (name: string, payload: unknown) => {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    let channel = mediaChannels.get(name);
    if (!channel) {
      channel = new BroadcastChannel(name);
      mediaChannels.set(name, channel);
    }
    channel.postMessage(payload);
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { channel: name, name: 'postTeoMediaChannel' } },
    });
  }
};

interface MediaProgramState {
  action: string;
  customDuration?: { max: number; min: number };
  repeat: boolean;
  subtitlesUrl: string;
  url: string;
}

const postMediaProgramState = (state: MediaProgramState) => {
  postMediaChannel('main-window-media-action', state.action);
  postMediaChannel('media-url', state.url);
  postMediaChannel('subtitles-url', state.subtitlesUrl);
  postMediaChannel('slideshow-audio-url', '');
  postMediaChannel(
    'custom-duration',
    state.customDuration ? JSON.stringify(state.customDuration) : undefined,
  );
  postMediaChannel('repeat', state.repeat);
};

/**
 * The output window can show a cached file without touching the network, so
 * the local copy wins when it is actually there. A missing or partly
 * downloaded file falls back to the streamed copy, like the meeting page.
 */
export const resolveTeoMediaPlaybackUrl = async (media: MediaItem) => {
  const { fileUrl, streamUrl } = media;
  if (!fileUrl) return streamUrl ?? '';

  try {
    const { fileUrlToPath, fs } = globalThis.electronApi;
    if (await fs.pathExists(fileUrlToPath(fileUrl))) return fileUrl;
  } catch (error) {
    errorCatcher(error, {
      contexts: { fn: { name: 'resolveTeoMediaPlaybackUrl' } },
    });
  }

  return streamUrl ?? fileUrl;
};

export const startTeoMediaProgram = (media: MediaItem, url: string) => {
  const currentState = useCurrentStateStore();
  const customDuration = media.customDuration;
  const subtitlesUrl = media.subtitlesUrl ?? '';
  const repeat = !!media.repeat;

  currentState.mediaPlaying = {
    ...emptyMediaPlayingState(),
    action: 'play',
    shouldLoop: repeat,
    subtitlesUrl,
    uniqueId: media.uniqueId,
    url,
  };

  toggleMediaWindowVisibility(true);
  triggerZoomScreenShare(true);
  sendObsSceneEvent('media');

  const post = () => {
    const playing = currentState.mediaPlaying;
    if (playing.uniqueId !== media.uniqueId || playing.url !== url) return;
    postMediaProgramState({
      action: 'play',
      customDuration,
      repeat,
      subtitlesUrl,
      url,
    });
  };

  // A freshly shown output window may still be loading when the first post
  // goes out, so repeat the state while this item is still the live one.
  post();
  for (const delay of [300, 900, 1800]) setTimeout(post, delay);
};

export const stopTeoMediaProgram = () => {
  const currentState = useCurrentStateStore();
  const wasPlaying = !!currentState.mediaPlaying.url;

  currentState.mediaPlaying = emptyMediaPlayingState();
  postMediaProgramState({
    action: '',
    repeat: false,
    subtitlesUrl: '',
    url: '',
  });
  if (wasPlaying) stopZoomSharingAfterMedia();
  // Keep the output on screen with the yeartext, as GR Media always does.
  toggleMediaWindowVisibility(true);
};
