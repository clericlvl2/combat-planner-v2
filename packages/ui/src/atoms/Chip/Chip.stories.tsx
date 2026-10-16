import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Chip.json';
import { base, conditionNames, conditions } from '../../theme.ts';
import { Chip } from './Chip.tsx';
import type { ChipProps } from './Chip.tsx';

type LabelKey = keyof typeof en;

interface ChipCellProps extends Omit<ChipProps, 'children'> {
  labelKey?: LabelKey;
  label?: string;
}

function ChipCell({
  labelKey = 'goblins',
  label,
  selected = false,
  onClick,
  onRemove,
  ...props
}: ChipCellProps) {
  const { t } = useTranslation('Chip');
  const [isSelected, setSelected] = useState(selected);
  const text = label ?? t(labelKey);
  return (
    <Chip
      {...props}
      selected={isSelected}
      aria-label={onRemove ? t('remove', { label: text }) : undefined}
      onRemove={onRemove}
      onClick={
        onClick
          ? (event) => {
              setSelected((value) => !value);
              onClick(event);
            }
          : undefined
      }
    >
      {text}
    </Chip>
  );
}

const meta = preview.meta({
  title: 'Atoms/Chip',
  component: ChipCell,
});

const renderPressed = (args: ChipCellProps) => <ChipCell {...args} data-pressed="" />;

const renderTap = (args: ChipCellProps) => <ChipCell {...args} data-tap="" />;

const tag = () => ({ variant: 'tag', labelKey: 'goblins', onClick: fn() }) as const;
const tagActive = () =>
  ({ variant: 'tag', labelKey: 'orcs', selected: true, onRemove: fn() }) as const;
const add = () => ({ variant: 'add', labelKey: 'addTag', onClick: fn() }) as const;
const staggered = { variant: 'condition', condition: 'staggered', labelKey: 'staggered' } as const;
const statusActive = { variant: 'status', labelKey: 'active', selected: true } as const;
const metaChip = { variant: 'meta', labelKey: 'namedNpcs' } as const;

const rgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
};

const heightOf = (element: HTMLElement) => element.getBoundingClientRect().height;

export const Anatomy = meta.story({
  args: { ...tagActive(), count: 2 },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Remove Orcs' });
    await expect(chip).toHaveTextContent('Orcs2');
    await expect(heightOf(chip)).toBe(36);
  },
});

export const TagDefault = meta.story({
  name: 'Tag default',
  args: tag(),
});

export const TagPressed = meta.story({
  name: 'Tag pressed',
  args: tag(),
  render: renderPressed,
});

export const TagTap = meta.story({
  name: 'Tag tap',
  args: tag(),
  render: renderTap,
});

export const TagActiveDefault = meta.story({
  name: 'TagActive + × default',
  args: tagActive(),
});

export const TagActivePressed = meta.story({
  name: 'TagActive + × pressed',
  args: tagActive(),
  render: renderPressed,
});

export const TagActiveTap = meta.story({
  name: 'TagActive + × tap',
  args: tagActive(),
  render: renderTap,
});

export const AddDefault = meta.story({
  name: 'Add default',
  args: add(),
});

export const AddPressed = meta.story({
  name: 'Add pressed',
  args: add(),
  render: renderPressed,
});

export const AddTap = meta.story({
  name: 'Add tap',
  args: add(),
  render: renderTap,
});

export const TagS20 = meta.story({
  name: 'Tag S · 20',
  args: { ...tag(), size: 'S' },
  play: async ({ canvas }) => {
    await expect(heightOf(canvas.getByRole('button', { name: 'Goblins' }))).toBe(20);
  },
});

export const TagM28 = meta.story({
  name: 'Tag M · 28',
  args: { ...tag(), size: 'M' },
  play: async ({ canvas }) => {
    await expect(heightOf(canvas.getByRole('button', { name: 'Goblins' }))).toBe(28);
  },
});

export const TagL36 = meta.story({
  name: 'Tag L · 36',
  args: { ...tag(), size: 'L' },
  play: async ({ canvas }) => {
    await expect(heightOf(canvas.getByRole('button', { name: 'Goblins' }))).toBe(36);
  },
});

export const TagActiveS20 = meta.story({
  name: 'TagActive + × S · 20',
  args: { ...tagActive(), size: 'S' },
});

export const TagActiveM28 = meta.story({
  name: 'TagActive + × M · 28',
  args: { ...tagActive(), size: 'M' },
});

export const TagActiveL36 = meta.story({
  name: 'TagActive + × L · 36',
  args: { ...tagActive(), size: 'L' },
});

export const AddS20 = meta.story({
  name: 'Add S · 20',
  args: { ...add(), size: 'S' },
});

export const AddM28 = meta.story({
  name: 'Add M · 28',
  args: { ...add(), size: 'M' },
});

export const AddL36 = meta.story({
  name: 'Add L · 36',
  args: { ...add(), size: 'L' },
});

export const ConditionS20 = meta.story({
  name: 'Condition S · 20',
  args: { ...staggered, size: 'S' },
  play: async ({ canvas }) => {
    const chip = canvas.getByText('staggered').parentElement as HTMLElement;
    await expect(heightOf(chip)).toBe(20);
    await expect(getComputedStyle(chip).backgroundColor).toBe(rgb(conditions.staggered.fill));
    await expect(getComputedStyle(chip).color).toBe(rgb(conditions.staggered.text));
  },
});

export const ConditionM28 = meta.story({
  name: 'Condition M · 28',
  args: { ...staggered, size: 'M' },
});

export const ConditionL36 = meta.story({
  name: 'Condition L · 36',
  args: { ...staggered, size: 'L' },
});

export const StatusS20 = meta.story({
  name: 'Status S · 20',
  args: { ...statusActive, size: 'S' },
});

export const StatusM28 = meta.story({
  name: 'Status M · 28',
  args: { ...statusActive, size: 'M' },
});

export const StatusL36 = meta.story({
  name: 'Status L · 36',
  args: { ...statusActive, size: 'L' },
});

export const MetaS20 = meta.story({
  name: 'Meta S · 20',
  args: { ...metaChip, size: 'S' },
});

export const MetaM28 = meta.story({
  name: 'Meta M · 28',
  args: { ...metaChip, size: 'M' },
});

export const MetaL36 = meta.story({
  name: 'Meta L · 36',
  args: { ...metaChip, size: 'L' },
});

export const TagLDe = meta.story({
  name: 'Tag, L de',
  args: { ...tag(), label: 'Untote Wächter' },
});

export const TagLRu = meta.story({
  name: 'Tag, L ru',
  args: { ...tag(), label: 'Нежить и призраки' },
});

export const TagLJa = meta.story({
  name: 'Tag, L ja',
  args: { ...tag(), label: 'アンデッド' },
});

export const TagLCount12 = meta.story({
  name: 'Tag, L count 12',
  args: { ...tagActive(), labelKey: 'ferry', count: 12 },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Remove Ferry' });
    await expect(chip).toHaveTextContent('Ferry12');
    await expect(heightOf(chip)).toBe(36);
  },
});

export const ConditionSDe = meta.story({
  name: 'Condition, S de',
  args: { variant: 'condition', size: 'S', label: 'verwundbar' },
});

export const ConditionSRu = meta.story({
  name: 'Condition, S ru',
  args: { variant: 'condition', size: 'S', label: 'ошеломлён' },
});

export const ConditionSJa = meta.story({
  name: 'Condition, S ja',
  args: { variant: 'condition', size: 'S', label: '朦朧' },
});

export const ExtraToggle = meta.story({
  name: 'Toggle a tag',
  args: tag(),
  play: async ({ args, canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Goblins' });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    await expect(args.onClick).toHaveBeenCalledOnce();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(chip).toHaveAttribute('data-selected');
    await expect(getComputedStyle(chip).backgroundColor).toBe('rgb(35, 31, 28)');
    await userEvent.click(chip);
    await expect(args.onClick).toHaveBeenCalledTimes(2);
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(chip).not.toHaveAttribute('data-selected');
  },
});

export const ExtraRemove = meta.story({
  name: 'Remove an active tag',
  args: tagActive(),
  play: async ({ args, canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Remove Orcs' });
    await expect(chip).not.toHaveAttribute('aria-pressed');
    await userEvent.click(chip);
    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: add(),
  play: async ({ args, canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Add tag' });
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraToggleKeyboard = meta.story({
  name: 'Keyboard: Enter and Space toggle a tag',
  args: tag(),
  play: async ({ args, canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Goblins' });
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Enter}');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('[Space]');
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraPressedFills = meta.story({
  name: 'Pressed keeps condition, status and meta fills',
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <ChipCell {...staggered} data-pressed="" />
      <ChipCell {...statusActive} data-pressed="" />
      <ChipCell {...metaChip} data-pressed="" />
    </div>
  ),
  play: async ({ canvas }) => {
    const fills = ['staggered', 'Active', 'Named NPCs'].map(
      (text) =>
        getComputedStyle(canvas.getByText(text).closest('[data-variant]') as Element)
          .backgroundColor,
    );
    await expect(fills).toEqual([rgb(conditions.staggered.fill), rgb(base.accent), rgb(base.soft)]);
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { ...tag(), disabled: true },
  play: async ({ args, canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Goblins' });
    await expect(chip).toBeDisabled();
    await userEvent.click(chip, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
  },
});

export const ExtraDisplayOnly = meta.story({
  name: 'Condition, status and meta are display only',
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <ChipCell {...staggered} />
      <ChipCell variant="status" labelKey="setup" />
      <ChipCell {...statusActive} />
      <ChipCell {...metaChip} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    const setup = canvas.getByText('Setup').parentElement as HTMLElement;
    await expect(getComputedStyle(setup).backgroundColor).toBe('rgb(243, 237, 226)');
    await expect(getComputedStyle(setup).color).toBe('rgb(95, 87, 77)');
    const active = canvas.getByText('Active').parentElement as HTMLElement;
    await expect(getComputedStyle(active).backgroundColor).toBe('rgb(255, 231, 163)');
  },
});

export const ExtraConditions = meta.story({
  name: 'All conditions',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {conditionNames.map((name) => (
        <ChipCell key={name} variant="condition" condition={name} labelKey={name} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const name of conditionNames) {
      const chip = canvasElement.querySelector<HTMLElement>(`[data-condition='${name}']`);
      await expect(chip).not.toBeNull();
      if (!chip) continue;
      await expect(chip).toHaveTextContent(name);
      await expect(getComputedStyle(chip).backgroundColor).toBe(rgb(conditions[name].fill));
      await expect(getComputedStyle(chip).color).toBe(rgb(conditions[name].text));
    }
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { ...tagActive(), count: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Orks entfernen' })).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: add(),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Добавить тег' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {conditionNames.map((name) => (
        <ChipCell key={name} variant="condition" condition={name} labelKey={name} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('よろめき')).toBeVisible();
  },
});
