import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { keepScreenAwake, useWakeLock } from '../../src/hooks/useWakeLock.ts';
import type { PageVisibility } from '../../src/hooks/useWakeLock.ts';

const effects = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));

vi.mock('react', () => ({
  useEffect: (effect: () => (() => void) | undefined) => {
    const cleanup = effect();
    if (cleanup) effects.cleanups.push(cleanup);
  },
}));

interface StubSentinel {
  released: boolean;
  release: ReturnType<typeof vi.fn>;
}

const sentinel = (): StubSentinel => {
  const stub: StubSentinel = {
    released: false,
    release: vi.fn(() => {
      stub.released = true;
      return Promise.resolve();
    }),
  };
  return stub;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

class FakePage extends EventTarget implements PageVisibility {
  visibilityState: DocumentVisibilityState = 'visible';

  show(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

const lockOf = (result: () => Promise<unknown>) => ({ request: vi.fn(result) });

beforeEach(() => {
  effects.cleanups = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('keepScreenAwake', () => {
  it('requests the screen lock once while visible', async () => {
    const held = sentinel();
    const lock = lockOf(() => Promise.resolve(held));
    const page = new FakePage();
    keepScreenAwake(lock as never, page);
    await settle();
    page.show('visible');
    await settle();
    expect(lock.request).toHaveBeenCalledTimes(1);
    expect(lock.request).toHaveBeenCalledWith('screen');
  });

  it('requests nothing while hidden', async () => {
    const lock = lockOf(() => Promise.resolve(sentinel()));
    const page = new FakePage();
    page.visibilityState = 'hidden';
    keepScreenAwake(lock as never, page);
    await settle();
    expect(lock.request).not.toHaveBeenCalled();
  });

  it('requests again when the page returns after the lock was dropped', async () => {
    const first = sentinel();
    const lock = lockOf(() => Promise.resolve(first));
    const page = new FakePage();
    keepScreenAwake(lock as never, page);
    await settle();
    first.released = true;
    page.show('hidden');
    page.show('visible');
    await settle();
    expect(lock.request).toHaveBeenCalledTimes(2);
  });

  it('sends no second request while one is in flight', async () => {
    const lock = lockOf(() => new Promise(() => undefined));
    const page = new FakePage();
    keepScreenAwake(lock as never, page);
    page.show('visible');
    await settle();
    expect(lock.request).toHaveBeenCalledTimes(1);
  });

  it('releases the lock and stops listening when stopped', async () => {
    const held = sentinel();
    const lock = lockOf(() => Promise.resolve(held));
    const page = new FakePage();
    const remove = vi.spyOn(page, 'removeEventListener');
    const stop = keepScreenAwake(lock as never, page);
    await settle();
    stop();
    expect(held.release).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    held.released = true;
    page.show('visible');
    await settle();
    expect(lock.request).toHaveBeenCalledTimes(1);
  });

  it('releases a lock granted after the stop', async () => {
    const held = sentinel();
    let grant: (value: StubSentinel) => void = () => {};
    const lock = lockOf(() => new Promise((resolve) => (grant = resolve)));
    const stop = keepScreenAwake(lock as never, new FakePage());
    stop();
    grant(held);
    await settle();
    expect(held.release).toHaveBeenCalledTimes(1);
  });

  it('swallows a refused request', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const lock = lockOf(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
      keepScreenAwake(lock as never, new FakePage());
      await settle();
      await settle();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});

describe('useWakeLock', () => {
  it('holds the lock while active and releases it on cleanup', async () => {
    const held = sentinel();
    const lock = lockOf(() => Promise.resolve(held));
    vi.stubGlobal('navigator', { wakeLock: lock });
    vi.stubGlobal('document', new FakePage());
    useWakeLock(true);
    await settle();
    expect(lock.request).toHaveBeenCalledWith('screen');
    for (const cleanup of effects.cleanups) cleanup();
    expect(held.release).toHaveBeenCalledTimes(1);
  });

  it('requests nothing while inactive', () => {
    const lock = lockOf(() => Promise.resolve(sentinel()));
    vi.stubGlobal('navigator', { wakeLock: lock });
    vi.stubGlobal('document', new FakePage());
    useWakeLock(false);
    expect(lock.request).not.toHaveBeenCalled();
    expect(effects.cleanups).toEqual([]);
  });

  it('does nothing where the browser has no wake lock', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', new FakePage());
    expect(() => useWakeLock(true)).not.toThrow();
    expect(effects.cleanups).toEqual([]);
  });
});
