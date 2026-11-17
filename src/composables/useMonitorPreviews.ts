import type { MonitorPreview } from 'src/types';

import { errorCatcher } from 'src/helpers/error-catcher';
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Polls a still frame of every output window. A frame per second is enough to
 * confirm what each screen shows and keeps the capture cost negligible while
 * the page or the multiview window is open.
 */
export const useMonitorPreviews = (refreshMs = 1000) => {
  const previews = ref<MonitorPreview[]>([]);
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let refreshing = false;

  const refresh = async () => {
    if (refreshing || document.hidden) return;
    refreshing = true;
    try {
      previews.value = await globalThis.electronApi.getMonitorPreviews();
    } catch (error) {
      errorCatcher(error, {
        contexts: { fn: { name: 'useMonitorPreviews.refresh' } },
      });
    } finally {
      refreshing = false;
    }
  };

  onMounted(() => {
    void refresh();
    refreshTimer = setInterval(() => void refresh(), refreshMs);
    document.addEventListener('visibilitychange', refresh);
  });

  onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer);
    document.removeEventListener('visibilitychange', refresh);
  });

  return { previews, refresh };
};
