import { beforeEach, describe, expect, it } from 'vitest';

import {
  postTeoPreview,
  readCachedPreviewSource,
  TEO_PREVIEW_CACHE_KEY,
} from '../teo-outputs';

describe('teo-outputs preview source cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the file URL and kind of a media preview', () => {
    localStorage.setItem(
      TEO_PREVIEW_CACHE_KEY,
      JSON.stringify({
        kind: 'media',
        label: 'Song 12',
        mediaKind: 'audio',
        sourceId: 'media-1',
        url: 'file:///media/song.mp3',
      }),
    );

    expect(readCachedPreviewSource()).toEqual({
      kind: 'media',
      label: 'Song 12',
      mediaKind: 'audio',
      sourceId: 'media-1',
      url: 'file:///media/song.mp3',
    });
  });

  it('drops a media preview with no file to show', () => {
    localStorage.setItem(
      TEO_PREVIEW_CACHE_KEY,
      JSON.stringify({ kind: 'media', label: 'Song 12', sourceId: 'media-1' }),
    );

    expect(readCachedPreviewSource()).toBeNull();
  });

  it('still accepts a camera preview, which has no URL', () => {
    postTeoPreview({
      kind: 'camera',
      label: 'Camera 1',
      sourceId: 'device-1',
    });

    expect(readCachedPreviewSource()).toEqual({
      kind: 'camera',
      label: 'Camera 1',
      sourceId: 'device-1',
    });
  });

  it('ignores a cached message with an unknown kind', () => {
    localStorage.setItem(
      TEO_PREVIEW_CACHE_KEY,
      JSON.stringify({ kind: 'slide', label: '', sourceId: '' }),
    );

    expect(readCachedPreviewSource()).toBeNull();
  });
});
