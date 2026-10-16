import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Mock } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import { InitiativePopover } from './InitiativePopover.tsx';
import type { InitiativePopoverProps } from './InitiativePopover.tsx';

type TapTarget = 'plus' | 'roll';

interface InitiativePopoverCellProps extends Omit<InitiativePopoverProps, 'anchor'> {
  tap?: TapTarget;
  withAnchor?: boolean;
}

const stage = {
  boxSizing: 'border-box',
  display: 'flex',
  width: 264,
  minHeight: 64,
  padding: 12,
  borderRadius: 16,
  background: 'var(--cp-color-background)',
} as const;

const tapIndex: Record<TapTarget, number> = { plus: 1, roll: 2 };

function InitiativePopoverCell({
  value: initialValue,
  open: initialOpen,
  onSet,
  onRoll,
  onClose,
  tap,
  withAnchor = false,
  ...props
}: InitiativePopoverCellProps) {
  const { t } = useTranslation('InitiativePopover');
  const stageRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(initialOpen);

  useLayoutEffect(() => {
    if (!tap) return;
    stageRef.current?.querySelectorAll('button')[tapIndex[tap]]?.setAttribute('data-tap', '');
  }, [tap]);

  return (
    <div ref={stageRef} style={stage}>
      <InitiativePopover
        {...props}
        value={value}
        open={open}
        anchor={
          withAnchor ? (
            <Button variant="secondary" size="S" onClick={() => setOpen(true)}>
              {t('anchor')}
            </Button>
          ) : undefined
        }
        onSet={(next) => {
          setValue(next);
          onSet(next);
        }}
        onRoll={(initiative, roll) => {
          setValue(initiative);
          onRoll(initiative, roll);
        }}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/InitiativePopover',
  component: InitiativePopoverCell,
  args: {
    value: 15,
    bonus: 3,
    open: true,
    onSet: fn(),
    onRoll: fn(),
    onClose: fn(),
    random: () => 0.5,
  },
});

export const Anatomy = meta.story({
  args: { value: 15, bonus: 3 },
});

export const Set = meta.story({
  args: { value: 15, bonus: 3 },
});

export const NoInitiativeYet = meta.story({
  name: 'No initiative yet',
  args: { value: null, bonus: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('—')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Roll d20 +2' })).toBeVisible();
  },
});

export const Tap = meta.story({
  name: 'Tap +',
  args: { value: 15, bonus: 3, tap: 'plus' },
});

export const TapRoll = meta.story({
  name: 'Tap Roll',
  args: { value: 15, bonus: 3, tap: 'roll' },
});

export const NegativeBonus = meta.story({
  name: 'Negative bonus',
  args: { value: 4, bonus: -1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Roll d20 −1' })).toBeVisible();
    await expect(canvas.getByText('(−1)')).toBeVisible();
  },
});

export const HighRoll = meta.story({
  name: 'High roll',
  args: { value: 27, bonus: 7 },
});

export const Ru = meta.story({
  name: 'ru',
  globals: { locale: 'ru' },
  args: { value: 15, bonus: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Инициатива' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Бросить d20 +3' })).toBeVisible();
  },
});

export const ExtraStep = meta.story({
  name: 'Minus and plus set the value',
  args: { value: 15, bonus: 3 },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('spinbutton');
    await userEvent.click(canvas.getByRole('button', { name: 'Increase' }));
    await expect(args.onSet).toHaveBeenLastCalledWith(16);
    await expect(field).toHaveAttribute('aria-valuenow', '16');
    await userEvent.click(canvas.getByRole('button', { name: 'Decrease' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Decrease' }));
    await expect(args.onSet).toHaveBeenLastCalledWith(14);
    await expect(field).toHaveAttribute('aria-valuenow', '14');
    await expect(args.onRoll).not.toHaveBeenCalled();
  },
});

export const ExtraTypeValue = meta.story({
  name: 'Keyboard: type a value and Enter',
  args: { value: null, bonus: 3 },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('spinbutton');
    await userEvent.click(field);
    await userEvent.clear(field);
    await userEvent.type(field, '22{Enter}');
    await expect(args.onSet).toHaveBeenLastCalledWith(22);
    await expect(field).toHaveAttribute('aria-valuenow', '22');
    await expect(canvas.queryByText('—')).toBeNull();
  },
});

export const ExtraMax = meta.story({
  name: 'Plus stops at the maximum',
  args: { value: LIMITS.initiative.max, bonus: 3 },
  play: async ({ args, canvas }) => {
    const increase = canvas.getByRole('button', { name: 'Increase' });
    await expect(increase).toBeDisabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await expect(args.onSet).not.toHaveBeenCalled();
  },
});

export const ExtraRollBounds = meta.story({
  name: 'Roll d20 adds the bonus',
  args: {
    value: 15,
    bonus: 3,
    random: fn<() => number>(),
  },
  play: async ({ args, canvas }) => {
    (args.random as Mock<() => number>).mockReturnValueOnce(0).mockReturnValueOnce(0.9999);
    const roll = canvas.getByRole('button', { name: 'Roll d20 +3' });
    await userEvent.click(roll);
    await expect(args.onRoll).toHaveBeenLastCalledWith(LIMITS.roll.min + 3, LIMITS.roll.min);
    await userEvent.click(roll);
    await expect(args.onRoll).toHaveBeenLastCalledWith(LIMITS.roll.max + 3, LIMITS.roll.max);
    await expect(canvas.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '23');
    await expect(args.onSet).not.toHaveBeenCalled();
  },
});

export const ExtraRollRandom = meta.story({
  name: 'Roll d20 with Math.random',
  args: { value: 15, bonus: -1, random: Math.random },
  play: async ({ args, canvas }) => {
    for (let index = 0; index < 20; index += 1) {
      await userEvent.click(canvas.getByRole('button', { name: 'Roll d20 −1' }));
    }
    await expect(args.onRoll).toHaveBeenCalledTimes(20);
    for (const [initiative, roll] of (args.onRoll as Mock<InitiativePopoverProps['onRoll']>).mock
      .calls) {
      await expect(roll).toBeGreaterThanOrEqual(LIMITS.roll.min);
      await expect(roll).toBeLessThanOrEqual(LIMITS.roll.max);
      await expect(initiative).toBe(roll - 1);
    }
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraEscape = meta.story({
  name: 'Keyboard: Escape closes',
  args: { value: 15, bonus: 3 },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Decrease' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSet).not.toHaveBeenCalled();
    await expect(args.onRoll).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraFlow = meta.story({
  name: 'Flow: roll, plus, tap outside closes',
  args: { value: null, bonus: 3, random: () => 0.65 },
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Roll d20 +3' }));
    await expect(args.onRoll).toHaveBeenCalledWith(17, 14);
    await expect(canvas.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '17');
    await userEvent.click(canvas.getByRole('button', { name: 'Increase' }));
    await expect(args.onSet).toHaveBeenCalledWith(18);
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.click(canvasElement.ownerDocument.body);
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraAnchor = meta.story({
  name: 'Opens from the anchor',
  args: { value: 15, bonus: 3, open: false, withAnchor: true },
  play: async ({ args, canvas, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.queryByRole('dialog')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Set initiative' }));
    const dialog = await body.findByRole('dialog', { name: 'Initiative' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Increase' }));
    await expect(args.onSet).toHaveBeenCalledWith(16);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onRoll).not.toHaveBeenCalled();
    await expect(body.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { value: 15, bonus: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Initiativewert' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'd20 würfeln +3' })).toBeVisible();
  },
});
