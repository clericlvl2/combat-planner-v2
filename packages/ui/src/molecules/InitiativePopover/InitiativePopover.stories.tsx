import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useRef, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { Mock } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import { InitiativePopover } from './InitiativePopover.tsx';
import type { InitiativePopoverProps } from './InitiativePopover.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface InitiativePopoverCellProps extends Omit<InitiativePopoverProps, 'anchor' | 'triggerRef'> {
  withAnchor?: boolean;
  withTrigger?: boolean;
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

function InitiativePopoverCell({
  value: initialValue,
  open: initialOpen,
  onSet,
  onRoll,
  onClose,
  withAnchor = false,
  withTrigger = false,
  ...props
}: InitiativePopoverCellProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(initialOpen);

  return (
    <div style={stage}>
      {withTrigger ? (
        <span ref={triggerRef} style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
          <Button variant="secondary" size="S" onClick={() => setOpen(!open)}>
            Задать инициативу
          </Button>
        </span>
      ) : null}
      <InitiativePopover
        {...props}
        value={value}
        open={open}
        triggerRef={withTrigger ? triggerRef : undefined}
        anchor={
          withAnchor ? (
            <Button variant="secondary" size="S" onClick={() => setOpen(true)}>
              Задать инициативу
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

export const Default = meta.story({
  tags: ['visual'],
  args: { value: 15, bonus: 3 },
});

export const SetsTheValue = meta.story({
  tags: ['!dev'],
  args: { value: 15, bonus: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('spinbutton')).toHaveValue('15');
  },
});

export const NoInitiativeYet = meta.story({
  args: { value: null, bonus: 2 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    const field = canvas.getByRole('spinbutton');
    await expect(field).toHaveValue('—');
    await expect(field).not.toHaveAttribute('aria-valuenow');
    await expect(canvas.getByRole('button', { name: t('roll', { bonus: '+2' }) })).toBeVisible();
  },
});

export const NegativeBonus = meta.story({
  args: { value: 4, bonus: -1 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    await expect(canvas.getByRole('button', { name: t('roll', { bonus: '−1' }) })).toBeVisible();
    await expect(canvas.getByText('(−1)')).toBeVisible();
    await expect(canvas.getByRole('spinbutton')).toHaveValue('4');
  },
});

export const MinusAndPlusSetTheValue = meta.story({
  tags: ['!dev'],
  args: { value: 15, bonus: 3 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    const field = canvas.getByRole('spinbutton');
    await userEvent.click(canvas.getByRole('button', { name: t('Stepper:increase') }));
    await expect(args.onSet).toHaveBeenLastCalledWith(16);
    await expect(field).toHaveAttribute('aria-valuenow', '16');
    await userEvent.click(canvas.getByRole('button', { name: t('Stepper:decrease') }));
    await userEvent.click(canvas.getByRole('button', { name: t('Stepper:decrease') }));
    await expect(args.onSet).toHaveBeenLastCalledWith(14);
    await expect(field).toHaveAttribute('aria-valuenow', '14');
    await expect(args.onRoll).not.toHaveBeenCalled();
  },
});

export const RollAddsTheBonus = meta.story({
  tags: ['!dev'],
  args: {
    value: 15,
    bonus: 3,
    random: fn<() => number>(),
  },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    (args.random as Mock<() => number>).mockReturnValueOnce(0).mockReturnValueOnce(0.9999);
    const roll = canvas.getByRole('button', { name: t('roll', { bonus: '+3' }) });
    await userEvent.click(roll);
    await expect(args.onRoll).toHaveBeenLastCalledWith(LIMITS.roll.min + 3, LIMITS.roll.min);
    await userEvent.click(roll);
    await expect(args.onRoll).toHaveBeenLastCalledWith(LIMITS.roll.max + 3, LIMITS.roll.max);
    await expect(canvas.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '23');
    await expect(args.onSet).not.toHaveBeenCalled();
  },
});

export const EscapeCloses = meta.story({
  tags: ['!dev'],
  args: { value: 15, bonus: 3 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('Stepper:decrease') })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSet).not.toHaveBeenCalled();
    await expect(args.onRoll).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const EscapeCallsConsumerKeyDown = meta.story({
  tags: ['!dev'],
  args: { value: 15, bonus: 3, onKeyDown: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    await expect(args.onKeyDown).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const TriggerCloses = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: { overflow: 'the 264 px story stage holds both the trigger and the open popover' },
  },
  args: { value: 15, bonus: 3, withTrigger: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    await expect(canvas.getByRole('dialog', { name: t('title') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Задать инициативу' }));
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Задать инициативу' }));
    await expect(canvas.getByRole('dialog', { name: t('title') })).toBeVisible();
  },
});

export const RollPlusThenOutsideTapCloses = meta.story({
  tags: ['!dev'],
  args: { value: null, bonus: 3, random: () => 0.65 },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    await userEvent.click(canvas.getByRole('button', { name: t('roll', { bonus: '+3' }) }));
    await expect(args.onRoll).toHaveBeenCalledWith(17, 14);
    await expect(canvas.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '17');
    await expect(canvas.getByRole('spinbutton')).toHaveValue('17');
    await userEvent.click(canvas.getByRole('button', { name: t('Stepper:increase') }));
    await expect(args.onSet).toHaveBeenCalledWith(18);
    await expect(canvas.getByRole('spinbutton')).toHaveValue('18');
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.click(canvasElement.ownerDocument.body);
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ClosedWithAnchor = meta.story({
  args: { value: 15, bonus: 3, open: false, withAnchor: true },
});

export const OpensFromAnchor = meta.story({
  tags: ['!dev'],
  args: { value: 15, bonus: 3, open: false, withAnchor: true },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'InitiativePopover');
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.queryByRole('dialog')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Задать инициативу' }));
    const dialog = await body.findByRole('dialog', { name: t('title') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Stepper:increase') }));
    await expect(args.onSet).toHaveBeenCalledWith(16);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onRoll).not.toHaveBeenCalled();
    await expect(body.queryByRole('dialog')).toBeNull();
  },
});
