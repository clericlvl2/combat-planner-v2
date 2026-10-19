import preview from '#.storybook/preview';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/BottomBar.json';
import { layout } from '../../layout.ts';
import { BottomBar } from './BottomBar.tsx';
import type { BottomBarProps } from './BottomBar.tsx';

type LabelKey = keyof typeof en;

interface BottomBarCellProps extends Omit<BottomBarProps, 'label' | 'hint' | 'icon'> {
  labelKey?: LabelKey;
  label?: string;
  hintKey?: LabelKey;
  hint?: string;
}

function BottomBarCell({
  labelKey = 'newCombat',
  label,
  hintKey,
  hint,
  ...props
}: BottomBarCellProps) {
  const { t } = useTranslation('BottomBar');
  return (
    <BottomBar
      {...props}
      icon={IconPlus}
      label={label ?? t(labelKey)}
      hint={hint ?? (hintKey ? t(hintKey) : undefined)}
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/BottomBar',
  component: BottomBarCell,
  parameters: { phoneFrame: true },
  args: { onClick: fn() },
});

const renderPressed = (args: BottomBarCellProps) => <BottomBarCell {...args} data-pressed="" />;

export const Anatomy = meta.story({
  args: { labelKey: 'newCombat' },
});

export const NewCombatDefault = meta.story({
  name: 'New combat default',
  args: { labelKey: 'newCombat' },
});

export const NewCombatPressed = meta.story({
  name: 'New combat pressed',
  args: { labelKey: 'newCombat' },
  render: renderPressed,
});

export const NewCombatDisabled = meta.story({
  name: 'New combat disabled',
  args: { labelKey: 'newCombat', hintKey: 'combatLimitReached', disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'New combat' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription('Combat limit reached');
    await expect(canvas.getByText('Combat limit reached')).toBeVisible();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const NewPresetDefault = meta.story({
  name: 'New preset default',
  args: { labelKey: 'newPreset' },
});

export const NewPresetPressed = meta.story({
  name: 'New preset pressed',
  args: { labelKey: 'newPreset' },
  render: renderPressed,
});

export const NewPresetDisabled = meta.story({
  name: 'New preset disabled',
  args: { labelKey: 'newPreset', disabled: true },
});

export const DisabledHintRu = meta.story({
  name: 'Disabled + hint ru',
  args: { label: 'Новое сражение', hint: 'Достигнут лимит сражений', disabled: true },
});

export const DisabledHintDe = meta.story({
  name: 'Disabled + hint de',
  args: { label: 'Neuer Kampf', hint: 'Kampflimit erreicht', disabled: true },
});

export const ExtraClick = meta.story({
  name: 'Click',
  args: { labelKey: 'newCombat', onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'New combat' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { labelKey: 'newPreset', onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'New preset' });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraBottomOfScreen = meta.story({
  name: 'Sits at the bottom of the screen',
  args: { labelKey: 'newCombat' },
  play: async ({ canvas, canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const button = canvas.getByRole('button', { name: 'New combat' });
    const bar = button.parentElement;
    const frameRect = frame?.getBoundingClientRect();
    const barRect = bar?.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const { bottomBar, bottomButton } = layout;
    await expect(barRect?.bottom).toBe(frameRect?.bottom);
    await expect(barRect?.height).toBe(bottomBar.height);
    await expect(
      bottomBar.borderTop + bottomBar.padding.top + bottomButton.height + bottomBar.padding.bottom,
    ).toBe(bottomBar.height);
    await expect(bar && getComputedStyle(bar).paddingTop).toBe(`${bottomBar.padding.top}px`);
    await expect(barRect?.width).toBe(layout.phone.width);
    await expect(buttonRect.height).toBe(bottomButton.height);
    await expect(buttonRect.left - (frameRect?.left ?? 0)).toBe(bottomBar.padding.left);
    await expect((frameRect?.bottom ?? 0) - buttonRect.bottom).toBe(bottomBar.padding.bottom);
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { labelKey: 'newCombat', hintKey: 'combatLimitReached', disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Новый бой' })).toBeDisabled();
    await expect(canvas.getByText('Достигнут лимит боёв')).toBeVisible();
  },
});
