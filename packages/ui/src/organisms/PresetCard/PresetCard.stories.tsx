import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PresetCard } from './PresetCard.tsx';
import type { PresetCardPreset, PresetCardProps } from './PresetCard.tsx';
import { layout } from '../../layout.ts';
import { escapeRegExp, storyT } from '../../storybook/storyT.ts';
import type { TFunction } from 'i18next';

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
    <div
      style={{
        padding: layout.contentEdge,
        paddingBottom: expanded && menuOpened ? 150 : layout.contentEdge,
      }}
    >
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

const defenses = (t: TFunction) =>
  new RegExp(
    `^${escapeRegExp(t('DefenseLine:ac'))}\\s18\\s· ${escapeRegExp(t('DefenseLine:pd'))}\\s16\\s· ${escapeRegExp(t('DefenseLine:md'))}\\s12$`,
  );

const meta = preview.meta({
  title: 'Organisms/PresetCard',
  component: PresetCardCell,
  parameters: { phoneFrame: true },
  args: {
    onToggle: fn(),
    onEdit: fn(),
    onMore: fn(),
    onMenuClose: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
  },
});

export const Enemy = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    await expect(canvas.getByText('Orc Berserker')).toBeVisible();
    await expect(canvas.getByText('Orcs · Ferry')).toBeVisible();
    await expect(canvas.getByText('40')).toBeVisible();
    await expect(canvas.getByRole('group', { name: defenses(t) })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Orc Berserker' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(canvas.queryByRole('button', { name: t('CardActions:edit') })).toBeNull();
  },
});

export const NoTags = meta.story({
  args: {
    preset: { name: 'Bandit Captain', role: 'enemy', maxHp: 36, ac: 17, pd: 15, md: 13 },
    tags: [],
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    await expect(canvas.getByText(t('noTags'))).toBeVisible();
  },
});

export const Expanded = meta.story({
  tags: ['visual'],
  args: { expanded: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    await expect(canvas.getByRole('button', { name: 'Orc Berserker' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:more') })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const ExpandedMenuOpen = meta.story({
  args: { expanded: true, menuOpened: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    const more = canvas.getByRole('button', { name: t('CardActions:more') });
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(more).toHaveAttribute('data-open');
    await expect(await canvas.findByRole('menu', { name: t('menuLabel') })).toBeVisible();
    await expect(canvas.getByRole('menuitem', { name: t('duplicate') })).toBeVisible();
    await expect(canvas.getByRole('menuitem', { name: t('delete') })).toBeVisible();
  },
});

export const AllyLongName = meta.story({
  tags: ['visual'],
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

export const ThreeDigitHp = meta.story({
  name: 'Three Digit HP',
  args: {
    preset: { name: 'Ancient Black Dragon', role: 'enemy', maxHp: 320, ac: 24, pd: 22, md: 20 },
    tags: ['Dragons', 'Bosses'],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('320')).toBeVisible();
    await expect(canvas.getByText('Dragons · Bosses')).toBeVisible();
    const chips = [...canvasElement.querySelectorAll('[data-stat]')];
    const tops = new Set(chips.map((chip) => chip.getBoundingClientRect().top));
    await expect(chips).toHaveLength(3);
    await expect(tops.size).toBe(1);
  },
});

export const ManyTagsEllipsis = meta.story({
  args: {
    tags: ['Orcs', 'Ferry', 'Bosses', 'Named NPCs', 'Mountains', 'Night ambush', 'Chapter 3'],
  },
  play: async ({ canvas }) => {
    const line = canvas.getByText(/^Orcs · Ferry · Bosses/);
    await expect(getComputedStyle(line).textOverflow).toBe('ellipsis');
    await expect(getComputedStyle(line).whiteSpace).toBe('nowrap');
    await expect(line.scrollWidth).toBeGreaterThan(line.clientWidth);
  },
});

export const DuplicateDisabled = meta.story({
  args: { expanded: true, menuOpened: true, duplicateDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    const duplicate = await canvas.findByRole('menuitem', { name: t('duplicate') });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(args.onDuplicate).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: t('delete') })).toBeEnabled();
  },
});
export const RoleTileInsetInCard = meta.story({
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    const role = canvasElement.querySelector<HTMLElement>('[data-fill]');
    await expect(role).not.toBeNull();
    const card = role?.closest('article');
    await expect(role?.getBoundingClientRect().height).toBe(
      (card?.getBoundingClientRect().height ?? 0) - 2 - 2 * layout.roleTile.inset,
    );
    await expect(role).toHaveAttribute('data-tile');
  },
});

export const CardTapToggles = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    const name = canvas.getByRole('button', { name: 'Orc Berserker' });
    await userEvent.click(canvas.getByText('Orcs · Ferry'));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await userEvent.click(canvas.getByRole('group', { name: defenses(t) }));
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(name).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(name);
    await expect(args.onToggle).toHaveBeenCalledTimes(3);
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});

export const EditCallsOnEdit = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    const edit = canvas.getByRole('button', { name: t('CardActions:edit') });
    await userEvent.click(edit);
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onMore).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const MoreOpensMenuDuplicateFires = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    const more = canvas.getByRole('button', { name: t('CardActions:more') });
    await userEvent.click(more);
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    const duplicate = await canvas.findByRole('menuitem', { name: t('duplicate') });
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

export const ButtonsDoNotToggle = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetCard');
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:edit') }));
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('delete') }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Orc Berserker' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
});
