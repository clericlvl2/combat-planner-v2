import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { layout } from '../../layout.ts';
import { sampleSpring, springAt } from '../../motion/spring.ts';
import type { SpringState } from '../../motion/spring.ts';
import { useMotion } from '../../provider.tsx';
import classes from './TurnBracket.module.css';

export interface TurnBracketProps {
  activeId: string | null;
}

interface Place {
  left: number;
  y: number;
  h: number;
}

interface Flight {
  animation: Animation;
  y: SpringState;
  h: SpringState;
}

interface Current {
  y: number;
  vy: number;
  h: number;
  vh: number;
}

const STEP = 1 / 120;

const cardOf = (parent: Element, activeId: string): HTMLElement | null => {
  for (const child of parent.children) {
    if (child instanceof HTMLElement && child.dataset.unitId === activeId) return child;
  }
  return null;
};

const secondsOf = (time: CSSNumberish | null): number =>
  typeof time === 'number' ? time / 1000 : 0;

export function TurnBracket({ activeId }: TurnBracketProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motion = useMotion();
  const reduced = useReducedMotion();
  const rest = useRef<Place | null>(null);
  const flight = useRef<Flight | null>(null);

  const land = () => {
    flight.current?.animation.cancel();
    flight.current = null;
  };

  const current = (place: Place): Current => {
    const moving = flight.current;
    if (!moving) return { y: place.y, vy: 0, h: place.h, vh: 0 };
    const t = secondsOf(moving.animation.currentTime);
    const y = springAt(layout.turnSpring, moving.y.x, moving.y.v, t);
    const h = springAt(layout.turnSpring, moving.h.x, moving.h.v, t);
    return { y: place.y + y.x, vy: y.v, h: place.h + h.x, vh: h.v };
  };

  const paint = (node: HTMLElement, place: Place) => {
    node.style.left = `${place.left}px`;
    node.style.height = `${place.h}px`;
    node.style.transform = `translateY(${place.y}px)`;
  };

  const measure = () => {
    const node = ref.current;
    const parent = node?.parentElement;
    if (!node || !parent) return;
    const card = activeId === null ? null : cardOf(parent, activeId);
    if (!card) {
      land();
      rest.current = null;
      node.hidden = true;
      return;
    }
    const lift = reduced ? 0 : layout.activeLift;
    const h = Math.round(card.offsetHeight * layout.turnBracket.height);
    const place: Place = {
      left: card.offsetLeft - layout.turnBracket.gap - layout.turnBracket.width,
      y: Math.round(card.offsetTop + (card.offsetHeight - h) / 2 - lift),
      h,
    };
    const previous = rest.current;
    node.hidden = false;
    if (
      previous &&
      previous.left === place.left &&
      previous.y === place.y &&
      previous.h === place.h
    ) {
      return;
    }
    rest.current = place;
    if (!previous || motion === 'off' || reduced) {
      land();
      paint(node, place);
      return;
    }
    const now = current(previous);
    land();
    const y = { x: now.y - place.y, v: now.vy };
    const height = { x: now.h - place.h, v: now.vh };
    const ys = sampleSpring(layout.turnSpring, y.x, y.v, { step: STEP });
    const hs = sampleSpring(layout.turnSpring, height.x, height.v, { step: STEP });
    const count = Math.max(ys.length, hs.length);
    paint(node, place);
    if (count < 2) return;
    const frames = Array.from({ length: count }, (_, index) => ({
      transform: `translateY(${(place.y + (ys[index]?.x ?? 0)).toFixed(2)}px)`,
      height: `${Math.max(0, place.h + (hs[index]?.x ?? 0)).toFixed(2)}px`,
    }));
    const animation = node.animate(frames, {
      duration: (count - 1) * STEP * 1000,
      easing: 'linear',
    });
    const moving: Flight = { animation, y, h: height };
    flight.current = moving;
    animation.onfinish = () => {
      if (flight.current === moving) flight.current = null;
    };
  };

  const measureRef = useRef(measure);
  measureRef.current = measure;

  useLayoutEffect(() => {
    measureRef.current();
  });

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => measureRef.current());
    observer.observe(parent);
    return () => {
      observer.disconnect();
      flight.current?.animation.cancel();
      flight.current = null;
    };
  }, []);

  return (
    <span
      ref={ref}
      className={classes.root}
      style={{ width: layout.turnBracket.width }}
      aria-hidden="true"
      data-turn-bracket=""
    />
  );
}
