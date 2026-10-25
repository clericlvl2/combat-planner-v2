import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { HP_STEP_TARGET } from '../../tour/flow.ts';
import { NumpadSheet } from '../NumpadSheet/NumpadSheet.tsx';
import { overlaps } from './place.ts';
import { Tour } from './Tour.tsx';
import type { TourView } from './Tour.tsx';

type Scene = 'buttons' | 'numpad';

interface TourCellProps {
  scene?: Scene;
  onTarget?: (name: string) => void;
  onSkip?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const placed = (style: CSSProperties): CSSProperties => ({ position: 'absolute', ...style });

function TourCell({ scene = 'buttons', onTarget, onSkip }: TourCellProps) {
  const { t } = useTranslation('Tour');
  const [index, setIndex] = useState<number | null>(0);
  const [numpadOpen, setNumpadOpen] = useState(true);
  const view = (key: string, target: string, current: number): TourView => ({
    key,
    target,
    action: 'click',
    title: t(`${key}Title`),
    body: t(`${key}Body`),
    counter: { current, total: 8 },
    nextLabel: t('next'),
    skippable: true,
  });
  const steps: TourView[] =
    scene === 'numpad'
      ? [{ ...view('hpApply', HP_STEP_TARGET, 6), action: 'dismiss', nextLabel: t('gotIt') }]
      : [
          view('start', "[data-tour='fixture-start']", 2),
          view('nextTurn', "[data-tour='fixture-next']", 3),
        ];
  const step = index === null ? null : (steps[index] ?? null);
  const press = (name: string, next: number | null) => {
    onTarget?.(name);
    setIndex(next);
  };
  return (
    <div style={stage}>
      {scene === 'buttons' ? (
        <>
          <div style={placed({ top: 96, left: 16 })}>
            <Button variant="secondary" data-tour="fixture-start" onClick={() => press('start', 1)}>
              {t('startTitle')}
            </Button>
          </div>
          <div style={placed({ bottom: 48, right: 16 })}>
            <Button variant="primary" data-tour="fixture-next" onClick={() => press('next', null)}>
              {t('nextTurnTitle')}
            </Button>
          </div>
        </>
      ) : (
        <NumpadSheet
          opened={numpadOpen}
          name="Tarin"
          role="hero"
          initiative={15}
          hp={30}
          maxHp={30}
          tempHp={0}
          history={[]}
          onApply={() => undefined}
          onClose={() => {
            onTarget?.('close');
            setNumpadOpen(false);
          }}
        />
      )}
      <Tour
        step={step}
        onNext={() => setIndex((current) => (current === null ? null : current + 1))}
        onSkip={() => {
          setIndex(null);
          onSkip?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/Tour',
  component: TourCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onTarget: fn(), onSkip: fn() },
});

const ringOf = (root: HTMLElement): HTMLElement => {
  const ring = root.querySelector<HTMLElement>('[data-part="ring"]');
  if (!ring) throw new Error('tour ring is missing');
  return ring;
};

const surrounds = (outer: DOMRect, inner: DOMRect): boolean =>
  outer.left <= inner.left &&
  outer.top <= inner.top &&
  outer.right >= inner.right &&
  outer.bottom >= inner.bottom;

const targetOf = (root: HTMLElement, name: string): HTMLElement => {
  const target = root.querySelector<HTMLElement>(`[data-tour='${name}']`);
  if (!target) throw new Error(`target ${name} is missing`);
  return target;
};

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('startTitle') });
    await expect(within(tooltip).getByText(t('startBody'))).toBeVisible();
    await expect(within(tooltip).getByText(t('counter', { current: 2, total: 8 }))).toBeVisible();
    await expect(within(tooltip).getByRole('button', { name: t('skip') })).toBeVisible();
    const target = targetOf(canvasElement, 'fixture-start');
    await waitFor(() =>
      expect(
        surrounds(ringOf(canvasElement).getBoundingClientRect(), target.getBoundingClientRect()),
      ).toBe(true),
    );
    await expect(
      overlaps(tooltip.getBoundingClientRect(), ringOf(canvasElement).getBoundingClientRect()),
    ).toBe(false);
    await userEvent.click(within(tooltip).getByRole('button', { name: t('next') }));
    await expect(args.onTarget).toHaveBeenCalledWith('start');
    await expect(await canvas.findByRole('dialog', { name: t('nextTurnTitle') })).toBeVisible();
  },
});

export const HpStep = meta.story({
  name: 'HP Step',
  tags: ['visual'],
  args: { scene: 'numpad' },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('hpApplyTitle') });
    const ring = ringOf(canvasElement).getBoundingClientRect();
    for (const name of ['hp-keys', 'hp-damage', 'hp-heal']) {
      await expect(surrounds(ring, targetOf(canvasElement, name).getBoundingClientRect())).toBe(
        true,
      );
    }
    const keys = targetOf(canvasElement, 'hp-keys').getBoundingClientRect();
    const heal = targetOf(canvasElement, 'hp-heal').getBoundingClientRect();
    await expect(ring.top).toBeCloseTo(keys.top - 4, 0);
    await expect(ring.bottom).toBeCloseTo(heal.bottom + 4, 0);
    await expect(overlaps(tooltip.getBoundingClientRect(), ring)).toBe(false);
    await userEvent.click(within(tooltip).getByRole('button', { name: t('gotIt') }));
    await expect(args.onTarget).toHaveBeenCalledWith('close');
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Tarin' })).toBeNull());
  },
});

export const MorphsBetweenTargets = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('startTitle') });
    await waitFor(() => expect(getComputedStyle(tooltip).opacity).toBe('1'));
    await userEvent.click(within(tooltip).getByRole('button', { name: t('next') }));
    const ring = ringOf(canvasElement);
    await waitFor(() => expect(ring).toHaveAttribute('data-moving'));
    const style = getComputedStyle(ring);
    await expect(style.transitionProperty).toContain('left');
    await expect(style.transitionDuration).toContain('0.24s');
    const target = targetOf(canvasElement, 'fixture-next');
    await waitFor(() => expect(ring).not.toHaveAttribute('data-moving'));
    await waitFor(() =>
      expect(surrounds(ring.getBoundingClientRect(), target.getBoundingClientRect())).toBe(true),
    );
  },
});

export const StillWithoutMotion = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('startTitle') });
    await userEvent.click(within(tooltip).getByRole('button', { name: t('next') }));
    await canvas.findByRole('dialog', { name: t('nextTurnTitle') });
    const ring = ringOf(canvasElement);
    await expect(ring).not.toHaveAttribute('data-moving');
    await expect(getComputedStyle(ring).transitionDuration).toBe('0s');
    const target = targetOf(canvasElement, 'fixture-next');
    await expect(surrounds(ring.getBoundingClientRect(), target.getBoundingClientRect())).toBe(
      true,
    );
  },
});

export const SkipEnds = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('startTitle') });
    await userEvent.click(within(tooltip).getByRole('button', { name: t('skip') }));
    await expect(args.onSkip).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvasElement.querySelector('[data-part="ring"]')).toBeNull());
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});
