import type { TeoLayerId } from 'src/types';

/**
 * Studio layers from top to bottom. Media and capture already sat above the
 * camera, and the yeartext background below everything, so the default keeps
 * the output looking as it did before the sources panel existed.
 */
export const DEFAULT_TEO_LAYER_ORDER: TeoLayerId[] = [
  'media',
  'capture',
  'camera',
  'yeartext',
];

export const TEO_TRANSITION_DURATIONS = [300, 500, 800, 1200];

export const normalizeTeoTransitionMs = (value: null | number | undefined) =>
  typeof value === 'number' && TEO_TRANSITION_DURATIONS.includes(value)
    ? value
    : 500;

/** Repairs an order saved by an older version, missing or duplicated ids. */
export const normalizeTeoLayerOrder = (
  order: null | TeoLayerId[] | undefined,
): TeoLayerId[] => {
  const seen = new Set<TeoLayerId>();
  const normalized: TeoLayerId[] = [];
  for (const id of order ?? []) {
    if (!DEFAULT_TEO_LAYER_ORDER.includes(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  for (const id of DEFAULT_TEO_LAYER_ORDER) {
    if (!seen.has(id)) normalized.push(id);
  }
  return normalized;
};

export const toggleTeoLayerHidden = (
  hidden: TeoLayerId[],
  id: TeoLayerId,
): TeoLayerId[] =>
  hidden.includes(id)
    ? hidden.filter((candidate) => candidate !== id)
    : [...hidden, id];

/** Moves one layer towards the top ('up') or the bottom ('down'). */
export const moveTeoLayer = (
  order: TeoLayerId[],
  id: TeoLayerId,
  direction: 'down' | 'up',
): TeoLayerId[] => {
  const normalized = normalizeTeoLayerOrder(order);
  const index = normalized.indexOf(id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= normalized.length) {
    return normalized;
  }
  const moving = normalized[index];
  const displaced = normalized[target];
  if (!moving || !displaced) return normalized;
  normalized[index] = displaced;
  normalized[target] = moving;
  return normalized;
};
