import { describe, expect, it, vi } from 'vite-plus/test';
import { EDGE_WIDTH, OPEN_DISTANCE, watchEdgeSwipe } from './edgeSwipe.ts';

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';

type Device = 'touch' | 'pen' | 'mouse';

const pointer = (
  type: PointerType,
  clientX: number,
  clientY: number,
  pointerId = 1,
  button = 0,
  pointerType: Device = 'touch',
) => Object.assign(new Event(type), { pointerId, pointerType, clientX, clientY, button });

const setup = (canStart?: () => boolean, device: Device = 'touch', edgeLeft?: () => number) => {
  const target = new EventTarget();
  const onSwipe = vi.fn();
  const stop = watchEdgeSwipe(target, {
    onSwipe,
    ...(canStart ? { canStart } : {}),
    ...(edgeLeft ? { edgeLeft } : {}),
  });
  const send = (type: PointerType, x: number, y: number, pointerId?: number, button?: number) =>
    target.dispatchEvent(pointer(type, x, y, pointerId, button, device));
  return { onSwipe, stop, send };
};

const dragFromEdge = (send: ReturnType<typeof setup>['send']) => {
  send('pointerdown', 4, 300);
  send('pointermove', 4 + OPEN_DISTANCE, 302);
  send('pointerup', 4 + OPEN_DISTANCE * 2, 302);
};

describe('watchEdgeSwipe', () => {
  it('opens on a swipe right that starts inside the left edge', () => {
    const { onSwipe, send } = setup();
    send('pointerdown', EDGE_WIDTH, 300);
    send('pointermove', EDGE_WIDTH + 20, 304);
    expect(onSwipe).not.toHaveBeenCalled();
    send('pointermove', EDGE_WIDTH + OPEN_DISTANCE, 306);
    send('pointermove', EDGE_WIDTH + OPEN_DISTANCE + 40, 306);
    send('pointerup', EDGE_WIDTH + OPEN_DISTANCE + 40, 306);
    expect(onSwipe).toHaveBeenCalledOnce();
  });

  it('opens when the release lands past the distance without moves', () => {
    const { onSwipe, send } = setup();
    send('pointerdown', 4, 300);
    send('pointerup', 4 + OPEN_DISTANCE, 300);
    expect(onSwipe).toHaveBeenCalledOnce();
  });

  it.each<Device>(['touch', 'pen'])('opens on a %s drag from the left edge', (device) => {
    const { onSwipe, send } = setup(undefined, device);
    dragFromEdge(send);
    expect(onSwipe).toHaveBeenCalledOnce();
  });

  it('ignores a mouse drag from the left edge', () => {
    const { onSwipe, send } = setup(undefined, 'mouse');
    dragFromEdge(send);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('ignores a swipe that starts past the edge', () => {
    const { onSwipe, send } = setup();
    send('pointerdown', EDGE_WIDTH + 1, 300);
    send('pointermove', EDGE_WIDTH + 1 + OPEN_DISTANCE * 3, 300);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('measures the edge from the left of an offset column', () => {
    const left = 420;
    const { onSwipe, send } = setup(undefined, 'touch', () => left);
    send('pointerdown', 4, 300);
    send('pointerup', 4 + OPEN_DISTANCE * 2, 300);
    send('pointerdown', left - 1, 300);
    send('pointerup', left - 1 + OPEN_DISTANCE * 2, 300);
    send('pointerdown', left + EDGE_WIDTH + 1, 300);
    send('pointerup', left + EDGE_WIDTH + 1 + OPEN_DISTANCE * 2, 300);
    expect(onSwipe).not.toHaveBeenCalled();
    send('pointerdown', left + EDGE_WIDTH, 300);
    send('pointerup', left + EDGE_WIDTH + OPEN_DISTANCE, 300);
    expect(onSwipe).toHaveBeenCalledOnce();
  });

  it('ignores a short swipe and a vertical scroll from the edge', () => {
    const { onSwipe, send } = setup();
    send('pointerdown', 8, 300);
    send('pointerup', 8 + OPEN_DISTANCE - 1, 300);
    send('pointerdown', 8, 300);
    send('pointermove', 20, 400);
    send('pointermove', 8 + OPEN_DISTANCE * 3, 400);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('ignores a cancelled pointer, another pointer and a secondary button', () => {
    const { onSwipe, send } = setup();
    send('pointerdown', 8, 300);
    send('pointercancel', 8, 300);
    send('pointermove', 8 + OPEN_DISTANCE * 2, 300);
    send('pointerdown', 8, 300, 1);
    send('pointermove', 8 + OPEN_DISTANCE * 2, 300, 2);
    send('pointerdown', 8, 300, 3, 2);
    send('pointermove', 8 + OPEN_DISTANCE * 2, 300, 3, 2);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('does not start when canStart refuses', () => {
    const { onSwipe, send } = setup(() => false);
    send('pointerdown', 8, 300);
    send('pointermove', 8 + OPEN_DISTANCE * 2, 300);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('stops listening after the cleanup', () => {
    const { onSwipe, send, stop } = setup();
    stop();
    send('pointerdown', 8, 300);
    send('pointermove', 8 + OPEN_DISTANCE * 2, 300);
    expect(onSwipe).not.toHaveBeenCalled();
  });
});
