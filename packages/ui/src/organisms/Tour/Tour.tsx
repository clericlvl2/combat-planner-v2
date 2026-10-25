import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { layout } from '../../layout.ts';
import { useMotion } from '../../provider.tsx';
import type { TourAction, TourCounter } from '../../tour/flow.ts';
import { placeTooltip, sameBox, spotOf, tooltipWidth } from './place.ts';
import type { Box, Placement, Spot } from './place.ts';
import classes from './Tour.module.css';

export interface TourView {
  key: string;
  target: string;
  press?: string;
  action: TourAction;
  title: string;
  body: string;
  counter: TourCounter | null;
  nextLabel: string;
  skippable: boolean;
}

export interface TourProps {
  step: TourView | null;
  onNext: () => void;
  onSkip: () => void;
}

interface Shown {
  view: TourView;
  spot: Spot;
  inSheet: boolean;
  width: number;
  current: boolean;
  stale: boolean;
  placement: Placement | null;
}

interface Leaving {
  view: TourView;
  placement: Placement;
}

const SETTLE_FRAMES = 2;
const SETTLE_LIMIT_MS = layout.sheetEnterMs + 60;
const SHEET = "[role='dialog']:not([data-tour-tooltip])";
const SHEET_CONTROLS =
  "button, input, textarea, select, output, [role='radio'], [role='button'], [role='checkbox']";
const PRESSABLE = "button, [role='menuitem']";

const toBox = (rect: DOMRect, origin: DOMRect): Box => ({
  left: rect.left - origin.left,
  top: rect.top - origin.top,
  width: rect.width,
  height: rect.height,
});

function findTarget(selector: string): HTMLElement | null {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return element.closest<HTMLElement>('[data-field]') ?? element;
}

function spotFor(element: HTMLElement, origin: DOMRect, area: Box): Spot {
  const radius = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
  return spotOf(toBox(element.getBoundingClientRect(), origin), radius, area);
}

function avoidedBoxes(element: HTMLElement, origin: DOMRect): Box[] {
  const sheet = element.closest(SHEET);
  const others = sheet
    ? [...sheet.querySelectorAll<HTMLElement>(SHEET_CONTROLS)].filter(
        (control) => !element.contains(control),
      )
    : [...document.querySelectorAll<HTMLElement>('[data-sheet-action]')];
  return others
    .map((control) => toBox(control.getBoundingClientRect(), origin))
    .filter((box) => box.width > 0 && box.height > 0);
}

function pressTarget(view: TourView): HTMLElement | null {
  if (view.press) return document.querySelector<HTMLElement>(view.press);
  const target = document.querySelector<HTMLElement>(view.target);
  if (!target) return null;
  return target.matches(PRESSABLE) ? target : target.querySelector<HTMLElement>('button, input');
}

function inputOf(view: TourView): HTMLElement | null {
  const target = document.querySelector<HTMLElement>(view.target);
  if (!target) return null;
  return target.matches('input, textarea') ? target : target.querySelector('input, textarea');
}

const stopPointer = (event: PointerEvent) => event.stopPropagation();

export function Tour({ step, onNext, onSkip }: TourProps) {
  const motion = useMotion();
  const reduced = useReducedMotion();
  const animated = motion !== 'off' && !reduced;
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [ringHidden, setRingHidden] = useState(false);
  const [moving, setMoving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [resized, setResized] = useState(0);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const sheetRef = useRef<Element | null>(null);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const stepKey = step?.key ?? null;
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const current = stepRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (run: () => void, ms: number) => {
      if (ms <= 0) run();
      else timers.push(setTimeout(run, ms));
    };
    if (current === null) {
      if (shownRef.current === null) return;
      setClosing(true);
      later(
        () => {
          setShown(null);
          setLeaving(null);
          setClosing(false);
          setRingHidden(false);
          sheetRef.current = null;
        },
        animated ? layout.sheetExitMs : 0,
      );
      return () => timers.forEach(clearTimeout);
    }
    setClosing(false);
    const previous = shownRef.current;
    if (previous !== null && previous.view.key !== current.key) {
      const { placement } = previous;
      if (placement !== null) {
        setLeaving({ view: previous.view, placement });
        later(() => setLeaving(null), animated ? layout.sheetExitMs : 0);
      }
      setShown({ ...previous, current: false, stale: false, placement: null });
    }
    let frame = 0;
    let last: Box | null = null;
    let still = 0;
    let foundAt: number | null = null;
    let scrolled = false;
    let settled = false;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const root = rootRef.current;
      const element = findTarget(current.target);
      if (!root || !element) return;
      const origin = root.getBoundingClientRect();
      const area: Box = { left: 0, top: 0, width: origin.width, height: origin.height };
      const spot = spotFor(element, origin, area);
      if (settled) {
        setShown((value) =>
          value && (!sameBox(value.spot, spot) || value.spot.radius !== spot.radius)
            ? { ...value, spot }
            : value,
        );
        return;
      }
      const box = toBox(element.getBoundingClientRect(), origin);
      if (!scrolled) {
        scrolled = true;
        if (box.top < 0 || box.top + box.height > area.height) {
          element.scrollIntoView({ block: 'center' });
          return;
        }
      }
      if (foundAt === null) {
        foundAt = now;
        const sheet = element.closest(SHEET);
        if (sheet !== null && sheet !== sheetRef.current && shownRef.current !== null) {
          setRingHidden(true);
        }
      }
      still = last !== null && sameBox(last, box) ? still + 1 : 0;
      last = box;
      if (still < SETTLE_FRAMES && now - foundAt < SETTLE_LIMIT_MS) return;
      settled = true;
      const sheet = element.closest(SHEET);
      const morph = shownRef.current !== null && (sheet === null || sheet === sheetRef.current);
      sheetRef.current = sheet;
      setLeaving((value) => (value?.view.key === current.key ? null : value));
      setShown({
        view: current,
        spot,
        inSheet: sheet !== null,
        width: tooltipWidth(area),
        current: true,
        stale: false,
        placement: null,
      });
      setRingHidden(false);
      if (morph && animated) {
        setMoving(true);
        later(() => setMoving(false), layout.sheetEnterMs);
      } else {
        setMoving(false);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [stepKey, animated]);

  useEffect(() => {
    const resize = () => setResized((count) => count + 1);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const live = step !== null && shown !== null && step.key === shown.view.key ? step : null;
  const text = live
    ? [live.title, live.body, live.nextLabel, live.counter?.current, live.counter?.total].join('|')
    : null;
  const liveRef = useRef(live);
  liveRef.current = live;
  const textRef = useRef(text);

  useEffect(() => {
    const changed = text !== null && textRef.current !== null && text !== textRef.current;
    textRef.current = text;
    if (resized === 0 && !changed) return;
    setShown((value) => {
      if (!value || !value.current) return value;
      return { ...value, view: liveRef.current ?? value.view, stale: true };
    });
  }, [resized, text]);

  useLayoutEffect(() => {
    if (shown === null || !shown.current || (shown.placement !== null && !shown.stale)) return;
    const measure = measureRef.current;
    const compact = compactRef.current;
    const root = rootRef.current;
    const element = findTarget(shown.view.target);
    if (!measure || !compact || !root) return;
    const origin = root.getBoundingClientRect();
    const area: Box = { left: 0, top: 0, width: origin.width, height: origin.height };
    const placement = placeTooltip({
      spot: shown.spot,
      area,
      full: measure.offsetHeight,
      compact: compact.offsetHeight,
      avoid: element ? avoidedBoxes(element, origin) : [],
      inSheet: shown.inSheet,
    });
    setShown({ ...shown, stale: false, placement });
  }, [shown]);

  const promoteTarget = step?.action === 'promote' ? step.target : null;

  useEffect(() => {
    if (promoteTarget === null) return;
    const listen = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
      const target = document.querySelector(promoteTarget);
      if (!target || !target.contains(input) || input.value.trim() === '') return;
      onNextRef.current();
    };
    document.addEventListener('input', listen);
    return () => document.removeEventListener('input', listen);
  }, [promoteTarget, stepKey]);

  if (step === null && shown === null) return null;

  const next = (view: TourView) => {
    if (view.action === 'click') pressTarget(view)?.click();
    else if (view.action === 'focus') inputOf(view)?.focus();
    else onNext();
  };

  const tooltips: { view: TourView; placement: Placement; state: 'shown' | 'leaving' }[] = [];
  if (leaving) tooltips.push({ ...leaving, state: 'leaving' });
  if (shown?.current && shown.placement && !ringHidden) {
    tooltips.push({ view: live ?? shown.view, placement: shown.placement, state: 'shown' });
  }

  const tooltip = (view: TourView, placement: Placement, state: 'shown' | 'leaving') => (
    <div
      key={view.key}
      className={classes.tooltip}
      role="dialog"
      aria-label={view.title}
      data-tour-tooltip=""
      data-state={state}
      data-side={placement.side}
      data-compact={placement.compact || undefined}
      inert={state === 'leaving' || undefined}
      aria-hidden={state === 'leaving' || undefined}
      style={{ left: placement.left, top: placement.top, width: placement.width }}
      onPointerDown={stopPointer}
    >
      <Content view={view} compact={placement.compact} onSkip={onSkip} onNext={() => next(view)} />
    </div>
  );

  const measuring = shown !== null && shown.current && (shown.placement === null || shown.stale);

  return (
    <div
      ref={rootRef}
      className={classes.root}
      data-state={closing ? 'closing' : shown === null ? 'settling' : 'shown'}
    >
      {shown ? (
        <div
          className={classes.ring}
          data-part="ring"
          data-moving={moving || undefined}
          data-hidden={ringHidden || undefined}
          style={{
            left: shown.spot.left,
            top: shown.spot.top,
            width: shown.spot.width,
            height: shown.spot.height,
            borderRadius: shown.spot.radius,
          }}
        />
      ) : null}
      {tooltips.map((item) => tooltip(item.view, item.placement, item.state))}
      {measuring
        ? ([false, true] as const).map((compact) => (
            <div
              key={String(compact)}
              ref={compact ? compactRef : measureRef}
              className={classes.tooltip}
              data-measure=""
              data-compact={compact || undefined}
              aria-hidden="true"
              inert
              style={{ left: 0, top: 0, width: shown.width }}
            >
              <Content
                view={live ?? shown.view}
                compact={compact}
                onSkip={onSkip}
                onNext={onSkip}
              />
            </div>
          ))
        : null}
    </div>
  );
}

interface ContentProps {
  view: TourView;
  compact: boolean;
  onSkip: () => void;
  onNext: () => void;
}

function Content({ view, compact, onSkip, onNext }: ContentProps) {
  const { t } = useTranslation('Tour');
  if (compact) {
    return (
      <>
        <p className={classes.title}>{view.title}</p>
        <Button variant="primary" size="S" onClick={onNext}>
          {view.nextLabel}
        </Button>
      </>
    );
  }
  return (
    <>
      <p className={classes.title}>{view.title}</p>
      <p className={classes.body}>{view.body}</p>
      <div className={classes.footer} data-single={!view.skippable || undefined}>
        {view.skippable ? (
          <Button variant="ghost" size="S" onClick={onSkip}>
            {t('skip')}
          </Button>
        ) : null}
        {view.counter ? (
          <span className={classes.counter}>
            {t('counter', { current: view.counter.current, total: view.counter.total })}
          </span>
        ) : null}
        <Button variant="primary" size="S" onClick={onNext}>
          {view.nextLabel}
        </Button>
      </div>
    </>
  );
}
