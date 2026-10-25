import { describe, expect, it } from 'vite-plus/test';
import { createSendQueue } from '../../src/hooks/sendQueue.ts';
import { flush } from './helpers.ts';

const deferred = () => {
  let resolve: (value: string) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<string>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe('createSendQueue', () => {
  it('runs each send after the previous one settles', async () => {
    const enqueue = createSendQueue();
    const started: string[] = [];
    const first = deferred();
    const one = enqueue(() => {
      started.push('one');
      return first.promise;
    });
    const two = enqueue(async () => {
      started.push('two');
      return 'two';
    });
    await flush();
    expect(started).toEqual(['one']);
    first.resolve('one');
    await expect(one).resolves.toBe('one');
    await expect(two).resolves.toBe('two');
    expect(started).toEqual(['one', 'two']);
  });

  it('a release lets the next send start while the previous waits', async () => {
    const enqueue = createSendQueue();
    const started: string[] = [];
    const first = deferred();
    const one = enqueue((release) => {
      started.push('one');
      release();
      return first.promise;
    });
    const two = enqueue(async () => {
      started.push('two');
      return 'two';
    });
    await expect(two).resolves.toBe('two');
    expect(started).toEqual(['one', 'two']);
    first.resolve('one');
    await expect(one).resolves.toBe('one');
  });

  it('a rejected send does not block the next', async () => {
    const enqueue = createSendQueue();
    const one = enqueue(() => Promise.reject(new Error('refused')));
    const two = enqueue(async () => 'two');
    await expect(one).rejects.toThrow('refused');
    await expect(two).resolves.toBe('two');
  });
});
