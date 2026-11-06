import type { MonitorPreview } from 'src/types';

import { flushPromises, mount } from '@vue/test-utils';
import { installQuasarPlugin } from 'app/test/vitest/helpers/install-quasar-plugin';
import { electronApi } from 'app/test/vitest/mocks/electronApi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MonitorPreviews from '../MonitorPreviews.vue';

vi.mock('src/helpers/error-catcher', () => ({ errorCatcher: vi.fn() }));

installQuasarPlugin();

const frame = (role: MonitorPreview['role'], number: null | number) =>
  ({
    displayNumber: number,
    image: `data:image/jpeg;base64,${role}`,
    live: number !== null,
    role,
  }) as MonitorPreview;

const getMonitorPreviews = vi.spyOn(electronApi, 'getMonitorPreviews');

describe('MonitorPreviews', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getMonitorPreviews.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a tile per output with its screen number and frame', async () => {
    getMonitorPreviews.mockResolvedValue([
      frame('main', 2),
      frame('auxiliary', 3),
      frame('timer', null),
      frame('website', 4),
    ]);
    const wrapper = mount(MonitorPreviews);
    await flushPromises();

    expect(getMonitorPreviews).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Main output');
    expect(wrapper.text()).toContain('Screen 2');
    expect(wrapper.text()).toContain('Second output');
    expect(wrapper.text()).toContain('Speaker monitor');
    expect(wrapper.text()).toContain('Website');
    // A window that is not showing has no frame and says so.
    expect(wrapper.text()).toContain('Not showing');
    expect(wrapper.findAll('img')).toHaveLength(3);
  });

  it('refreshes once per second and stops refreshing after unmount', async () => {
    getMonitorPreviews.mockResolvedValue([frame('main', 2)]);
    const wrapper = mount(MonitorPreviews);
    await flushPromises();
    expect(getMonitorPreviews).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(getMonitorPreviews).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(getMonitorPreviews).toHaveBeenCalledTimes(2);
  });
});
