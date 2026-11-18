import type { Display } from 'src/types';

import { flushPromises, mount } from '@vue/test-utils';
import { installQuasarPlugin } from 'app/test/vitest/helpers/install-quasar-plugin';
import { installPinia } from 'app/test/vitest/mocks/pinia';
import { useCurrentStateStore } from 'stores/current-state';
import { useTeoCameraStore } from 'stores/teo-camera';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import MeetingSidebar from '../MeetingSidebar.vue';

vi.mock('src/helpers/mediaPlayback', () => ({
  toggleMediaWindowVisibility: vi.fn(),
}));

installQuasarPlugin();
installPinia({ stubActions: false });

const getAllScreensMock = vi.fn<() => Promise<Display[]>>();
const moveMediaWindowMock = vi.fn();
const enumerateDevicesMock = vi.fn<() => Promise<MediaDeviceInfo[]>>();

const display = (
  id: number,
  x: number,
  width: number,
  mainWindow = false,
  displayNumber = 0,
) =>
  ({
    bounds: { height: 1080, width, x, y: 0 },
    displayNumber,
    id,
    mainWindow,
  }) as Display;

const screens: Display[] = [
  display(2, -1920, 1920, false, 2),
  display(1, 0, 1920, true, 1),
];

const camera = (deviceId: string, label: string) =>
  ({ deviceId, kind: 'videoinput', label }) as MediaDeviceInfo;

const mountSidebar = async () => {
  const wrapper = mount(MeetingSidebar, {
    props: {
      playingItemLabel: '',
      sections: [{ count: 3, id: 'ayfm', label: 'Opening talk' }],
    },
  });
  await flushPromises();
  return wrapper;
};

const openCameraTab = async (
  wrapper: Awaited<ReturnType<typeof mountSidebar>>,
) => {
  const tab = wrapper.findAll('.q-tab').at(2);
  if (!tab) throw new Error('camera tab is missing');
  await tab.trigger('click');
  await flushPromises();
  await nextTick();
};

const findButton = (
  wrapper: Awaited<ReturnType<typeof mountSidebar>>,
  label: string,
) => {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes(label));
  if (!button) throw new Error(`No button found with label "${label}"`);
  return button;
};

beforeEach(() => {
  vi.clearAllMocks();
  getAllScreensMock.mockReset();
  getAllScreensMock.mockResolvedValue(screens);
  moveMediaWindowMock.mockReset();
  enumerateDevicesMock.mockReset();
  enumerateDevicesMock.mockResolvedValue([
    camera('cam-1', 'USB Camera'),
    camera('cam-2', 'HDMI Capture'),
  ]);
  globalThis.electronApi.getAllScreens = getAllScreensMock;
  globalThis.electronApi.moveMediaWindow = moveMediaWindowMock;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      addEventListener: vi.fn(),
      enumerateDevices: enumerateDevicesMock,
      removeEventListener: vi.fn(),
    },
  });
  useCurrentStateStore().mediaPlaying.url = '';
  useTeoCameraStore().$reset();
});

describe('MeetingSidebar', () => {
  it('groups the meeting, the screens and the camera in three tabs', async () => {
    const wrapper = await mountSidebar();

    const tabs = wrapper.findAll('.q-tab').map((tab) => tab.text());
    expect(tabs).toHaveLength(3);
    for (const label of ['Meeting', 'Screens', 'Camera']) {
      expect(tabs.some((tab) => tab.includes(label))).toBe(true);
    }
    expect(wrapper.text()).toContain('Opening talk');
  });

  it('projects the selected camera on the output screen', async () => {
    const store = useTeoCameraStore();
    const startCamera = vi.spyOn(store, 'startCameraProjection');
    const wrapper = await mountSidebar();
    await openCameraTab(wrapper);

    await findButton(wrapper, 'Project camera').trigger('click');

    expect(startCamera).toHaveBeenCalledWith(
      'cam-1',
      'USB Camera',
      0,
      'fullscreen',
      { panX: 0, panY: 0, zoom: 1 },
    );
  });

  it('stops a camera that is already on air', async () => {
    const store = useTeoCameraStore();
    store.activeCameraId = 'cam-1';
    store.activeCameraLabel = 'USB Camera';
    store.activeScreenIndex = 0;
    const stopCamera = vi.spyOn(store, 'stopCameraProjection');
    const wrapper = await mountSidebar();
    await openCameraTab(wrapper);

    await findButton(wrapper, 'Stop camera').trigger('click');

    expect(stopCamera).toHaveBeenCalled();
  });

  it('refuses to project a camera while media is playing', async () => {
    useCurrentStateStore().mediaPlaying.url = 'file:///media/video.mp4';
    const store = useTeoCameraStore();
    const startCamera = vi.spyOn(store, 'startCameraProjection');
    const wrapper = await mountSidebar();
    await openCameraTab(wrapper);

    await findButton(wrapper, 'Project camera').trigger('click');

    expect(startCamera).not.toHaveBeenCalled();
  });
});
