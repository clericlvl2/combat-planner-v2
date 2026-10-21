import preview from '#.storybook/preview';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/BottomBar.json';
import { layout } from '../../layout.ts';
import { BottomBar } from './BottomBar.tsx';
import type { BottomBarProps } from './BottomBar.tsx';
import { storyT } from '../../storybook/storyT.ts';

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

export const Default = meta.story({
  tags: ['visual'],
  args: { labelKey: 'newCombat' },
});

export const DisabledWithHint = meta.story({
  tags: ['visual'],
  args: { labelKey: 'newCombat', hintKey: 'combatLimitReached', disabled: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'BottomBar');
    const button = canvas.getByRole('button', { name: t('newCombat') });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription(t('combatLimitReached'));
    await expect(canvas.getByText(t('combatLimitReached'))).toBeVisible();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const LongLabel = meta.story({
  args: {
    label: 'Новое сражение с огром',
    hint: 'Достигнут лимит сражений: удалите старое сражение, чтобы создать новое',
    disabled: true,
  },
});

export const ClickFires = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'newCombat', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'BottomBar');
    await userEvent.click(canvas.getByRole('button', { name: t('newCombat') }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const PinnedToFrameBottom = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'newCombat' },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'BottomBar');
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const button = canvas.getByRole('button', { name: t('newCombat') });
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
    await expect(barRect?.width).toBe(frameRect?.width);
    await expect(buttonRect.height).toBe(bottomButton.height);
    await expect(buttonRect.left - (frameRect?.left ?? 0)).toBe(bottomBar.padding.left);
    await expect((frameRect?.bottom ?? 0) - buttonRect.bottom).toBe(bottomBar.padding.bottom);
  },
});
