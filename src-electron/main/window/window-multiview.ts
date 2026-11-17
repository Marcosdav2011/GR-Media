import type { BrowserWindow } from 'electron';

import { PLATFORM } from 'src-electron/constants';
import { captureElectronError } from 'src-electron/main/utils';
import {
  createWindow,
  sendToWindow,
} from 'src-electron/main/window/window-base';
import { mainWindowInfo } from 'src-electron/main/window/window-main';
import { log } from 'src/shared/vanilla';

export const multiviewWindowInfo: {
  multiviewWindow: BrowserWindow | null;
} = {
  multiviewWindow: null,
};

export function closeMultiviewWindow() {
  try {
    const win = multiviewWindowInfo.multiviewWindow;
    if (!win || win.isDestroyed()) return;
    win.close();
  } catch (error) {
    captureElectronError(error, {
      contexts: { fn: { name: 'closeMultiviewWindow' } },
    });
  }
}

/**
 * Fullscreen multiview for the operator. It is its own window so it can sit
 * on a different display than the audience outputs without touching them.
 */
export function createMultiviewWindow() {
  const existing = multiviewWindowInfo.multiviewWindow;
  if (existing && !existing.isDestroyed()) {
    existing.show();
    return;
  }

  const win = createWindow('multiview', {
    backgroundColor: 'black',
    focusable: true,
    frame: false,
    fullscreen: true,
    minHeight: 360,
    minWidth: 640,
    roundedCorners: PLATFORM === 'darwin',
    thickFrame: false,
    title: 'Multiview - GR Media',
  });
  multiviewWindowInfo.multiviewWindow = win;

  win.once('ready-to-show', () => {
    // A saved window state can restore smaller bounds, so fullscreen is
    // requested again once the window exists.
    win.setFullScreen(true);
    win.show();
  });

  win.on('closed', () => {
    multiviewWindowInfo.multiviewWindow = null;
    // Closed from outside GR Media (Escape is handled in the page): the
    // Cameras page keeps its own idea of whether the window is showing.
    sendToWindow(mainWindowInfo.mainWindow, 'multiviewWindowClosed');
  });

  log(
    '[createMultiviewWindow] Multiview window created',
    'electronWindow',
    'log',
  );
}
