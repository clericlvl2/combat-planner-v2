export type Enqueue = <T>(run: (release: () => void) => Promise<T>) => Promise<T>;

export function createSendQueue(): Enqueue {
  let queue: Promise<unknown> = Promise.resolve();
  return <T>(run: (release: () => void) => Promise<T>): Promise<T> => {
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const step = () => run(release);
    const next = queue.then(step, step);
    queue = Promise.race([next, released]).catch(() => {});
    return next;
  };
}
