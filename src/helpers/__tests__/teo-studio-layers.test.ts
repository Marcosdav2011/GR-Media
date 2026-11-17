import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TEO_LAYER_ORDER,
  moveTeoLayer,
  normalizeTeoLayerOrder,
  normalizeTeoTransitionMs,
  toggleTeoLayerHidden,
} from '../teo-studio-layers';

describe('teo-studio-layers', () => {
  it('repairs an order saved with missing or repeated layers', () => {
    expect(
      normalizeTeoLayerOrder([
        'camera',
        'camera',
        'yeartext',
      ] as typeof DEFAULT_TEO_LAYER_ORDER),
    ).toEqual(['camera', 'yeartext', 'media', 'capture']);
    expect(normalizeTeoLayerOrder(undefined)).toEqual(DEFAULT_TEO_LAYER_ORDER);
  });

  it('moves a layer up and down without leaving its bounds', () => {
    expect(moveTeoLayer(DEFAULT_TEO_LAYER_ORDER, 'camera', 'up')).toEqual([
      'media',
      'camera',
      'capture',
      'yeartext',
    ]);
    expect(moveTeoLayer(DEFAULT_TEO_LAYER_ORDER, 'media', 'up')).toEqual(
      DEFAULT_TEO_LAYER_ORDER,
    );
    expect(moveTeoLayer(DEFAULT_TEO_LAYER_ORDER, 'yeartext', 'down')).toEqual(
      DEFAULT_TEO_LAYER_ORDER,
    );
  });

  it('toggles the visibility of one layer only', () => {
    expect(toggleTeoLayerHidden([], 'media')).toEqual(['media']);
    expect(toggleTeoLayerHidden(['media'], 'media')).toEqual([]);
  });

  it('accepts only the offered transition durations', () => {
    expect(normalizeTeoTransitionMs(800)).toBe(800);
    expect(normalizeTeoTransitionMs(1234)).toBe(500);
    expect(normalizeTeoTransitionMs(undefined)).toBe(500);
  });
});
