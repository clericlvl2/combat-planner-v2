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
      onBack={() => onBack?.()}
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
  },
});

export const Anatomy = meta.story({
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
    ).toHaveTextContent(t('escalationFace', { value: 2 }));
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
  },
});

export const ExtraDieNameCarriesValue = meta.story({
  name: 'The die’s accessible name carries its value',
  args: { escalation: 4 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('button', { name: t('setEscalation', { value: 4 }) }),
    ).toBeVisible();
  },
});

export const ActiveRound3Escalation2 = meta.story({
  name: 'Active, round 3, escalation 2',
});

export const MenuOpen = meta.story({
  tags: ['visual'],
  name: 'Menu open',
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
  name: 'Escalation open',
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
  name: 'Round open',
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
  name: 'Setup',
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

export const SetupDe = meta.story({
  name: 'Setup, de',
  globals: { locale: 'de' },
  args: { round: null, escalation: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.getByText('Vorbereitung')).toBeVisible();
  },
});

export const SetupEs = meta.story({
  name: 'Setup, es',
  globals: { locale: 'es' },
  args: { round: null, escalation: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.getByText('Preparación')).toBeVisible();
  },
});

export const SetupRu = meta.story({
  name: 'Setup, ru',
  globals: { locale: 'ru' },
  args: { round: null, escalation: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.getByText('Подготовка')).toBeVisible();
  },
});

export const SetupFr = meta.story({
  name: 'Setup, fr',
  globals: { locale: 'fr' },
  args: { round: null, escalation: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.getByText('Préparation')).toBeVisible();
  },
});

export const SetupMenuOpen = meta.story({
  name: 'Setup, menu open',
  args: { round: null, escalation: 0, open: 'menu' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute('data-open');
    await canvas.findByRole('menu', { name: t('menuLabel') });
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('addUnit'), t('undo'), t('share'), t('clear')]);
  },
});

export const LongTitleRound99 = meta.story({
  tags: ['visual'],
  name: 'Long title, round 99',
  parameters: {
    geometry: {
      truncation: { reason: 'the long combat title ends with an ellipsis by design', except: 'h1' },
    },
  },
  args: { title: 'Капитан стражи переправы: засада у моста', round: 99, escalation: 6 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const title = canvas.getByText('Капитан стражи переправы: засада у моста');
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(canvas.getByRole('button', { name: t('editRound', { round: 99 }) })).toBeVisible();
    await expect(canvas.getByText(t('escalationFace', { value: 6 }))).toBeVisible();
  },
});

export const ExtraEachControlFiresItsOwnCallback = meta.story({
  name: 'Each control fires its own callback',
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

export const ExtraFlowTapRound = meta.story({
  name: 'Flow: tap round opens the round popover',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const round = canvas.getByRole('button', { name: t('editRound', { round: 3 }) });
    await userEvent.click(round);
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(round).toHaveAttribute('data-open');
    await waitFor(() => expect(canvas.getByRole('spinbutton')).toHaveFocus());
  },
});

export const ExtraFlowTapDie = meta.story({
  name: 'Flow: tap die opens the face picker',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const die = canvas.getByRole('button', {
      name: anyValue(t, 'setEscalation', 'value'),
    });
    await userEvent.click(die);
    await expect(args.onEscalation).toHaveBeenCalledOnce();
    await expect(die).toHaveAttribute('data-open');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: t('escalationFace', { value: 2 }) })).toHaveFocus(),
    );
  },
});

export const ExtraFlowTapMenu = meta.story({
  name: 'Flow: tap Menu opens the combat menu',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const menu = canvas.getByRole('button', { name: t('menu') });
    await userEvent.click(menu);
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await expect(menu).toHaveAttribute('data-open');
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: t('addUnit') })).toHaveFocus());
  },
});

export const ExtraRoundStepper = meta.story({
  name: 'Round stepper changes the round, Escape returns focus',
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

export const ExtraRoundMax = meta.story({
  name: 'Round 99 cannot go higher',
  args: { round: 99, open: 'round' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const increase = await canvas.findByRole('button', { name: t('Stepper:increase') });
    await expect(increase).toBeDisabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await expect(args.onRoundChange).not.toHaveBeenCalled();
  },
});

export const ExtraRoundEnter = meta.story({
  name: 'Enter in the round field commits, closes and returns focus',
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

export const ExtraRoundEscapeDiscards = meta.story({
  name: 'Escape in the round field closes without committing',
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

export const ExtraRoundBoundKeepsKeyboard = meta.story({
  name: 'Reaching a bound by + keeps keyboard control',
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

export const ExtraUndoDisabled = meta.story({
  name: 'Undo is disabled with nothing to undo',
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

export const ExtraOutsideTap = meta.story({
  name: 'Tap outside closes the popover without a change',
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
  await expect(die).toHaveTextContent(t('escalationFace', { value: 3 }));
}

export const ExtraFacePickerKeyboard = meta.story({
  name: 'Keyboard: arrows move across faces, Enter sets the die',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('button', { name: anyValue(t, 'setEscalation', 'value') }),
    ).toHaveTextContent(t('escalationFace', { value: 2 }));
    await pickFaceWithKeyboard({ args, canvas, t });
  },
});

export const ExtraFacePickerKeyboardMotionOn = meta.story({
  name: 'Motion on: keyboard sets the die and returns focus',
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(document.documentElement.dataset.motion).toBe('on');
    await pickFaceWithKeyboard({ args, canvas, t });
  },
});

export const ExtraFaceEscape = meta.story({
  name: 'Escape in the face picker keeps the die',
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

export const ExtraMenuSelect = meta.story({
  name: 'Menu item fires its action',
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

export const ExtraMenuKeyboardMotionOn = meta.story({
  name: 'Motion on: Enter opens the menu, Escape returns focus',
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

export const ExtraReadOnly = meta.story({
  name: 'Without round and die handlers both are display only',
  args: { editable: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(canvas.getByText(t('round')));
    await userEvent.click(canvas.getByText(t('escalationFace', { value: 2 })));
    await expect(args.onRound).not.toHaveBeenCalled();
    await expect(args.onEscalation).not.toHaveBeenCalled();
    await expect(args.onRoundChange).not.toHaveBeenCalled();
    await expect(args.onEscalationChange).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('spinbutton')).toBeNull();
  },
});
