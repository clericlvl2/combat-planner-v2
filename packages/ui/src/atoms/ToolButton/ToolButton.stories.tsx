import preview from '#.storybook/preview';
import { IconSortDescending, IconTags } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/ToolButton.json';
import { ToolButton } from './ToolButton.tsx';
import type { ToolButtonProps } from './ToolButton.tsx';

type LabelKey = keyof typeof en;

interface ToolButtonCellProps extends Omit<ToolButtonProps, 'label' | 'aria-label'> {
  labelKey?: LabelKey;
  label?: string;
  ariaKey?: LabelKey;
}

function ToolButtonCell({ labelKey, label, ariaKey, ...props }: ToolButtonCellProps) {
  const { t } = useTranslation('ToolButton');
  return (
    <ToolButton
      {...props}
      label={label ?? (labelKey ? t(labelKey) : undefined)}
      aria-label={ariaKey ? t(ariaKey) : undefined}
    />
  );
}

const meta = preview.meta({
  title: 'Atoms/ToolButton',
  component: ToolButtonCell,
  args: { onClick: fn() },
});

const renderPressed = (args: ToolButtonCellProps) => <ToolButtonCell {...args} data-pressed="" />;

const renderFocus = (args: ToolButtonCellProps) => <ToolButtonCell {...args} data-focus="" />;

const sortDefault = { icon: IconSortDescending, ariaKey: 'sort' } as const;
const sortActive = { icon: IconSortDescending, labelKey: 'lastPlayed', active: true } as const;
const tagsDefault = { icon: IconTags, labelKey: 'tags' } as const;
const tagsActiveCount = { icon: IconTags, labelKey: 'tags', count: 2, active: true } as const;

export const Anatomy = meta.story({
  args: { ...tagsActiveCount, size: 'M' },
});

export const SortDefaultDefault = meta.story({
  name: 'Sort · default · default',
  args: sortDefault,
});

export const SortDefaultPressed = meta.story({
  name: 'Sort · default · pressed',
  args: sortDefault,
  render: renderPressed,
});

export const SortDefaultDisabled = meta.story({
  name: 'Sort · default · disabled',
  args: { ...sortDefault, disabled: true },
});

export const SortDefaultFocus = meta.story({
  name: 'Sort · default · focus',
  args: sortDefault,
  render: renderFocus,
});

export const SortActiveDefault = meta.story({
  name: 'Sort · active · default',
  args: sortActive,
});

export const SortActivePressed = meta.story({
  name: 'Sort · active · pressed',
  args: sortActive,
  render: renderPressed,
});

export const SortActiveDisabled = meta.story({
  name: 'Sort · active · disabled',
  args: { ...sortActive, disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Last played' });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const SortActiveFocus = meta.story({
  name: 'Sort · active · focus',
  args: sortActive,
  render: renderFocus,
});

export const TagsDefaultDefault = meta.story({
  name: 'Tags · default · default',
  args: tagsDefault,
});

export const TagsDefaultPressed = meta.story({
  name: 'Tags · default · pressed',
  args: tagsDefault,
  render: renderPressed,
});

export const TagsDefaultDisabled = meta.story({
  name: 'Tags · default · disabled',
  args: { ...tagsDefault, disabled: true },
});

export const TagsDefaultFocus = meta.story({
  name: 'Tags · default · focus',
  args: tagsDefault,
  render: renderFocus,
});

export const TagsActiveCountDefault = meta.story({
  name: 'Tags · active + count · default',
  args: tagsActiveCount,
});

export const TagsActiveCountPressed = meta.story({
  name: 'Tags · active + count · pressed',
  args: tagsActiveCount,
  render: renderPressed,
});

export const TagsActiveCountDisabled = meta.story({
  name: 'Tags · active + count · disabled',
  args: { ...tagsActiveCount, disabled: true },
});

export const TagsActiveCountFocus = meta.story({
  name: 'Tags · active + count · focus',
  args: tagsActiveCount,
  render: renderFocus,
});

export const ToolButtonIconS = meta.story({
  name: 'ToolButton · icon · S',
  args: { ...sortDefault, size: 'S' },
});

export const ToolButtonIconM = meta.story({
  name: 'ToolButton · icon · M',
  args: { ...sortDefault, size: 'M' },
});

export const ToolButtonIconL = meta.story({
  name: 'ToolButton · icon · L',
  args: { ...sortDefault, size: 'L' },
});

export const ToolButtonLabelCountS = meta.story({
  name: 'ToolButton · label + count · S',
  args: { ...tagsActiveCount, size: 'S' },
});

export const ToolButtonLabelCountM = meta.story({
  name: 'ToolButton · label + count · M',
  args: { ...tagsActiveCount, size: 'M' },
});

export const ToolButtonLabelCountL = meta.story({
  name: 'ToolButton · label + count · L',
  args: { ...tagsActiveCount, size: 'L' },
});

export const ActiveEn = meta.story({
  name: 'Active · en',
  args: sortActive,
});

export const ActiveDe = meta.story({
  name: 'Active · de',
  args: { icon: IconSortDescending, label: 'Zuletzt gespielt', active: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Zuletzt gespielt' });
    await expect(button.getBoundingClientRect().height).toBe(48);
  },
});

export const ActiveRu = meta.story({
  name: 'Active · ru',
  args: { icon: IconSortDescending, label: 'Последняя игра', active: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Последняя игра' });
    await expect(button.getBoundingClientRect().height).toBe(48);
  },
});

export const ActiveCount12 = meta.story({
  name: 'Active · count 12',
  args: { ...tagsActiveCount, count: 12 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Tags 12' })).toBeVisible();
  },
});

export const ExtraClick = meta.story({
  name: 'Click',
  args: { ...sortDefault, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { ...tagsActiveCount, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Tags 2' });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraSizes = meta.story({
  name: 'Heights and icon sizes',
  args: sortDefault,
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <ToolButtonCell {...args} size="S" />
      <ToolButtonCell {...args} size="M" />
      <ToolButtonCell {...args} size="L" />
    </div>
  ),
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button', { name: 'Sort' });
    const heights = buttons.map((button) => button.getBoundingClientRect().height);
    const icons = buttons.map((button) => button.querySelector('svg')?.getAttribute('width'));
    await expect(heights).toEqual([40, 48, 56]);
    await expect(icons).toEqual(['16', '20', '24']);
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: tagsActiveCount,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Schlagwörter 2' })).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: tagsActiveCount,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Etiquetas 2' })).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: tagsActiveCount,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Étiquettes 2' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: sortActive,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '最後のプレイ' })).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: sortActive,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Последняя игра' })).toBeVisible();
  },
});
