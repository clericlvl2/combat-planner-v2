import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { TurnBar } from './TurnBar.tsx';
import type { TurnBarProps } from './TurnBar.tsx';
import { storyT } from '../../storybook/storyT.ts';

const longestName = 'W'.repeat(LIMITS.unitName);

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

export const Anatomy = meta.story({
  tags: ['visual'],
  args: { mode: 'next', nextName: 'Brother Tomas' },
});

export const Active = meta.story({
  args: { mode: 'next', nextName: 'Brother Tomas' },
});

export const Setup = meta.story({
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
  name: 'Blocked: all units disabled',
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

export const BlockedRound99 = meta.story({
  tags: ['visual'],
  name: 'Blocked: round 99',
  args: { mode: 'next', disabled: true, reasonKey: 'lastRound' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    await expect(
      canvas.getByRole('button', { name: (label: string) => label.includes(t('nextTurn')) }),
    ).toBeDisabled();
    await expect(canvas.getByText(t('lastRound', { round: LIMITS.round.max }))).toBeVisible();
  },
});

export const LongNextNameEllipsis = meta.story({
  tags: ['visual'],
  name: 'Long next name: ellipsis',
  parameters: {
    geometry: {
      truncation: {
        reason: 'the long unit name ends with an ellipsis by design',
        except: '[data-mode] > span + span',
      },
    },
  },
  args: { mode: 'next', nextName: 'Brother Tomas of the Silver Lantern Order' },
});

export const LongNextNameJa = meta.story({
  name: 'Long next name, ja',
  args: { mode: 'next', nextName: '黒水の渡し守と呪われし大蛇の群れ' },
});

export const RuLongestLabels = meta.story({
  name: 'ru: longest labels',
  parameters: {
    geometry: {
      truncation: {
        reason: 'the longest unit name ends with an ellipsis by design',
        except: '[data-mode] > span + span',
      },
    },
  },
  globals: { locale: 'ru' },
  args: { mode: 'next', nextName: 'Капитан стражи переправы Святослав Огнев' },
  play: async ({ canvas }) => {
    await document.fonts.ready;
    const button = canvas.getByRole('button', { name: /Следующий ход/ });
    const secondary = canvas.getByText('Капитан стражи переправы Святослав Огнев');
    await expect(secondary.scrollWidth).toBeGreaterThan(secondary.clientWidth);
    await expect(button.getBoundingClientRect().height).toBe(58);
  },
});

export const DeSetup = meta.story({
  name: 'de: Setup',
  globals: { locale: 'de' },
  args: { mode: 'start' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Kampf beginnen')).toBeVisible();
    await expect(canvas.getByText('Würfelt fehlende Initiative')).toBeVisible();
  },
});

export const FrBlocked = meta.story({
  name: 'fr: blocked',
  globals: { locale: 'fr' },
  args: { mode: 'next', disabled: true, reasonKey: 'everyUnitDisabled' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /Tour suivant/ })).toBeDisabled();
    await expect(canvas.getByText('Toutes les unités sont désactivées')).toBeVisible();
  },
});

export const ExtraBlockedNoUnits = meta.story({
  name: 'Blocked: no units yet',
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

export const ExtraDataDisabledLine = meta.story({
  name: 'data-disabled greys the second line',
  args: { mode: 'next', nextName: 'Brother Tomas' },
  render: (args) => <TurnBarCell {...args} data-disabled="" />,
  play: async ({ canvas }) => {
    const line = canvas.getByText('Brother Tomas');
    await expect(getComputedStyle(line).color).toBe('rgb(95, 87, 77)');
  },
});

export const ExtraClick = meta.story({
  name: 'Click',
  args: { mode: 'next', nextName: 'Brother Tomas', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    await userEvent.click(
      canvas.getByRole('button', { name: (label: string) => label.includes(t('nextTurn')) }),
    );
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { mode: 'start', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('startCombat')),
    });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraEllipsis = meta.story({
  name: 'Name at the length limit ends with an ellipsis',
  parameters: {
    geometry: {
      truncation: {
        reason: 'the name at the length limit ends with an ellipsis by design',
        except: '[data-mode] > span + span',
      },
    },
  },
  args: { mode: 'next', nextName: longestName },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnBar');
    await document.fonts.ready;
    const button = canvas.getByRole('button', {
      name: (label: string) => label.includes(t('nextTurn')),
    });
    const secondary = canvas.getByText(longestName);
    await expect(getComputedStyle(secondary).textOverflow).toBe('ellipsis');
    await expect(secondary.scrollWidth).toBeGreaterThan(secondary.clientWidth);
    await expect(secondary.getBoundingClientRect().width).toBeLessThanOrEqual(
      button.getBoundingClientRect().width - 32,
    );
    await expect(button.getBoundingClientRect().height).toBe(58);
  },
});

export const ExtraBottomOfScreen = meta.story({
  name: 'Sits at the bottom of the screen',
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
