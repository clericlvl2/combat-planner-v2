import type { ConnectionState } from '@combat-planner/api/client';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vite-plus/test';
import { FakeApiClient } from '../../src/api/FakeApiClient.ts';
import { scenario } from '../../src/api/scenarios.ts';
import { shareConnectionWatch, watchConnection } from '../../src/hooks/connection.ts';

const callbacks = () => ({
  showReconnecting: vi.fn(() => 'toast-1'),
  dismiss: vi.fn(),
  onReconnected: vi.fn(),
});

const watch = (initial: ConnectionState = 'connected') => {
  const client = new FakeApiClient({ scenario: scenario({ connection: initial }) });
  const spies = callbacks();
  const stop = watchConnection({ connection: client.connection, ...spies });
  return { client, stop, ...spies };
};

describe('watchConnection', () => {
  it('shows the toast at once in reconnecting, hides it on connected and refetches', () => {
    vi.useFakeTimers();
    try {
      const { client, showReconnecting, dismiss, onReconnected } = watch();
      client.setConnection('reconnecting');
      expect(showReconnecting).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      client.setConnection('connected');
      expect(dismiss).toHaveBeenCalledWith('toast-1');
      expect(onReconnected).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the toast when it mounts in reconnecting', () => {
    const { showReconnecting } = watch('reconnecting');
    expect(showReconnecting).toHaveBeenCalledTimes(1);
  });

  it('does not refetch on a first connect from offline', () => {
    const { client, showReconnecting, onReconnected } = watch('offline');
    client.setConnection('connected');
    expect(onReconnected).not.toHaveBeenCalled();
    expect(showReconnecting).not.toHaveBeenCalled();
  });

  it('cleans up on stop', () => {
    const { client, onReconnected, dismiss, stop } = watch('reconnecting');
    stop();
    expect(dismiss).toHaveBeenCalledWith('toast-1');
    client.setConnection('connected');
    expect(onReconnected).not.toHaveBeenCalled();
  });
});

describe('shareConnectionWatch', () => {
  it('runs one watcher per QueryClient however many screens watch', () => {
    const client = new FakeApiClient({ scenario: scenario() });
    const queryClient = new QueryClient();
    const first = callbacks();
    const second = callbacks();
    const stopFirst = shareConnectionWatch(queryClient, {
      connection: client.connection,
      ...first,
    });
    const stopSecond = shareConnectionWatch(queryClient, {
      connection: client.connection,
      ...second,
    });
    client.setConnection('reconnecting');
    expect(
      first.showReconnecting.mock.calls.length + second.showReconnecting.mock.calls.length,
    ).toBe(1);
    client.setConnection('connected');
    expect(first.onReconnected.mock.calls.length + second.onReconnected.mock.calls.length).toBe(1);
    stopSecond();
    client.setConnection('reconnecting');
    expect(
      first.showReconnecting.mock.calls.length + second.showReconnecting.mock.calls.length,
    ).toBe(2);
    stopFirst();
    client.setConnection('connected');
    client.setConnection('reconnecting');
    expect(
      first.showReconnecting.mock.calls.length + second.showReconnecting.mock.calls.length,
    ).toBe(2);
  });

  it('keeps separate watchers for separate QueryClients', () => {
    const client = new FakeApiClient({ scenario: scenario() });
    const first = callbacks();
    const second = callbacks();
    shareConnectionWatch(new QueryClient(), { connection: client.connection, ...first });
    shareConnectionWatch(new QueryClient(), { connection: client.connection, ...second });
    client.setConnection('reconnecting');
    expect(first.showReconnecting).toHaveBeenCalledTimes(1);
    expect(second.showReconnecting).toHaveBeenCalledTimes(1);
  });
});
