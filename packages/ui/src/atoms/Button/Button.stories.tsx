import preview from '#.storybook/preview';
import { IconDice5, IconPlus, IconUserX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Button.json';
import { layout } from '../../layout.ts';
import { frameViewportOf } from '../../storybook/PhoneFrame.tsx';
import { Button } from './Button.tsx';
import type { ButtonProps } from './Button.tsx';

type LabelKey = keyof typeof en;

interface ButtonCellProps extends Omit<ButtonProps, 'children'> {
  labelKey?: LabelKey;
  label?: string;
}

function ButtonCell({ labelKey = 'save', label, ...props }: ButtonCellProps) {
  const { t } = useTranslation('Button');
  return <Button {...props}>{label ?? t(labelKey)}</Button>;
}

const meta = preview.meta({
  title: 'Atoms/Button',
  component: ButtonCell,
  args: { onClick: fn() },
});

const renderPressed = (args: ButtonCellProps) => <ButtonCell {...args} data-pressed="" />;

const renderFocus = (args: ButtonCellProps) => <ButtonCell {...args} data-focus="" />;

export const Anatomy = meta.story({
  args: { variant: 'primary', size: 'M', icon: IconPlus, labelKey: 'newCombat' },
});

export const PrimaryLIconDefault = meta.story({
  name: 'Primary L + icon · default',
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
});

export const PrimaryLIconPressed = meta.story({
  name: 'Primary L + icon · pressed',
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  render: renderPressed,
});

export const PrimaryLIconDisabled = meta.story({
  name: 'Primary L + icon · disabled',
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat', disabled: true },
});

export const PrimaryLIconFocus = meta.story({
  name: 'Primary L + icon · focus',
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  render: renderFocus,
});

export const PrimaryMDefault = meta.story({
  name: 'Primary M · default',
  args: { variant: 'primary', size: 'M', labelKey: 'save' },
});

export const PrimaryMPressed = meta.story({
  name: 'Primary M · pressed',
  args: { variant: 'primary', size: 'M', labelKey: 'save' },
  render: renderPressed,
});

export const PrimaryMDisabled = meta.story({
  name: 'Primary M · disabled',
  args: { variant: 'primary', size: 'M', labelKey: 'save', disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save' });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const PrimaryMFocus = meta.story({
  name: 'Primary M · focus',
  args: { variant: 'primary', size: 'M', labelKey: 'save' },
  render: renderFocus,
});

export const PrimarySDefault = meta.story({
  name: 'Primary S · default',
  args: { variant: 'primary', size: 'S', icon: IconDice5, labelKey: 'rollD20' },
});

export const PrimarySPressed = meta.story({
  name: 'Primary S · pressed',
  args: { variant: 'primary', size: 'S', icon: IconDice5, labelKey: 'rollD20' },
  render: renderPressed,
});

export const PrimarySDisabled = meta.story({
  name: 'Primary S · disabled',
  args: { variant: 'primary', size: 'S', icon: IconDice5, labelKey: 'rollD20', disabled: true },
});

export const PrimarySFocus = meta.story({
  name: 'Primary S · focus',
  args: { variant: 'primary', size: 'S', icon: IconDice5, labelKey: 'rollD20' },
  render: renderFocus,
});

export const SecondaryMDefault = meta.story({
  name: 'Secondary M · default',
  args: { variant: 'secondary', size: 'M', labelKey: 'cancel' },
});

export const SecondaryMPressed = meta.story({
  name: 'Secondary M · pressed',
  args: { variant: 'secondary', size: 'M', labelKey: 'cancel' },
  render: renderPressed,
});

export const SecondaryMDisabled = meta.story({
  name: 'Secondary M · disabled',
  args: { variant: 'secondary', size: 'M', labelKey: 'cancel', disabled: true },
});

export const SecondaryMFocus = meta.story({
  name: 'Secondary M · focus',
  args: { variant: 'secondary', size: 'M', labelKey: 'cancel' },
  render: renderFocus,
});

export const DangerMDefault = meta.story({
  name: 'Danger M · default',
  args: { variant: 'danger', size: 'M', labelKey: 'delete' },
});

export const DangerMPressed = meta.story({
  name: 'Danger M · pressed',
  args: { variant: 'danger', size: 'M', labelKey: 'delete' },
  render: renderPressed,
});

export const DangerMDisabled = meta.story({
  name: 'Danger M · disabled',
  args: { variant: 'danger', size: 'M', labelKey: 'delete', disabled: true },
});

export const DangerMFocus = meta.story({
  name: 'Danger M · focus',
  args: { variant: 'danger', size: 'M', labelKey: 'delete' },
  render: renderFocus,
});

export const GhostSDefault = meta.story({
  name: 'Ghost S · default',
  args: { variant: 'ghost', size: 'S', labelKey: 'clear' },
});

export const GhostSPressed = meta.story({
  name: 'Ghost S · pressed',
  args: { variant: 'ghost', size: 'S', labelKey: 'clear' },
  render: renderPressed,
});

export const GhostSDisabled = meta.story({
  name: 'Ghost S · disabled',
  args: { variant: 'ghost', size: 'S', labelKey: 'clear', disabled: true },
});

export const GhostSFocus = meta.story({
  name: 'Ghost S · focus',
  args: { variant: 'ghost', size: 'S', labelKey: 'clear' },
  render: renderFocus,
});

export const ButtonPrimaryS = meta.story({
  name: 'Button · primary · S',
  args: { variant: 'primary', size: 'S', labelKey: 'save' },
});

export const ButtonPrimaryM = meta.story({
  name: 'Button · primary · M',
  args: { variant: 'primary', size: 'M', labelKey: 'save' },
});

export const ButtonPrimaryL = meta.story({
  name: 'Button · primary · L',
  args: { variant: 'primary', size: 'L', labelKey: 'save' },
});

export const PrimaryMDe = meta.story({
  name: 'Primary M · de',
  args: { variant: 'primary', size: 'M', label: 'Kampf beginnen' },
});

export const PrimaryMRu = meta.story({
  name: 'Primary M · ru',
  args: { variant: 'primary', size: 'M', label: 'Начать бой' },
});

export const PrimaryMJa = meta.story({
  name: 'Primary M · ja',
  args: { variant: 'primary', size: 'M', label: '戦闘開始' },
});

export const PrimaryMFullWidth = meta.story({
  name: 'Primary M · full width',
  args: { variant: 'primary', size: 'M', labelKey: 'startCombat', fullWidth: true },
});

export const SecondarySIconDe = meta.story({
  name: 'Secondary S + icon · de',
  args: { variant: 'secondary', size: 'S', icon: IconUserX, label: 'Held freigeben' },
});

export const SecondarySIconRu = meta.story({
  name: 'Secondary S + icon · ru',
  args: { variant: 'secondary', size: 'S', icon: IconUserX, label: 'Освободить героя' },
});

export const SecondarySIconJa = meta.story({
  name: 'Secondary S + icon · ja',
  args: { variant: 'secondary', size: 'S', icon: IconUserX, label: 'ヒーローを解放' },
});

export const SecondarySIconFullWidth = meta.story({
  name: 'Secondary S + icon · full width',
  args: {
    variant: 'secondary',
    size: 'S',
    icon: IconUserX,
    labelKey: 'releaseHero',
    fullWidth: true,
  },
});

export const ExtraClick = meta.story({
  name: 'Click',
  args: { variant: 'primary', size: 'M', labelKey: 'save', onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { variant: 'primary', size: 'M', labelKey: 'save', onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save' });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraPhoneFrame = meta.story({
  name: 'In the phone frame',
  parameters: { phoneFrame: true },
  args: { variant: 'primary', size: 'M', icon: IconPlus, labelKey: 'newCombat', fullWidth: true },
  play: async ({ canvas, canvasElement, globals }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const viewport = layout.viewports[frameViewportOf(globals.frame)];
    await expect(frame?.getBoundingClientRect().width).toBe(viewport.width);
    await expect(frame?.getBoundingClientRect().height).toBe(viewport.height);
    await expect(canvas.getByText('9:41')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'New combat' })).toBeVisible();
    const button = canvas.getByRole('button', { name: 'New combat' });
    const frameTop = frame?.getBoundingClientRect().top ?? 0;
    await expect(button.getBoundingClientRect().top - frameTop).toBeGreaterThanOrEqual(44);
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Neuer Kampf' })).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Nuevo combate' })).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Nouveau combat' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '新しい戦闘' })).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { variant: 'primary', size: 'L', icon: IconPlus, labelKey: 'newCombat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Новый бой' })).toBeVisible();
  },
});
