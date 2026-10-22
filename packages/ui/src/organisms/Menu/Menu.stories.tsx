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
import { Sheet } from '../Sheet/Sheet.tsx';
import { Menu, PopoverFrame } from './Menu.tsx';
import type { MenuItem } from './Menu.tsx';
import { storyT } from '../../storybook/storyT.ts';

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
  onSheetClose?: () => void;
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
    player: [{ id: 'heroes', icon: IconSwitchHorizontal, label: t('heroes') }],
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

const toSource = { preset: 'card', width: 240, source: 'iconButton', opened: false } as const;

function focusInside(menu: HTMLElement): boolean {
  return menu.contains(document.activeElement);
}

export const CombatMenu = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const menu = canvas.getByRole('menu', { name: t('menuLabel') });
    await expect(menu.getBoundingClientRect().width).toBe(260);
    await expect(canvas.getAllByRole('menuitem')).toHaveLength(5);
    await expect(
      canvas.getByRole('menuitem', { name: (label: string) => label.startsWith(t('undo')) }),
    ).toHaveTextContent(t('undoHint', { n: 12 }));
  },
});

export const RoundPopover = meta.story({
  render: () => <RoundCell />,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    await expect(canvas.getByRole('spinbutton')).toHaveValue('3');
    await expect(canvas.getByText(t('roundHint', { min: 1, max: 99 }))).toBeVisible();
  },
});

export const UnitMenu = meta.story({
  args: { preset: 'unit' },
});

export const CardMenu = meta.story({
  args: { preset: 'card', width: 240 },
});

export const PlayerMenu = meta.story({
  args: { preset: 'player', width: 240 },
});

export const OpenAtSource = meta.story({
  args: { ...toSource, opened: true },
  play: async ({ canvas }) => {
    const more = canvas.getByRole('button', { name: moreLabel });
    await expect(more).toHaveAttribute('data-open');
    await expect(getComputedStyle(more).backgroundColor).toBe('rgb(255, 231, 163)');
    await expect(canvas.getByRole('menu')).toBeVisible();
  },
});

export const DisabledItem = meta.story({
  args: { preset: 'unit', disabledIds: ['releaseClaim'] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const release = canvas.getByRole('menuitem', { name: t('releaseClaim') });
    await expect(release).toBeDisabled();
    await userEvent.click(release, { pointerEventsCheck: 0 });
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menu')).toBeVisible();
  },
});

export const LongLabel = meta.story({
  args: {
    items: [
      { id: 'duplicate', icon: IconCopy, label: 'Дублировать вместе с состояниями' },
      { id: 'saveAsPreset', icon: IconBookmark, label: 'Сохранить как заготовку в библиотеке' },
      {
        id: 'remove',
        icon: IconUserMinus,
        label: 'Убрать из боя насовсем',
        tone: 'danger',
        divider: true,
      },
    ],
  },
  play: async ({ canvas }) => {
    const menu = canvas.getByRole('menu');
    await expect(menu.getBoundingClientRect().width).toBe(260);
    await expect(
      canvas.getByRole('menuitem', { name: 'Сохранить как заготовку в библиотеке' }),
    ).toBeVisible();
  },
});

export const TapItemSelects = meta.story({
  tags: ['!dev'],
  args: toSource,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const more = canvas.getByRole('button', { name: moreLabel });
    await expect(more).not.toHaveAttribute('data-open');
    await userEvent.click(more);
    await expect(more).toHaveAttribute('data-open');
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('duplicate') }));
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith('duplicate');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).not.toHaveAttribute('data-open');
    await expect(more).toHaveFocus();
  },
});

export const EscapeCloses = meta.story({
  tags: ['!dev'],
  args: toSource,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const more = canvas.getByRole('button', { name: moreLabel });
    await userEvent.click(more);
    const first = await canvas.findByRole('menuitem', { name: t('duplicate') });
    await waitFor(() => expect(first).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(more).toHaveFocus());
  },
});

export const EscapeOnSourceCloses = meta.story({
  tags: ['!dev'],
  args: toSource,
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: moreLabel });
    await userEvent.click(more);
    await canvas.findByRole('menu');
    more.focus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
  },
});

export const TabClosesToSource = meta.story({
  tags: ['!dev'],
  args: toSource,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const more = canvas.getByRole('button', { name: moreLabel });
    await userEvent.click(more);
    await waitFor(() =>
      expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toHaveFocus(),
    );
    await userEvent.tab();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toHaveFocus(),
    );
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
    await expect(args.onClose).toHaveBeenCalledTimes(2);
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
});

export const TapInsideKeepsFocus = meta.story({
  tags: ['!dev'],
  args: { ...toSource, preset: 'unit', width: 260, disabledIds: ['releaseClaim'] },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Menu');
    await userEvent.click(canvas.getByRole('button', { name: moreLabel }));
    const menu = await canvas.findByRole('menu');
    await waitFor(() =>
      expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toHaveFocus(),
    );
    await userEvent.click(menu);
    await expect(focusInside(menu)).toBe(true);
    const divider = canvasElement.querySelector<HTMLElement>('[role="separator"]');
    await expect(divider).not.toBeNull();
    if (divider) await userEvent.click(divider, { pointerEventsCheck: 0 });
    await expect(focusInside(menu)).toBe(true);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('releaseClaim') }), {
      pointerEventsCheck: 0,
    });
    await expect(focusInside(menu)).toBe(true);
    await expect(args.onSelect).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const OutsideTapCloses = meta.story({
  tags: ['!dev'],
  args: toSource,
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: moreLabel }));
    await canvas.findByRole('menu');
    const outside = canvasElement.querySelector<HTMLElement>('[data-stage]');
    await expect(outside).not.toBeNull();
    if (outside) await userEvent.click(outside);
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const EditNextToSourceCloses = meta.story({
  tags: ['!dev'],
  args: { ...toSource, source: 'cardActions', onEdit: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    await canvas.findByRole('menu');
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:edit') }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const ArrowsSkipDisabled = meta.story({
  tags: ['!dev'],
  args: { ...toSource, preset: 'unit', width: 260, disabledIds: ['releaseClaim'] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const more = canvas.getByRole('button', { name: moreLabel });
    more.focus();
    await userEvent.keyboard('{Enter}');
    const duplicate = await canvas.findByRole('menuitem', { name: t('duplicate') });
    await waitFor(() => expect(duplicate).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: t('disable') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: t('saveAsPreset') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: t('remove') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(duplicate).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: t('remove') })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: t('saveAsPreset') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith('saveAsPreset');
    await expect(args.onSelect).not.toHaveBeenCalledWith('releaseClaim');
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
});

export const MotionOnFocusesFirstItem = meta.story({
  tags: ['!dev'],
  args: toSource,
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    await expect(document.documentElement.dataset.motion).toBe('on');
    const more = canvas.getByRole('button', { name: moreLabel });
    more.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toHaveFocus(),
    );
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: t('delete') })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveFocus();
  },
});

export const ReopenDuringExit = meta.story({
  tags: ['!dev'],
  args: toSource,
  parameters: { motion: 'on' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const more = canvas.getByRole('button', { name: moreLabel });
    more.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toHaveFocus(),
    );
    await userEvent.keyboard('{Escape}');
    await expect(more).toHaveFocus();
    await expect(canvas.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toHaveFocus(),
    );
  },
});

export const EscapeInsideSheetClosesMenu = meta.story({
  tags: ['!dev'],
  args: { ...toSource, onSheetClose: fn() },
  render: ({ onSheetClose, ...args }) => (
    <Sheet opened title="Orc Berserker" onClose={onSheetClose ?? (() => undefined)}>
      <MenuCell {...args} />
    </Sheet>
  ),
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Menu');
    const more = await canvas.findByRole('button', { name: moreLabel });
    await userEvent.click(more);
    const first = await canvas.findByRole('menuitem', { name: t('duplicate') });
    await waitFor(() => expect(first).toHaveFocus());
    await expect(first).toHaveAttribute('data-mantine-stop-propagation', 'true');
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSheetClose).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByRole('dialog', { name: 'Orc Berserker' })).toBeVisible();
  },
});
