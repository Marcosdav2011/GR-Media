import type { BrowserWindow } from 'electron';
import type { MonitorPreview, MonitorPreviewRole } from 'src/types';

import { getAllScreens, getWindowScreen } from 'src-electron/main/screen';
import { captureElectronError } from 'src-electron/main/utils';
import { auxiliaryWindowInfo } from 'src-electron/main/window/window-auxiliary';
import { mediaWindowInfo } from 'src-electron/main/window/window-media';
import { timerWindowInfo } from 'src-electron/main/window/window-timer';
import { websiteWindowInfo } from 'src-electron/main/window/window-website';

// The panel shows each frame at roughly 360px wide. Capturing wider than the
// tile only adds bridge traffic, since the refresh runs every second.
const PREVIEW_WIDTH = 480;
const PREVIEW_JPEG_QUALITY = 70;

interface OutputWindow {
  role: MonitorPreviewRole;
  window: BrowserWindow | null;
}

const getDisplayNumber = (window: BrowserWindow): null | number => {
  const screenIndex = getWindowScreen(window);
  return getAllScreens()[screenIndex]?.displayNumber ?? null;
};

const describeWindow = async ({
  role,
  window,
}: OutputWindow): Promise<MonitorPreview> => {
  if (!window || window.isDestroyed() || !window.isVisible()) {
    return { displayNumber: null, image: '', live: false, role };
  }

  const displayNumber = getDisplayNumber(window);

  try {
    const page = await window.webContents.capturePage();
    if (page.isEmpty()) {
      return { displayNumber, image: '', live: true, role };
    }

    const frame = page.resize({ quality: 'good', width: PREVIEW_WIDTH });
    const image = frame.toJPEG(PREVIEW_JPEG_QUALITY).toString('base64');
    return {
      displayNumber,
      image: `data:image/jpeg;base64,${image}`,
      live: true,
      role,
    };
  } catch (error) {
    captureElectronError(error, {
      contexts: { fn: { name: 'getMonitorPreviews', role } },
    });
    return { displayNumber, image: '', live: true, role };
  }
};

/**
 * Captures one still frame of each output window so the main window can show
 * what every screen is displaying right now. Frames are taken one at a time
 * to keep a fullscreen capture from delaying the main-process event loop.
 */
export const getMonitorPreviews = async (): Promise<MonitorPreview[]> => {
  const windows: OutputWindow[] = [
    { role: 'main', window: mediaWindowInfo.mediaWindow },
    { role: 'auxiliary', window: auxiliaryWindowInfo.auxiliaryWindow },
    { role: 'timer', window: timerWindowInfo.timerWindow },
    { role: 'website', window: websiteWindowInfo.websiteWindow },
  ];

  const previews: MonitorPreview[] = [];
  for (const outputWindow of windows) {
    previews.push(await describeWindow(outputWindow));
  }
  return previews;
};
