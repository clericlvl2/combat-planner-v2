import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { CombatHeader } from './CombatHeader.tsx';
import type { CombatHeaderPopover, CombatHeaderProps } from './CombatHeader.tsx';
import { anyValue, escapeRegExp, storyT } from '../../storybook/storyT.ts';

interface CombatHeaderCellProps extends Partial<
  Omit<CombatHeaderProps, 'round' | 'escalation' | 'open'>
> {
  round?: number | null;
  escalation?: EscalationValue;
  open?: CombatHeaderPopover | null;
  editable?: boolean;
}

interface PlayContext {
  args: CombatHeaderCellProps;
  canvas: ReturnType<typeof within>;
  t: TFunction;
}

function CombatHeaderCell({
  title = 'Ambush at the Ferry',
  round: initialRound = 3,
  escalation: initialEscalation = 2,
  open: initialOpen = null,
  editable = true,
  onBack,
  onRound,
  onEscalation,
  onMenu,
  onClose,
  onRoundChange,
  onEscalationChange,
  onMenuSelect,
  onHeroes,
  ...props
}: CombatHeaderCellProps) {
  const [open, setOpen] = useState<CombatHeaderPopover | null>(initialOpen);
  const [round, setRound] = useState(initialRound);
  const [escalation, setEscalation] = useState(initialEscalation);
  const toggle = (popover: CombatHeaderPopover) =>
    setOpen((current) => (current === popover ? null : popover));
  return (
    <CombatHeader
      {...props}
      title={title}
      round={round}
      escalation={escalation}
      open={open}
      onBack={props.viewer === 'player' ? undefined : () => onBack?.()}
      onRound={
        editable
          ? () => {
              toggle('round');
              onRound?.();
            }
          : undefined
      }
      onEscalation={
        editable
          ? () => {
              toggle('escalation');
              onEscalation?.();
            }
          : undefined
      }
      onMenu={() => {
        toggle('menu');
        onMenu?.();
      }}
      onClose={() => {
        setOpen(null);
        onClose?.();
      }}
      onRoundChange={(next) => {
        setRound(next);
        onRoundChange?.(next);
      }}
      onEscalationChange={(next) => {
        setEscalation(next);
        onEscalationChange?.(next);
      }}
      onMenuSelect={(action) => onMenuSelect?.(action)}
      onHeroes={() => onHeroes?.()}
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/CombatHeader',
  component: CombatHeaderCell,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    onBack: fn(),
    onRound: fn(),
    onEscalation: fn(),
    onMenu: fn(),
    onClose: fn(),
    onRoundChange: fn(),
    onEscalationChange: fn(),
    onMenuSelect: fn(),
    onHeroes: fn(),
  },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getByRole('button', { name: t('back') })).toBeVisible();
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('editRound', { round: 3 }) }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(
      canvas.getByRole('button', { name: anyValue(t, 'setEscalation', 'value') }),
    ).toHaveTextContent(`${t('escalationCaption')} +2`);
    await expect(canvas.getByText(t('round'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
  },
});

export const MenuOpen = meta.story({
  tags: ['visual'],
  args: { open: 'menu' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const menu = canvas.getByRole('button', { name: t('menu') });
    await expect(menu).toHaveAttribute('data-open');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(await canvas.findByRole('menu', { name: t('menuLabel') })).toBeVisible();
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('addUnit'), t('undo'), t('share'), t('restart'), t('clear')]);
  },
});

export const EscalationOpen = meta.story({
  tags: ['visual'],
  args: { open: 'escalation' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const die = canvas.getByRole('button', {
      name: anyValue(t, 'setEscalation', 'value'),
    });
    await expect(die).toHaveAttribute('data-open');
    await expect(die).toHaveAttribute('aria-expanded', 'true');
    const faces = await canvas.findByRole('group', { name: t('escalationTitle') });
    await expect(faces.querySelectorAll('button')).toHaveLength(7);
    await expect(
      canvas.getByRole('button', { name: t('escalationFace', { value: 2 }) }),
    ).toHaveAttribute('aria-pressed', 'true');
  },
});

export const RoundOpen = meta.story({
  tags: ['visual'],
  args: { open: 'round' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const round = canvas.getByRole('button', { name: t('editRound', { round: 3 }) });
    await expect(round).toHaveAttribute('data-open');
    await expect(round).toHaveAttribute('aria-expanded', 'true');
    await expect(await canvas.findByRole('spinbutton')).toHaveValue('3');
    await expect(canvas.getByText(t('roundHint', { min: 1, max: 99 }))).toBeVisible();
  },
});

export const Setup = meta.story({
  tags: ['visual'],
  args: { round: null, escalation: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.getByText(t('setup'))).toBeVisible();
    await expect(
      canvas.queryByText(new RegExp(escapeRegExp(t('EscalationDie:value', { value: '' }).trim()))),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: new RegExp(escapeRegExp(t('round')), 'i') }),
    ).toBeNull();
    await userEvent.click(canvas.getByText(t('setup')));
    await expect(args.onRound).not.toHaveBeenCalled();
    await expect(args.onEscalation).not.toHaveBeenCalled();
  },
});

export const SetupMenuOpen = meta.story({
  args: { round: null, escalation: 0, open: 'menu' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute('data-open');
    await canvas.findByRole('menu', { name: t('menuLabel') });
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('addUnit'), t('undo'), t('share'), t('clear')]);
  },
});

export const LongTitle = meta.story({
  tags: ['visual'],
  args: { title: 'Капитан стражи переправы: засада у моста', round: 99, escalation: 6 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const title = canvas.getByText('Капитан стражи переправы: засада у моста');
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(canvas.getByRole('button', { name: t('editRound', { round: 99 }) })).toBeVisible();
    await expect(canvas.getByText('+6')).toBeVisible();
  },
});

export const Player = meta.story({
  tags: ['visual'],
  args: { viewer: 'player' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('back') })).toBeNull();
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByText(t('round')).parentElement).toHaveTextContent(`${t('round')} 3`);
    await userEvent.click(canvas.getByText('+2'));
    await expect(args.onEscalation).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('group')).toBeNull();
  },
});

export const PlayerMenuOffersHeroes = meta.story({
  tags: ['!dev'],
  args: { viewer: 'player' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('menu') }));
    await expect(await canvas.findByRole('menu', { name: t('playerMenuLabel') })).toBeVisible();
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('heroes')]);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('heroes') }));
    await expect(args.onHeroes).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const UndoDisabled = meta.story({
  args: { open: 'menu', undoDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const undo = await canvas.findByRole('menuitem', { name: t('undo') });
    await expect(undo).toBeDisabled();
    await userEvent.click(undo, { pointerEventsCheck: 0 });
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: t('share') })).toBeEnabled();
  },
});

export const RoundAtMaximum = meta.story({
  args: { round: 99, open: 'round' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const increase = await canvas.findByRole('button', { name: t('Stepper:increase') });
    await expect(increase).toBeDisabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await expect(args.onRoundChange).not.toHaveBeenCalled();
  },
});

export const ReadOnly = meta.story({
  args: { editable: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(canvas.getByText(t('round')));
    await userEvent.click(canvas.getByText('+2'));
    await expect(args.onRound).not.toHaveBeenCalled();
    await expect(args.onEscalation).not.toHaveBeenCalled();
    await expect(args.onRoundChange).not.toHaveBeenCalled();
    await expect(args.onEscalationChange).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('spinbutton')).toBeNull();
  },
});

export const DieNameCarriesValue = meta.story({
  tags: ['!dev'],
  args: { escalation: 4 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('button', { name: t('setEscalation', { value: 4 }) }),
    ).toBeVisible();
  },
});

export const EachControlFiresItsOwnCallback = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('back') }));
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(args.onRound).not.toHaveBeenCalled();
    await expect(args.onEscalation).not.toHaveBeenCalled();
    await expect(args.onMenu).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: t('editRound', { round: 3 }) }));
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(args.onEscalation).not.toHaveBeenCalled();
    await expect(args.onMenu).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole('button', { name: anyValue(t, 'setEscalation', 'value') }),
    );
    await expect(args.onEscalation).toHaveBeenCalledOnce();
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(args.onMenu).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: t('menu') }));
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await expect(args.onEscalation).toHaveBeenCalledOnce();
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute('data-open');
    await expect(
      canvas.getByRole('button', { name: anyValue(t, 'setEscalation', 'value') }),
    ).not.toHaveAttribute('data-open');
  },
});

export const TapRoundOpensPopover = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const round = canvas.getByRole('button', { name: t('editRound', { round: 3 }) });
    await userEvent.click(round);
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(round).toHaveAttribute('data-open');
    await waitFor(() => expect(canvas.getByRole('spinbutton')).toHaveFocus());
  },
});

export const StepperChangesRound = meta.story({
  tags: ['!dev'],
  args: { open: 'round' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(await canvas.findByRole('button', { name: t('Stepper:increase') }));
    await expect(args.onRoundChange).toHaveBeenCalledOnce();
    await expect(args.onRoundChange).toHaveBeenCalledWith(4);
    await expect(canvas.getByRole('spinbutton')).toHaveValue('4');
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    const round = canvas.getByRole('button', { name: t('editRound', { round: 4 }) });
    await waitFor(() => expect(round).toHaveFocus());
    await expect(round).not.toHaveAttribute('data-open');
  },
});

export const RoundEnterCommits = meta.story({
  tags: ['!dev'],
  args: { open: 'round' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const field = await canvas.findByRole('spinbutton');
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.clear(field);
    await userEvent.type(field, '5{Enter}');
    await expect(args.onRoundChange).toHaveBeenCalledOnce();
    await expect(args.onRoundChange).toHaveBeenCalledWith(5);
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('spinbutton')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('editRound', { round: 5 }) })).toHaveFocus();
  },
});

export const RoundEscapeDiscards = meta.story({
  tags: ['!dev'],
  args: { open: 'round' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const field = await canvas.findByRole('spinbutton');
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.clear(field);
    await userEvent.type(field, '50');
    await userEvent.keyboard('{Escape}');
    await expect(args.onRoundChange).not.toHaveBeenCalled();
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('spinbutton')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('editRound', { round: 3 }) })).toHaveFocus();
  },
});

export const RoundBoundKeepsKeyboard = meta.story({
  tags: ['!dev'],
  args: { round: 98, open: 'round' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const increase = await canvas.findByRole('button', { name: t('Stepper:increase') });
    increase.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onRoundChange).toHaveBeenCalledWith(99);
    await expect(increase).toBeDisabled();
    const field = canvas.getByRole('spinbutton');
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('spinbutton')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('editRound', { round: 99 }) })).toHaveFocus();
  },
});

export const OutsideTapCloses = meta.story({
  tags: ['!dev'],
  args: { open: 'round' },
  play: async ({ args, canvas }) => {
    await canvas.findByRole('spinbutton');
    await userEvent.click(canvas.getByText('Ambush at the Ferry'));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('spinbutton')).toBeNull());
    await expect(args.onRoundChange).not.toHaveBeenCalled();
  },
});

async function pickFaceWithKeyboard({ args, canvas, t }: PlayContext) {
  const die = canvas.getByRole('button', {
    name: anyValue(t, 'setEscalation', 'value'),
  });
  die.focus();
  await userEvent.keyboard('{Enter}');
  await expect(args.onEscalation).toHaveBeenCalledOnce();
  await waitFor(() =>
    expect(canvas.getByRole('button', { name: t('escalationFace', { value: 2 }) })).toHaveFocus(),
  );
  await userEvent.keyboard('{ArrowRight}');
  await expect(
    canvas.getByRole('button', { name: t('escalationFace', { value: 3 }) }),
  ).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect(args.onEscalationChange).toHaveBeenCalledOnce();
  await expect(args.onEscalationChange).toHaveBeenCalledWith(3);
  await expect(args.onClose).toHaveBeenCalledOnce();
  await waitFor(() => expect(canvas.queryByRole('group')).toBeNull());
  await waitFor(() => expect(die).toHaveFocus());
  await expect(die).toHaveTextContent('+3');
}

export const FacePickerKeyboard = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('button', { name: anyValue(t, 'setEscalation', 'value') }),
    ).toHaveTextContent('+2');
    await pickFaceWithKeyboard({ args, canvas, t });
  },
});

export const FacePickerKeyboardMotionOn = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(document.documentElement.dataset.motion).toBe('on');
    await pickFaceWithKeyboard({ args, canvas, t });
  },
});

export const FaceEscapeKeepsDie = meta.story({
  tags: ['!dev'],
  args: { open: 'escalation' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: t('escalationFace', { value: 2 }) })).toHaveFocus(),
    );
    await userEvent.keyboard('{ArrowLeft}{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onEscalationChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: anyValue(t, 'setEscalation', 'value') }),
      ).toHaveFocus(),
    );
  },
});

export const MenuItemFires = meta.story({
  tags: ['!dev'],
  args: { open: 'menu' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('share') }));
    await expect(args.onMenuSelect).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).toHaveBeenCalledWith('share');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveFocus();
  },
});

export const MenuKeyboardMotionOn = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(document.documentElement.dataset.motion).toBe('on');
    const menu = canvas.getByRole('button', { name: t('menu') });
    menu.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: t('addUnit') })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(menu).toHaveFocus());
  },
});
