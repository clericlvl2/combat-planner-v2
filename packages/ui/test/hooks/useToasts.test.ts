import { ApiError } from '@combat-planner/api/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createToastStore,
  durationOf,
  errorToast,
  pushToast,
  removeToast,
  startsTimer,
  toastStoreOf,
} from '../../src/hooks/toasts.ts';
import type { ToastItem } from '../../src/hooks/toasts.ts';

const t = (key: string) => `t:${key}`;
const action = { label: 'Undo', onAction: () => {} };
const item = (id: string): ToastItem => ({ id, message: id, kind: 'neutral', duration: 4000 });

afterEach(() => {
  vi.useRealTimers();
});

describe('toast durations', () => {
  it('is 4 s plain, 8 s with an action, 5 s for an error without one, and keeps an explicit null or number', () => {
    expect(durationOf({ message: 'Link copied' })).toBe(4000);
    expect(durationOf({ message: 'Goblin deleted', action })).toBe(8000);
    expect(durationOf({ message: 'Failed', kind: 'error' })).toBe(5000);
    expect(durationOf({ message: 'Failed', kind: 'error', action })).toBe(8000);
    expect(durationOf({ message: 'Reconnecting…', duration: null })).toBeNull();
    expect(durationOf({ message: 'x', action, duration: 1500 })).toBe(1500);
  });

  it('starts a timer only for a finite duration with motion on', () => {
    expect(startsTimer(4000, 'on')).toBe(true);
    expect(startsTimer(4000, 'off')).toBe(false);
    expect(startsTimer(null, 'on')).toBe(false);
  });
});

describe('toast stack', () => {
  it('puts the newest on top and removes by id', () => {
    const stack = pushToast(pushToast([], item('first')), item('second'));
    expect(stack.map((toast) => toast.id)).toEqual(['second', 'first']);
    expect(removeToast(stack, 'second').map((toast) => toast.id)).toEqual(['first']);
  });
});

describe('createToastStore clear', () => {
  it('dismisses every toast, settles its onDismiss and starts a new generation', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const dismissed = vi.fn();
    store.show({ message: 'Couldn’t reach the server', action, onDismiss: dismissed }, 'on');
    store.show({ message: 'Ссылка скопирована' }, 'on');
    expect(store.generation()).toBe(0);
    store.clear();
    expect(store.toasts()).toEqual([]);
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(store.generation()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never runs the action of a toast that is no longer shown', () => {
    const store = createToastStore();
    const retry = vi.fn();
    store.show(
      { message: 'Couldn’t reach the server', action: { label: 'Retry', onAction: retry } },
      'off',
    );
    const [shown] = store.toasts();
    shown?.action?.onAction();
    expect(retry).toHaveBeenCalledTimes(1);
    store.clear();
    shown?.action?.onAction();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('createToastStore', () => {
  it('auto-hides after 4 s and 8 s with an action, newest first', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.show({ message: 'Link copied' }, 'on');
    store.show({ message: 'Goblin deleted', action }, 'on');
    expect(store.toasts().map((toast) => toast.message)).toEqual(['Goblin deleted', 'Link copied']);
    vi.advanceTimersByTime(4000);
    expect(store.toasts().map((toast) => toast.message)).toEqual(['Goblin deleted']);
    vi.advanceTimersByTime(4000);
    expect(store.toasts()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('gives every item a kind, neutral by default', () => {
    const store = createToastStore();
    store.show({ message: 'Link copied', kind: 'success' }, 'off');
    store.show({ message: 'Ogre removed' }, 'off');
    expect(store.toasts().map(({ message, kind }) => ({ message, kind }))).toEqual([
      { message: 'Ogre removed', kind: 'neutral' },
      { message: 'Link copied', kind: 'success' },
    ]);
  });

  it('calls onDismiss once when the toast is dismissed or times out', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const dismissed = vi.fn();
    const timedOut = vi.fn();
    const id = store.show({ message: 'Retry me', onDismiss: dismissed, duration: null }, 'on');
    store.show({ message: 'Gone soon', onDismiss: timedOut }, 'on');
    store.dismiss(id);
    store.dismiss(id);
    expect(dismissed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(4000);
    expect(timedOut).toHaveBeenCalledTimes(1);
  });

  it('keeps a null-duration toast until dismissed', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const id = store.show({ message: 'Reconnecting…', duration: null }, 'on');
    vi.advanceTimersByTime(60_000);
    expect(store.toasts()).toHaveLength(1);
    store.dismiss(id);
    expect(store.toasts()).toEqual([]);
  });

  it('starts no timer with motion off', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    store.show({ message: 'Link copied' }, 'off');
    store.show({ message: 'Goblin deleted', action }, 'off');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(store.toasts()).toHaveLength(2);
  });

  it('dismiss clears the pending timer', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const id = store.show({ message: 'Link copied' }, 'on');
    store.dismiss(id);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is shared per QueryClient', () => {
    const queryClient = new QueryClient();
    expect(toastStoreOf(queryClient)).toBe(toastStoreOf(queryClient));
    expect(toastStoreOf(new QueryClient())).not.toBe(toastStoreOf(queryClient));
  });
});

describe('errorToast', () => {
  it('maps network to the caller’s unreachable message with a Retry that calls back', () => {
    const retry = vi.fn();
    const network = new ApiError({ status: 0, code: 'network' });
    expect(errorToast(network, t, 'serverUnreachableNothingChanged', retry)).toMatchObject({
      message: 't:serverUnreachableNothingChanged',
    });
    const toast = errorToast(network, t, 'serverUnreachable', retry);
    expect(toast).toMatchObject({
      message: 't:serverUnreachable',
      kind: 'error',
      action: { label: 't:retry' },
    });
    toast?.action?.onAction();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('maps version to combatChanged without a button', () => {
    expect(
      errorToast(new ApiError({ status: 409, code: 'version' }), t, 'serverUnreachable', () => {}),
    ).toEqual({
      message: 't:combatChanged',
      kind: 'warning',
    });
  });

  it('maps limit to "limit reached" or the given cap copy', () => {
    const limit = new ApiError({ status: 422, code: 'limit' });
    expect(errorToast(limit, t, 'serverUnreachable', () => {})).toEqual({
      message: 't:limitReached',
      kind: 'warning',
    });
    expect(
      errorToast(limit, t, 'serverUnreachable', () => {}, 'This combat already has 99 units'),
    ).toEqual({
      message: 'This combat already has 99 units',
      kind: 'warning',
    });
  });

  it('shows nothing for other errors', () => {
    expect(
      errorToast(
        new ApiError({ status: 403, code: 'forbidden' }),
        t,
        'serverUnreachable',
        () => {},
      ),
    ).toBeNull();
    expect(errorToast(new Error('boom'), t, 'serverUnreachable', () => {})).toBeNull();
  });
});
