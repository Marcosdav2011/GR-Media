import { describe, expect, it, vi } from 'vitest';

interface FakeWindow {
  isDestroyed: () => boolean;
  isVisible: () => boolean;
  webContents: {
    capturePage: ReturnType<typeof vi.fn>;
  };
}

const {
  auxiliaryWindowInfo,
  captureElectronErrorMock,
  getAllScreensMock,
  getWindowScreenMock,
  mediaWindowInfo,
  timerWindowInfo,
  websiteWindowInfo,
} = vi.hoisted(() => ({
  auxiliaryWindowInfo: { auxiliaryWindow: null as FakeWindow | null },
  captureElectronErrorMock: vi.fn(),
  getAllScreensMock: vi.fn(() => [
    { displayNumber: 1 },
    { displayNumber: 2 },
    { displayNumber: 3 },
  ]),
  getWindowScreenMock: vi.fn(() => 1),
  mediaWindowInfo: { mediaWindow: null as FakeWindow | null },
  timerWindowInfo: { timerWindow: null as FakeWindow | null },
  websiteWindowInfo: { websiteWindow: null as FakeWindow | null },
}));

vi.mock('src-electron/main/screen', () => ({
  getAllScreens: getAllScreensMock,
  getWindowScreen: getWindowScreenMock,
}));

vi.mock('src-electron/main/utils', () => ({
  captureElectronError: captureElectronErrorMock,
}));

vi.mock('src-electron/main/window/window-auxiliary', () => ({
  auxiliaryWindowInfo,
}));

vi.mock('src-electron/main/window/window-media', () => ({ mediaWindowInfo }));

vi.mock('src-electron/main/window/window-timer', () => ({ timerWindowInfo }));

vi.mock('src-electron/main/window/window-website', () => ({
  websiteWindowInfo,
}));

const makeImage = (options: { empty?: boolean; fail?: boolean } = {}) => ({
  isEmpty: () => !!options.empty,
  resize: vi.fn(() => ({
    toJPEG: () => {
      if (options.fail) throw new Error('encode failed');
      return Buffer.from('jpeg-bytes');
    },
  })),
});

const makeWindow = (
  options: {
    captureError?: Error;
    destroyed?: boolean;
    empty?: boolean;
    visible?: boolean;
  } = {},
): FakeWindow => ({
  isDestroyed: () => !!options.destroyed,
  isVisible: () => options.visible !== false,
  webContents: {
    capturePage: vi.fn(async () => {
      if (options.captureError) throw options.captureError;
      return makeImage({ empty: options.empty, fail: false });
    }),
  },
});

const resetWindows = () => {
  mediaWindowInfo.mediaWindow = null;
  auxiliaryWindowInfo.auxiliaryWindow = null;
  timerWindowInfo.timerWindow = null;
  websiteWindowInfo.websiteWindow = null;
};

describe('getMonitorPreviews', () => {
  it('captures every output window as a JPEG frame with its screen number', async () => {
    resetWindows();
    mediaWindowInfo.mediaWindow = makeWindow();
    auxiliaryWindowInfo.auxiliaryWindow = makeWindow();
    timerWindowInfo.timerWindow = makeWindow();
    websiteWindowInfo.websiteWindow = makeWindow();
    getWindowScreenMock.mockReturnValue(1);
    const { getMonitorPreviews } = await import('../monitor-previews');

    const previews = await getMonitorPreviews();

    expect(previews.map((preview) => preview.role)).toEqual([
      'main',
      'auxiliary',
      'timer',
      'website',
    ]);
    expect(previews.every((preview) => preview.live)).toBe(true);
    expect(previews.every((preview) => preview.displayNumber === 2)).toBe(true);
    expect(previews[0]?.image).toBe(
      `data:image/jpeg;base64,${Buffer.from('jpeg-bytes').toString('base64')}`,
    );
    expect(getAllScreensMock).toHaveBeenCalled();
  });

  it('marks closed or hidden windows as not live without capturing them', async () => {
    resetWindows();
    mediaWindowInfo.mediaWindow = null;
    auxiliaryWindowInfo.auxiliaryWindow = makeWindow({ destroyed: true });
    timerWindowInfo.timerWindow = makeWindow({ visible: false });
    websiteWindowInfo.websiteWindow = makeWindow();
    const { getMonitorPreviews } = await import('../monitor-previews');

    const previews = await getMonitorPreviews();

    expect(previews.map((preview) => preview.live)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(previews[1]?.displayNumber).toBeNull();
    expect(
      auxiliaryWindowInfo.auxiliaryWindow?.webContents.capturePage,
    ).not.toHaveBeenCalled();
    expect(
      timerWindowInfo.timerWindow?.webContents.capturePage,
    ).not.toHaveBeenCalled();
  });

  it('returns no image when the window has nothing to capture', async () => {
    resetWindows();
    mediaWindowInfo.mediaWindow = makeWindow({ empty: true });
    const { getMonitorPreviews } = await import('../monitor-previews');

    const previews = await getMonitorPreviews();

    expect(previews[0]).toEqual({
      displayNumber: 2,
      image: '',
      live: true,
      role: 'main',
    });
  });

  it('reports a failed capture and keeps the window as live', async () => {
    resetWindows();
    const error = new Error('capture failed');
    mediaWindowInfo.mediaWindow = makeWindow({ captureError: error });
    const { getMonitorPreviews } = await import('../monitor-previews');

    const previews = await getMonitorPreviews();

    expect(previews[0]).toEqual({
      displayNumber: 2,
      image: '',
      live: true,
      role: 'main',
    });
    expect(captureElectronErrorMock).toHaveBeenCalledWith(error, {
      contexts: { fn: { name: 'getMonitorPreviews', role: 'main' } },
    });
  });
});
