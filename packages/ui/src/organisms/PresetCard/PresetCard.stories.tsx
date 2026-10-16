import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PresetCard } from './PresetCard.tsx';
import type { PresetCardPreset, PresetCardProps } from './PresetCard.tsx';

interface PresetCardCellProps extends Omit<
  PresetCardProps,
  'preset' | 'tags' | 'expanded' | 'onToggle' | 'onEdit' | 'onMore'
> {
  preset?: PresetCardPreset;
  tags?: readonly string[];
  expanded?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onMore?: () => void;
}

const orc: PresetCardPreset = {
  name: 'Orc Berserker',
  role: 'enemy',
  maxHp: 40,
  ac: 18,
  pd: 16,
  md: 12,
};

const orcTags = ['Orcs', 'Ferry'];

function PresetCardCell({
  preset = orc,
  tags = orcTags,
  expanded: initiallyExpanded = false,
  menuOpened: initiallyOpened = false,
  onToggle,
  onEdit,
  onMore,
  onMenuClose,
  ...props
}: PresetCardCellProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [menuOpened, setMenuOpened] = useState(initiallyOpened);
  return (
    <div style={{ width: 342, paddingBottom: expanded && menuOpened ? 150 : 0 }}>
      <PresetCard
        {...props}
        preset={preset}
        tags={tags}
        expanded={expanded}
        menuOpened={menuOpened}
        onToggle={() => {
          setExpanded((value) => !value);
          setMenuOpened(false);
          onToggle?.();
        }}
        onEdit={() => onEdit?.()}
        onMore={() => {
          setMenuOpened((value) => !value);
          onMore?.();
        }}
        onMenuClose={() => {
          setMenuOpened(false);
          onMenuClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/PresetCard',
  component: PresetCardCell,
  args: {
    onToggle: fn(),
    onEdit: fn(),
    onMore: fn(),
    onMenuClose: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
  },
});

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Orc Berserker')).toBeVisible();
    await expect(canvas.getByText('Orcs · Ferry')).toBeVisible();
    await expect(canvas.getByText('40')).toBeVisible();
    await expect(canvas.getByRole('group', { name: /^AC\s18\s· PD\s16\s· MD\s12$/ })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Actions: Orc Berserker' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
  },
});

export const Enemy = meta.story({
  name: 'Enemy',
});

export const NoTags = meta.story({
  name: 'No tags',
  args: {
    preset: { name: 'Bandit Captain', role: 'enemy', maxHp: 36, ac: 17, pd: 15, md: 13 },
    tags: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No tags')).toBeVisible();
  },
});

export const Expanded = meta.story({
  name: 'Expanded',
  args: { expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Actions: Orc Berserker' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'More actions' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const ExpandedOpen = meta.story({
  name: 'Expanded, ⋯ open',
  args: { expanded: true, menuOpened: true },
  play: async ({ canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(more).toHaveAttribute('data-open');
    await expect(await canvas.findByRole('menu', { name: 'Preset actions' })).toBeVisible();
    await expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  },
});

export const AllyLongName = meta.story({
  name: 'Ally, long name',
  args: {
    preset: {
      name: 'Brother Tomas of the Silver Lantern Order',
      role: 'ally',
      maxHp: 30,
      ac: 19,
      pd: 15,
      md: 17,
    },
    tags: ['Allies', 'Named NPCs'],
  },
  play: async ({ canvas }) => {
    const name = canvas.getByText('Brother Tomas of the Silver Lantern Order');
    await expect(name.getBoundingClientRect().height).toBeGreaterThan(40);
    await expect(canvas.getByText('Allies · Named NPCs')).toBeVisible();
  },
});

export const ThreeDigitHP = meta.story({
  name: 'Three-digit HP',
  args: {
    preset: { name: 'Ancient Black Dragon', role: 'enemy', maxHp: 320, ac: 24, pd: 22, md: 20 },
    tags: ['Dragons', 'Bosses'],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('320')).toBeVisible();
    await expect(canvas.getByText('Dragons · Bosses')).toBeVisible();
  },
});

export const Ru = meta.story({
  name: 'ru',
  args: {
    preset: {
      name: 'Капитан стражи переправы',
      role: 'ally',
      maxHp: 40,
      ac: 19,
      pd: 16,
      md: 13,
    },
    tags: ['Переправа', 'Именные НПС'],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Капитан стражи переправы')).toBeVisible();
    await expect(canvas.getByText('Переправа · Именные НПС')).toBeVisible();
  },
});

export const ExtraTapChevron = meta.story({
  name: 'Tap chevron',
  play: async ({ args, canvas }) => {
    const chevron = canvas.getByRole('button', { name: 'Actions: Orc Berserker' });
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
    chevron.setAttribute('data-tap', '');
    await expect(chevron).toHaveAttribute('data-tap');
  },
});

export const ExtraExpandedTapEdit = meta.story({
  name: 'Expanded, tap Edit',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    const edit = canvas.getByRole('button', { name: 'Edit' });
    await userEvent.click(edit);
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onMore).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
    edit.setAttribute('data-tap', '');
    await expect(edit).toHaveAttribute('data-tap');
  },
});

export const ExtraMoreDuplicate = meta.story({
  name: '⋯ opens the menu, Duplicate fires',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.click(more);
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    const duplicate = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await waitFor(() => expect(duplicate).toHaveFocus());
    await userEvent.click(duplicate);
    await expect(args.onDuplicate).toHaveBeenCalledOnce();
    await expect(args.onDelete).not.toHaveBeenCalled();
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(more).toHaveFocus());
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: chevron, Edit, ⋯ and Delete',
  play: async ({ args, canvas }) => {
    const chevron = canvas.getByRole('button', { name: 'Actions: Orc Berserker' });
    await userEvent.tab();
    await expect(chevron).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.tab();
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onMore).toHaveBeenCalledOnce();
    const duplicate = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await waitFor(() => expect(duplicate).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(args.onDuplicate).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(more).toHaveFocus());
  },
});

export const ExtraKeyboardMotionOn = meta.story({
  name: 'Keyboard with motion: Space opens ⋯, Escape closes',
  parameters: { motion: 'on' },
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    more.focus();
    await expect(more).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onMore).toHaveBeenCalledOnce();
    const duplicate = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await waitFor(() => expect(duplicate).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await expect(args.onDuplicate).not.toHaveBeenCalled();
    await expect(args.onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(more).toHaveFocus());
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  },
});

export const ExtraBodyIsNotATarget = meta.story({
  name: 'Name, HP and defenses do not fire',
  play: async ({ args, canvas }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByText('Orc Berserker'));
    await userEvent.click(canvas.getByText('40'));
    await userEvent.click(canvas.getByRole('group', { name: /^AC\s18\s· PD\s16\s· MD\s12$/ }));
    await userEvent.click(canvas.getByText('Orcs · Ferry'));
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Actions: Orc Berserker' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const ExtraTagLineEllipsis = meta.story({
  name: 'Tag line ellipsises after two lines',
  args: {
    tags: ['Orcs', 'Ferry', 'Bosses', 'Named NPCs', 'Mountains', 'Night ambush', 'Chapter 3'],
  },
  play: async ({ canvas }) => {
    const line = canvas.getByText(/^Orcs · Ferry · Bosses/);
    await expect(getComputedStyle(line).textOverflow).toBe('ellipsis');
    await expect(line.scrollHeight).toBeGreaterThan(line.clientHeight);
    await expect(line.clientHeight).toBe(30);
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { tags: [], expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('タグなし')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '操作: Orc Berserker' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '編集' })).toBeVisible();
  },
});
