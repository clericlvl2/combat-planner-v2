import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import {
  IconArrowBackUp,
  IconBookmark,
  IconCopy,
  IconDots,
  IconPlayerPause,
  IconRefresh,
  IconShare,
  IconSwitchHorizontal,
  IconTrash,
  IconUserMinus,
  IconUserOff,
  IconUserPlus,
} from '@tabler/icons-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { CardActions } from '../../molecules/CardActions/CardActions.tsx';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Menu, PopoverFrame } from './Menu.tsx';
import type { MenuItem } from './Menu.tsx';

type Preset = 'combat' | 'unit' | 'card' | 'player';

interface MenuCellProps {
  preset?: Preset;
  items?: readonly MenuItem[];
  width?: number;
  opened?: boolean;
  source?: 'none' | 'iconButton' | 'cardActions';
  disabledIds?: readonly string[];
  onSelect?: (id: string) => void;
  onClose?: () => void;
  onEdit?: () => void;
}

const moreLabel = 'More actions';

const stage: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  flex: 1,
  padding: 12,
};

const note: CSSProperties = {
  color: 'var(--cp-color-secondary)',
  fontSize: 'var(--mantine-font-size-small)',
  lineHeight: 'var(--mantine-line-height-snug)',
};

function usePresetItems(preset: Preset): MenuItem[] {
  const { t } = useTranslation('Menu');
  const presets: Record<Preset, MenuItem[]> = {
    combat: [
      { id: 'addUnit', icon: IconUserPlus, label: t('addUnit') },
      { id: 'undo', icon: IconArrowBackUp, label: t('undo'), hint: t('undoHint', { n: 12 }) },
      { id: 'share', icon: IconShare, label: t('share') },
      { id: 'restart', icon: IconRefresh, label: t('restart'), divider: true },
      { id: 'clear', icon: IconTrash, label: t('clear'), tone: 'danger' },
    ],
    unit: [
      { id: 'duplicate', icon: IconCopy, label: t('duplicate') },
      { id: 'disable', icon: IconPlayerPause, label: t('disable') },
      { id: 'saveAsPreset', icon: IconBookmark, label: t('saveAsPreset') },
      { id: 'releaseClaim', icon: IconUserOff, label: t('releaseClaim') },
      { id: 'remove', icon: IconUserMinus, label: t('remove'), tone: 'danger', divider: true },
    ],
    card: [
      { id: 'duplicate', icon: IconCopy, label: t('duplicate') },
      { id: 'delete', icon: IconTrash, label: t('delete'), tone: 'danger', divider: true },
    ],
    player: [{ id: 'changeHero', icon: IconSwitchHorizontal, label: t('changeHero') }],
  };
  return presets[preset];
}

function MenuCell({
  preset = 'combat',
  items,
  width,
  opened: initiallyOpened = true,
  source = 'none',
  disabledIds = [],
  onSelect,
  onClose,
  onEdit,
}: MenuCellProps) {
  const { t } = useTranslation('Menu');
  const presetItems = usePresetItems(preset);
  const [opened, setOpened] = useState(initiallyOpened);
  const shown = (items ?? presetItems).map((item) =>
    disabledIds.includes(item.id) ? { ...item, disabled: true } : item,
  );
  const close = () => {
    setOpened(false);
    onClose?.();
  };
  return (
    <div style={stage} data-stage="">
      <Menu
        items={shown}
        width={width}
        opened={opened}
        aria-label={t('menuLabel')}
        onSelect={(id) => onSelect?.(id)}
        onClose={close}
        target={
          source === 'iconButton' ? (
            <IconButton
              icon={IconDots}
              aria-label={moreLabel}
              aria-haspopup="menu"
              aria-expanded={opened}
              onClick={() => setOpened((value) => !value)}
            />
          ) : source === 'cardActions' ? (
            <CardActions
              style={{ width: '100%' }}
              open={opened}
              onEdit={() => onEdit?.()}
              onMore={() => setOpened((value) => !value)}
            />
          ) : undefined
        }
      />
    </div>
  );
}

function RoundCell() {
  const { t } = useTranslation('Menu');
  const [round, setRound] = useState(3);
  return (
    <div style={stage}>
      <PopoverFrame title={t('round')} width={240}>
        <Stepper
          value={round}
          min={LIMITS.round.min}
          max={LIMITS.round.max}
          signed={false}
          onChange={setRound}
        />
        <span style={note}>{t('roundHint', LIMITS.round)}</span>
      </PopoverFrame>
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/Menu',
  component: MenuCell,
  parameters: { phoneFrame: true },
  args: { preset: 'combat', onSelect: fn(), onClose: fn() },
});

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    const menu = canvas.getByRole('menu', { name: 'Actions' });
    await expect(menu.getBoundingClientRect().width).toBe(260);
    await expect(canvas.getAllByRole('menuitem')).toHaveLength(5);
    await expect(canvas.getByRole('menuitem', { name: /Undo/ })).toHaveTextContent('12 damage');
  },
});

export const Round = meta.story({
  name: 'Round',
  render: () => <RoundCell />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('spinbutton')).toHaveValue('3');
    await expect(canvas.getByText('1–99. Changing the round doesn’t move the turn.')).toBeVisible();
  },
});

export const CombatMenu = meta.story({
  name: 'Combat menu',
  args: { preset: 'combat' },
});

export const UnitActionsInUnitRow = meta.story({
  name: 'Unit actions (⋯ in UnitRow)',
  args: { preset: 'unit' },
});

export const CardActionsInCombatCardPresetCard = meta.story({
  name: 'Card actions (⋯ in CombatCard, PresetCard)',
  args: { preset: 'card', width: 240 },
});

export const PlayerMenu = meta.story({
  name: 'Player menu',
  args: { preset: 'player', width: 240 },
});

export const Ru = meta.story({
  name: 'ru',
  args: {
    items: [
      { id: 'addUnit', icon: IconUserPlus, label: 'Добавить юнита' },
      { id: 'undo', icon: IconArrowBackUp, label: 'Отменить', hint: '12 урона' },
      { id: 'share', icon: IconShare, label: 'Поделиться' },
      { id: 'restart', icon: IconRefresh, label: 'Перезапустить бой', divider: true },
      { id: 'clear', icon: IconTrash, label: 'Очистить бой', tone: 'danger' },
    ],
  },
});

export const De = meta.story({
  name: 'de',
  args: {
    items: [
      { id: 'duplicate', icon: IconCopy, label: 'Duplizieren' },
      { id: 'disable', icon: IconPlayerPause, label: 'Deaktivieren' },
      { id: 'saveAsPreset', icon: IconBookmark, label: 'Als Vorlage speichern' },
      { id: 'releaseClaim', icon: IconUserOff, label: 'Anspruch freigeben' },
      { id: 'remove', icon: IconUserMinus, label: 'Entfernen', tone: 'danger', divider: true },
    ],
  },
  play: async ({ canvas }) => {
    const menu = canvas.getByRole('menu');
    await expect(menu.getBoundingClientRect().width).toBe(260);
    await expect(canvas.getByRole('menuitem', { name: 'Als Vorlage speichern' })).toBeVisible();
  },
});

const toSource = { preset: 'card', width: 240, source: 'iconButton', opened: false } as const;

function focusInside(menu: HTMLElement): boolean {
  return menu.contains(document.activeElement);
}

export const ExtraSourceOpen = meta.story({
  name: 'Open at the source with the ring',
  args: { ...toSource, opened: true },
  play: async ({ canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveAttribute('data-open');
    await expect(getComputedStyle(more).backgroundColor).toBe('rgb(255, 231, 163)');
    await expect(canvas.getByRole('menu')).toBeVisible();
  },
});

export const ExtraSelect = meta.story({
  name: 'Tap on an item selects, closes and returns focus',
  args: toSource,
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).not.toHaveAttribute('data-open');
    await userEvent.click(more);
    await expect(more).toHaveAttribute('data-open');
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Duplicate' }));
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith('duplicate');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).not.toHaveAttribute('data-open');
    await expect(more).toHaveFocus();
  },
});

export const ExtraEscape = meta.story({
  name: 'Escape closes with no selection',
  args: toSource,
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.click(more);
    const first = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await waitFor(() => expect(first).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(more).toHaveFocus());
  },
});

export const ExtraEscapeOnSource = meta.story({
  name: 'Escape with focus on the source closes',
  args: toSource,
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.click(more);
    await canvas.findByRole('menu');
    more.focus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
  },
});

export const ExtraTab = meta.story({
  name: 'Tab and Shift+Tab close and return focus to the source',
  args: toSource,
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.click(more);
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await userEvent.tab();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
    await expect(args.onClose).toHaveBeenCalledTimes(2);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
});

export const ExtraTapInsidePanel = meta.story({
  name: 'Tap on padding, divider or a disabled item keeps focus in the panel',
  args: { ...toSource, preset: 'unit', width: 260, disabledIds: ['releaseClaim'] },
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    const menu = await canvas.findByRole('menu');
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await userEvent.click(menu);
    await expect(focusInside(menu)).toBe(true);
    const divider = canvasElement.querySelector<HTMLElement>('[role="separator"]');
    await expect(divider).not.toBeNull();
    if (divider) await userEvent.click(divider, { pointerEventsCheck: 0 });
    await expect(focusInside(menu)).toBe(true);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Release claim' }), {
      pointerEventsCheck: 0,
    });
    await expect(focusInside(menu)).toBe(true);
    await expect(args.onSelect).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const ExtraOutsideTap = meta.story({
  name: 'Outside tap closes with no selection',
  args: toSource,
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await canvas.findByRole('menu');
    const outside = canvasElement.querySelector<HTMLElement>('[data-stage]');
    await expect(outside).not.toBeNull();
    if (outside) await userEvent.click(outside);
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const ExtraEditCloses = meta.story({
  name: 'Tap on Edit next to the source closes the menu',
  args: { ...toSource, source: 'cardActions', onEdit: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await canvas.findByRole('menu');
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Arrow keys skip disabled items',
  args: { ...toSource, preset: 'unit', width: 260, disabledIds: ['releaseClaim'] },
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    more.focus();
    await userEvent.keyboard('{Enter}');
    const duplicate = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await waitFor(() => expect(duplicate).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Disable' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Save as preset' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(duplicate).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: 'Save as preset' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith('saveAsPreset');
    await expect(args.onSelect).not.toHaveBeenCalledWith('releaseClaim');
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
});

export const ExtraMotionOn = meta.story({
  name: 'Motion on: Enter on the source focuses the first item',
  args: toSource,
  parameters: { motion: 'on' },
  play: async ({ args, canvas }) => {
    await expect(document.documentElement.dataset.motion).toBe('on');
    const more = canvas.getByRole('button', { name: 'More actions' });
    more.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
  },
});

export const ExtraDisabled = meta.story({
  name: 'A disabled item never fires',
  args: { preset: 'unit', disabledIds: ['releaseClaim'] },
  play: async ({ args, canvas }) => {
    const release = canvas.getByRole('menuitem', { name: 'Release claim' });
    await expect(release).toBeDisabled();
    await userEvent.click(release, { pointerEventsCheck: 0 });
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menu')).toBeVisible();
  },
});
