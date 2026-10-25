import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { layout } from '../../layout.ts';
import { TurnBracket } from './TurnBracket.tsx';

interface TurnBracketSampleProps {
  heights: number[];
  active: number;
}

const cardStyle = (height: number, active: boolean) =>
  ({
    display: 'flex',
    flex: 'none',
    alignItems: 'center',
    height,
    padding: '0 12px',
    border: '1px solid var(--cp-color-border)',
    borderRadius: 16,
    background: active ? 'var(--cp-color-accent)' : 'var(--cp-color-surface)',
    color: 'var(--cp-color-ink)',
    font: 'inherit',
    fontFamily: 'var(--cp-font-ui)',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'left',
    transform: active ? `translateY(-${layout.activeLift}px)` : undefined,
    cursor: 'pointer',
  }) as const;

function TurnBracketSample({ heights, active: initial }: TurnBracketSampleProps) {
  const [active, setActive] = useState(initial);
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: layout.listGap,
        padding: `${layout.listInset.top}px ${layout.contentEdge}px`,
        background: 'var(--cp-color-soft)',
      }}
    >
      <TurnBracket activeId={String(active)} />
      {heights.map((height, index) => (
        <button
          key={index}
          type="button"
          data-unit-id={String(index)}
          aria-pressed={index === active}
          style={cardStyle(height, index === active)}
          onClick={() => setActive(index)}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/TurnBracket',
  component: TurnBracketSample,
  args: { heights: [64, 88, 64, 120, 64], active: 1 },
});

export const Default = meta.story({
  tags: ['visual'],
  parameters: { motion: 'on' },
});

export const JumpsWithMotionOff = meta.story({
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('[data-turn-bracket]');
    if (!(bar instanceof HTMLElement)) throw new Error('no bracket');
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
    const card = within(canvasElement).getByRole('button', { name: '4' });
    await userEvent.click(card);
    await expect(bar.getAnimations()).toHaveLength(0);
    const box = bar.getBoundingClientRect();
    const target = card.getBoundingClientRect();
    await expect(
      Math.abs(box.top + box.height / 2 - (target.top + target.height / 2)),
    ).toBeLessThanOrEqual(1);
    await expect(box.height).toBeCloseTo(target.height * layout.turnBracket.height, 0);
    await expect(target.left - box.right).toBeCloseTo(layout.turnBracket.gap, 0);
    await expect(box.width).toBe(layout.turnBracket.width);
  },
});
