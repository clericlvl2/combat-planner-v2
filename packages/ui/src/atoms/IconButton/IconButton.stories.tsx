import preview from '#.storybook/preview';
import { IconChevronLeft, IconMenu2, IconPlus, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/IconButton.json';
import { IconButton } from './IconButton.tsx';
import type { IconButtonProps } from './IconButton.tsx';

type LabelKey = keyof typeof en;

interface IconButtonCellProps extends Omit<IconButtonProps, 'aria-label'> {
  labelKey: LabelKey;
}

function IconButtonCell({ labelKey, ...props }: IconButtonCellProps) {
  const { t } = useTranslation('IconButton');
  return <IconButton {...props} aria-label={t(labelKey)} />;
}

const meta = preview.meta({
  title: 'Atoms/IconButton',
  component: IconButtonCell,
  args: { onClick: fn() },
});

const renderPressed = (args: IconButtonCellProps) => <IconButtonCell {...args} data-pressed="" />;

const renderFocus = (args: IconButtonCellProps) => <IconButtonCell {...args} data-focus="" />;

const outlineX = { variant: 'outline', icon: IconX, labelKey: 'close' } as const;
const plainMenu = { variant: 'plain', icon: IconMenu2, labelKey: 'openNavigation' } as const;
const softBack = { variant: 'soft', icon: IconChevronLeft, labelKey: 'back' } as const;
const filledPlus = { variant: 'filled', icon: IconPlus, labelKey: 'add' } as const;

export const Anatomy = meta.story({
  args: { ...outlineX, size: 'M' },
});

export const OutlineXDefault = meta.story({
  name: 'Outline · x · default',
  args: outlineX,
});

export const OutlineXPressed = meta.story({
  name: 'Outline · x · pressed',
  args: outlineX,
  render: renderPressed,
});

export const OutlineXDisabled = meta.story({
  name: 'Outline · x · disabled',
  args: { ...outlineX, disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close' });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const OutlineXFocus = meta.story({
  name: 'Outline · x · focus',
  args: outlineX,
  render: renderFocus,
});

export const PlainMenuDefault = meta.story({
  name: 'Plain · menu · default',
  args: plainMenu,
});

export const PlainMenuPressed = meta.story({
  name: 'Plain · menu · pressed',
  args: plainMenu,
  render: renderPressed,
});

export const PlainMenuDisabled = meta.story({
  name: 'Plain · menu · disabled',
  args: { ...plainMenu, disabled: true },
});

export const PlainMenuFocus = meta.story({
  name: 'Plain · menu · focus',
  args: plainMenu,
  render: renderFocus,
});

export const SoftBackDefault = meta.story({
  name: 'Soft · back · default',
  args: softBack,
});

export const SoftBackPressed = meta.story({
  name: 'Soft · back · pressed',
  args: softBack,
  render: renderPressed,
});

export const SoftBackDisabled = meta.story({
  name: 'Soft · back · disabled',
  args: { ...softBack, disabled: true },
});

export const SoftBackFocus = meta.story({
  name: 'Soft · back · focus',
  args: softBack,
  render: renderFocus,
});

export const FilledPlusDefault = meta.story({
  name: 'Filled · plus · default',
  args: filledPlus,
});

export const FilledPlusPressed = meta.story({
  name: 'Filled · plus · pressed',
  args: filledPlus,
  render: renderPressed,
});

export const FilledPlusDisabled = meta.story({
  name: 'Filled · plus · disabled',
  args: { ...filledPlus, disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Add' });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const FilledPlusFocus = meta.story({
  name: 'Filled · plus · focus',
  args: filledPlus,
  render: renderFocus,
});

export const IconButtonOutlineS = meta.story({
  name: 'IconButton · outline · S',
  args: { ...outlineX, size: 'S' },
});

export const IconButtonOutlineM = meta.story({
  name: 'IconButton · outline · M',
  args: { ...outlineX, size: 'M' },
});

export const IconButtonOutlineL = meta.story({
  name: 'IconButton · outline · L',
  args: { ...outlineX, size: 'L' },
});

export const ExtraClick = meta.story({
  name: 'Click',
  args: { ...outlineX, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { ...plainMenu, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Open navigation' });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraOpen = meta.story({
  name: 'Open: menu source ring',
  args: { ...outlineX, size: 'M' },
  render: (args) => <IconButtonCell {...args} data-open="" />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close' });
    await expect(button).toHaveAttribute('data-open');
    await expect(getComputedStyle(button).backgroundColor).toBe('rgb(255, 231, 163)');
    await expect(getComputedStyle(button).borderTopColor).toBe('rgb(35, 31, 28)');
  },
});

export const ExtraOpenBorderless = meta.story({
  name: 'Open: borderless variants draw the ring',
  args: { ...plainMenu, size: 'M' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 16 }}>
      <IconButtonCell {...args} data-open="" />
      <IconButtonCell {...args} {...softBack} data-open="" />
      <IconButtonCell {...args} {...filledPlus} data-open="" />
    </div>
  ),
  play: async ({ canvas }) => {
    for (const name of ['Open navigation', 'Back', 'Add']) {
      const button = canvas.getByRole('button', { name });
      await expect(getComputedStyle(button).boxShadow).toBe(
        'rgb(35, 31, 28) 0px 0px 0px 2px inset',
      );
      await expect(getComputedStyle(button).backgroundColor).toBe('rgb(255, 231, 163)');
      await expect(getComputedStyle(button).color).toBe('rgb(35, 31, 28)');
    }
  },
});

export const ExtraSizes = meta.story({
  name: 'Circle and icon sizes',
  args: plainMenu,
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <IconButtonCell {...args} size="S" />
      <IconButtonCell {...args} size="M" />
      <IconButtonCell {...args} size="L" />
    </div>
  ),
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button', { name: 'Open navigation' });
    const circles = buttons.map((button) => button.getBoundingClientRect().width);
    const icons = buttons.map((button) => button.querySelector('svg')?.getAttribute('width'));
    await expect(circles).toEqual([36, 44, 52]);
    await expect(icons).toEqual(['16', '24', '24']);
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: outlineX,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Schließen' })).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: outlineX,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Cerrar' })).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: outlineX,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Fermer' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: outlineX,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '閉じる' })).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: outlineX,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Закрыть' })).toBeVisible();
  },
});
