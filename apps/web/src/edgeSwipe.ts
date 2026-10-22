export const EDGE_WIDTH = 24;
export const OPEN_DISTANCE = 48;
export const VERTICAL_SLOP = 16;

export type SwipeEvent = Pick<
  PointerEvent,
  'pointerId' | 'pointerType' | 'clientX' | 'clientY' | 'button' | 'target'
>;

const SWIPE_POINTERS: ReadonlySet<string> = new Set(['touch', 'pen']);

export interface EdgeSwipeOptions {
  onSwipe: () => void;
  canStart?: (event: SwipeEvent) => boolean;
  edgeLeft?: () => number;
}

const isPointer = (event: Event): event is Event & SwipeEvent =>
  'pointerId' in event &&
  'pointerType' in event &&
  'clientX' in event &&
  'clientY' in event &&
  'button' in event;

interface Start {
  pointerId: number;
  x: number;
  y: number;
}

export function watchEdgeSwipe(
  target: EventTarget,
  { onSwipe, canStart = () => true, edgeLeft = () => 0 }: EdgeSwipeOptions,
): () => void {
  let start: Start | null = null;

  const down = (pointer: Event) => {
    start = null;
    if (!isPointer(pointer) || !SWIPE_POINTERS.has(pointer.pointerType) || pointer.button > 0)
      return;
    const offset = pointer.clientX - edgeLeft();
    if (offset < 0 || offset > EDGE_WIDTH || !canStart(pointer)) return;
    start = { pointerId: pointer.pointerId, x: pointer.clientX, y: pointer.clientY };
  };

  const track = (pointer: Event, last: boolean) => {
    if (!isPointer(pointer) || start === null || pointer.pointerId !== start.pointerId) return;
    const dx = pointer.clientX - start.x;
    const dy = Math.abs(pointer.clientY - start.y);
    if (dx >= OPEN_DISTANCE && dy < dx) {
      start = null;
      onSwipe();
      return;
    }
    if (last || (dy > VERTICAL_SLOP && dy > dx)) start = null;
  };

  const move = (event: Event) => track(event, false);
  const up = (event: Event) => track(event, true);
  const cancel = () => {
    start = null;
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', cancel);
  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', cancel);
  };
}
