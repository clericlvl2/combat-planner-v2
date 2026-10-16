import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { FakeApiClient } from '../../src/api/FakeApiClient.ts';
import { scenario } from '../../src/api/scenarios.ts';
import {
  RECONNECTING_TOAST_AFTER_MS,
  reconnectingToastDelay,
  watchConnection,
} from '../../src/hooks/connection.ts';

afterEach(() => {
  vi.useRealTimers();
});

const watch = (delay: number, initial: 'connected' | 'reconnecting' = 'connected') => {
  const client = new FakeApiClient({ scenario: scenario({ connection: initial }) });
  const showReconnecting = vi.fn(() => 'toast-1');
  const dismiss = vi.fn();
  const onReconnected = vi.fn();
  const stop = watchConnection({
    connection: client.connection,
    delay,
    showReconnecting,
    dismiss,
    onReconnected,
  });
  return { client, showReconnecting, dismiss, onReconnected, stop };
};

describe('reconnectingToastDelay', () => {
  it('is 10 s with motion on and 0 with motion off', () => {
    expect(RECONNECTING_TOAST_AFTER_MS).toBe(10_000);
    expect(reconnectingToastDelay('on')).toBe(10_000);
    expect(reconnectingToastDelay('off')).toBe(0);
  });
});

describe('watchConnection', () => {
  it('shows the toast after 10 s in reconnecting, hides it on connected and refetches', () => {
    vi.useFakeTimers();
    const { client, showReconnecting, dismiss, onReconnected } = watch(10_000);
    client.setConnection('reconnecting');
    vi.advanceTimersByTime(9_999);
    expect(showReconnecting).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(showReconnecting).toHaveBeenCalledTimes(1);
    client.setConnection('connected');
    expect(dismiss).toHaveBeenCalledWith('toast-1');
    expect(onReconnected).toHaveBeenCalledTimes(1);
  });

  it('shows no toast when the stream is back within 10 s', () => {
    vi.useFakeTimers();
    const { client, showReconnecting, onReconnected } = watch(10_000);
    client.setConnection('reconnecting');
    vi.advanceTimersByTime(5_000);
    client.setConnection('connected');
    vi.advanceTimersByTime(20_000);
    expect(showReconnecting).not.toHaveBeenCalled();
    expect(onReconnected).toHaveBeenCalledTimes(1);
  });

  it('shows the toast at once and starts no timer with delay 0', () => {
    vi.useFakeTimers();
    const { client, showReconnecting } = watch(0);
    client.setConnection('reconnecting');
    expect(showReconnecting).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts counting when it mounts in reconnecting', () => {
    vi.useFakeTimers();
    const { showReconnecting } = watch(10_000, 'reconnecting');
    vi.advanceTimersByTime(10_000);
    expect(showReconnecting).toHaveBeenCalledTimes(1);
  });

  it('does not refetch on a first connect and cleans up on stop', () => {
    vi.useFakeTimers();
    const { client, onReconnected, dismiss, stop } = watch(0, 'reconnecting');
    stop();
    expect(dismiss).toHaveBeenCalledWith('toast-1');
    client.setConnection('connected');
    expect(onReconnected).not.toHaveBeenCalled();
  });
});
