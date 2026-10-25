import { useReducedMotion } from '@mantine/hooks';
import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { layout } from '../layout.ts';
import { sampleSpring } from '../motion/spring.ts';
import { useMotion } from '../provider.tsx';

export interface DragSample {
  y: number;
  t: number;
}

export interface DragRelease {
  offset: number;
  velocity: number;
  close: boolean;
}

export interface SheetDragTracker {
  move: (y: number, t: number) => number;
  release: (height: number) => DragRelease;
}

const VELOCITY_WINDOW_MS = 100;
const SLOP = 6;
const STEP = 1 / 120;

export function dragOffset(dy: number): number {
  if (dy >= 0) return dy;
  const band = layout.sheetRubberBand;
  return -band * (1 - Math.exp(dy / (band * 2)));
}

export function releaseVelocity(samples: readonly DragSample[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  const first = samples.find((sample) => last.t - sample.t <= VELOCITY_WINDOW_MS) ?? last;
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}

export function shouldClose(offset: number, velocity: number, height: number): boolean {
  if (offset <= 0) return false;
  return offset > height * layout.sheetCloseRatio || velocity > layout.sheetFlickVelocity;
}

export function trackSheetDrag(y0: number, t0: number): SheetDragTracker {
  const samples: DragSample[] = [{ y: y0, t: t0 }];
  let offset = 0;
  return {
    move: (y, t) => {
      samples.push({ y, t });
      const cutoff = t - VELOCITY_WINDOW_MS * 2;
      while (samples.length > 2 && (samples[0]?.t ?? t) < cutoff) samples.shift();
      offset = dragOffset(y - y0);
      return offset;
    },
    release: (height) => {
      const velocity = releaseVelocity(samples);
      return { offset, velocity, close: shouldClose(offset, velocity, height) };
    },
  };
}

export interface SheetDragOptions {
  scrimRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

interface Saved {
  transform: string;
  duration: string;
  opacity: string;
  scrimDuration: string;
}

interface Drag {
  tracker: SheetDragTracker;
  height: number;
  saved: Saved;
}

interface Gesture {
  pointerId: number;
  x0: number;
  y0: number;
  t0: number;
  fromContent: boolean;
  drag: Drag | null;
}

const zoneSelector = '[data-sheet-grip], [data-sheet-header]';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }));
}

export function useSheetDrag({ scrimRef, contentRef, onClose }: SheetDragOptions) {
  const motion = useMotion();
  const reduced = useReducedMotion();
  const animated = motion === 'on' && !reduced;
  const options = useRef({ scrimRef, contentRef, onClose, animated });
  options.current = { scrimRef, contentRef, onClose, animated };

  return useCallback((sheet: HTMLElement | null) => {
    if (!sheet) return;
    let gesture: Gesture | null = null;
    let settling: Animation[] = [];
    let resting: Saved | null = null;

    const settle = () => {
      for (const animation of settling) {
        animation.onfinish = null;
        animation.cancel();
      }
      settling = [];
    };

    const paint = (drag: Drag, offset: number) => {
      sheet.style.transform = `translateY(${offset}px)`;
      const scrim = options.current.scrimRef.current;
      if (scrim) scrim.style.opacity = String(clamp(1 - Math.max(0, offset) / drag.height));
    };

    const begin = (event: PointerEvent, current: Gesture): Drag => {
      settle();
      const scrim = options.current.scrimRef.current;
      resting ??= {
        transform: sheet.style.transform,
        duration: sheet.style.transitionDuration,
        opacity: scrim?.style.opacity ?? '',
        scrimDuration: scrim?.style.transitionDuration ?? '',
      };
      const drag: Drag = {
        tracker: trackSheetDrag(current.y0, current.t0),
        height: sheet.getBoundingClientRect().height,
        saved: resting,
      };
      sheet.style.transitionDuration = '0ms';
      if (scrim) scrim.style.transitionDuration = '0ms';
      sheet.setAttribute('data-dragging', '');
      if (event.isTrusted) sheet.setPointerCapture(event.pointerId);
      return drag;
    };

    const restoreDurations = (saved: Saved) => {
      resting = null;
      sheet.style.transitionDuration = saved.duration;
      const scrim = options.current.scrimRef.current;
      if (scrim) scrim.style.transitionDuration = saved.scrimDuration;
    };

    const springBack = (drag: Drag, release: DragRelease) => {
      const { saved, height } = drag;
      const scrim = options.current.scrimRef.current;
      sheet.style.transform = saved.transform;
      if (scrim) scrim.style.opacity = saved.opacity;
      if (!options.current.animated || release.offset === 0) {
        restoreDurations(saved);
        return;
      }
      const samples = sampleSpring(layout.turnSpring, release.offset, release.velocity * 1000, {
        step: STEP,
      });
      if (samples.length < 2) {
        restoreDurations(saved);
        return;
      }
      const timing = { duration: (samples.length - 1) * STEP * 1000, easing: 'linear' };
      const moving = sheet.animate(
        samples.map((sample) => ({ transform: `translateY(${sample.x.toFixed(2)}px)` })),
        timing,
      );
      settling = [moving];
      if (scrim) {
        settling.push(
          scrim.animate(
            samples.map((sample) => ({
              opacity: clamp(1 - Math.max(0, sample.x) / height),
            })),
            timing,
          ),
        );
      }
      moving.onfinish = () => {
        settling = [];
        restoreDurations(saved);
      };
    };

    const finish = (event: PointerEvent, cancelled: boolean) => {
      const current = gesture;
      if (!current || event.pointerId !== current.pointerId) return;
      gesture = null;
      const drag = current.drag;
      if (!drag) return;
      sheet.removeAttribute('data-dragging');
      if (sheet.hasPointerCapture(event.pointerId)) sheet.releasePointerCapture(event.pointerId);
      swallowNextClick();
      const release = drag.tracker.release(drag.height);
      if (!cancelled && release.close) {
        restoreDurations(drag.saved);
        options.current.onClose();
        return;
      }
      springBack(drag, release);
    };

    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button > 0 || gesture) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const content = options.current.contentRef.current;
      const inZone = target.closest(zoneSelector) !== null;
      const fromContent = !inZone && content !== null && content.contains(target);
      if (!inZone && !fromContent) return;
      if (fromContent && content.scrollTop > 0) return;
      gesture = {
        pointerId: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        t0: event.timeStamp,
        fromContent,
        drag: null,
      };
    };

    const move = (event: PointerEvent) => {
      const current = gesture;
      if (!current || event.pointerId !== current.pointerId) return;
      const dx = event.clientX - current.x0;
      const dy = event.clientY - current.y0;
      if (!current.drag) {
        if (current.fromContent && dy < 0) {
          gesture = null;
          return;
        }
        if (Math.hypot(dx, dy) < SLOP) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          gesture = null;
          return;
        }
        current.drag = begin(event, current);
      }
      paint(current.drag, current.drag.tracker.move(event.clientY, event.timeStamp));
    };

    const touchMove = (event: TouchEvent) => {
      if (gesture?.fromContent && event.cancelable) event.preventDefault();
    };

    const up = (event: PointerEvent) => finish(event, false);
    const cancel = (event: PointerEvent) => finish(event, true);

    sheet.addEventListener('pointerdown', down);
    sheet.addEventListener('pointermove', move);
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', cancel);
    sheet.addEventListener('touchmove', touchMove, { passive: false });
    return () => {
      settle();
      sheet.removeEventListener('pointerdown', down);
      sheet.removeEventListener('pointermove', move);
      sheet.removeEventListener('pointerup', up);
      sheet.removeEventListener('pointercancel', cancel);
      sheet.removeEventListener('touchmove', touchMove);
    };
  }, []);
}
