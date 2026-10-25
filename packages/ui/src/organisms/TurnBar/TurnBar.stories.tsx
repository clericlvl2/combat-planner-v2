import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { TurnBar } from './TurnBar.tsx';
import type { TurnBarProps } from './TurnBar.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { base } from '../../theme.ts';

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

type ReasonKey = 'everyUnitDisabled' | 'lastRound' | 'addUnitFirst';

interface TurnBarCellProps extends Omit<TurnBarProps, 'reason'> {
  reasonKey?: ReasonKey;
}

function TurnBarCell({ reasonKey, ...props }: TurnBarCellProps) {
  const { t } = useTranslation('TurnBar');
  const reason = reasonKey ? t(reasonKey, { round: LIMITS.round.max }) : undefined;
  return <TurnBar {...props} reason={reason} />;
}

const meta = preview.meta({
  title: 'Organisms/TurnBar',
  component: TurnBarCell,
  parameters: { phoneFrame: true },
  args: { mode: 'next', nextName: 'Brother Tomas', onClick: fn() },
});

export const NextTurn = meta.story({
  tags: ['visual'],
  args: { mode: 'next', nextName: 'Brother Tomas' },
});

export const SetupStartCombat = meta.story({
  tags: ['visual'],
  args: { mode: 'start' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('startCombat')),
    });
    await expect(button).toBeEnabled();
    await expect(canvas.getByText(t('rollsMissingInitiative'))).toBeVisible();
  },
});

export const BlockedAllUnitsDisabled = meta.story({
  args: { mode: 'next', disabled: true, reasonKey: 'everyUnitDisabled', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('nextTurn')),
    });
    await expect(button).toBeDisabled();
    await expect(canvas.getByText(t('everyUnitDisabled'))).toBeVisible();
    await expect(canvas.queryByText('Brother Tomas')).toBeNull();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const BlockedLastRound = meta.story({
  tags: ['visual'],
  args: { mode: 'next', disabled: true, reasonKey: 'lastRound' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    await expect(
      canvas.getByRole('button', { name: (label: string) => label.includes(t('nextTurn')) }),
    ).toBeDisabled();
    await expect(canvas.getByText(t('lastRound', { round: LIMITS.round.max }))).toBeVisible();
  },
});

export const LongNextName = meta.story({
  tags: ['visual'],
  args: { mode: 'next', nextName: 'Капитан стражи переправы Святослав Огнев' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    await document.fonts.ready;
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('nextTurn')),
    });
    const secondary = canvas.getByText('Капитан стражи переправы Святослав Огнев');
    await expect(getComputedStyle(secondary).textOverflow).toBe('ellipsis');
    await expect(secondary.scrollWidth).toBeGreaterThan(secondary.clientWidth);
    await expect(secondary.getBoundingClientRect().width).toBeLessThanOrEqual(
      button.getBoundingClientRect().width - 32,
    );
    await expect(button.getBoundingClientRect().height).toBe(58);
  },
});

export const BlockedNoUnits = meta.story({
  args: { mode: 'start', disabled: true, reasonKey: 'addUnitFirst', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('startCombat')),
    });
    await expect(button).toBeDisabled();
    await expect(canvas.getByText(t('addUnitFirst'))).toBeVisible();
    await expect(canvas.queryByText(t('rollsMissingInitiative'))).toBeNull();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const NextTurnWithoutName = meta.story({
  args: { mode: 'next', nextName: undefined },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('nextTurn')),
    });
    await expect(button).toBeEnabled();
    await expect(button.querySelectorAll('span')).toHaveLength(1);
  },
});

export const DataDisabledGreysSecondLine = meta.story({
  tags: ['!dev'],
  args: { mode: 'next', nextName: 'Brother Tomas' },
  render: (args) => <TurnBarCell {...args} data-disabled="" />,
  play: async ({ canvas }) => {
    const line = canvas.getByText('Brother Tomas');
    await expect(getComputedStyle(line).color).toBe(rgb(base.secondary));
  },
});

export const ClickCallsOnClick = meta.story({
  tags: ['!dev'],
  args: { mode: 'next', nextName: 'Brother Tomas', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    await userEvent.click(
      canvas.getByRole('button', { name: (label: string) => label.includes(t('nextTurn')) }),
    );
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const SitsAtBottomOfScreen = meta.story({
  tags: ['!dev'],
  args: { mode: 'next', nextName: 'Brother Tomas' },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'TurnBar');
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('nextTurn')),
    });
    const frameRect = frame?.getBoundingClientRect();
    const barRect = button.parentElement?.getBoundingClientRect();
    await expect(barRect?.bottom).toBe(frameRect?.bottom);
    await expect(barRect?.height).toBe(98);
    await expect(button.getBoundingClientRect().height).toBe(58);
    await expect((frameRect?.bottom ?? 0) - button.getBoundingClientRect().bottom).toBe(28);
  },
});
