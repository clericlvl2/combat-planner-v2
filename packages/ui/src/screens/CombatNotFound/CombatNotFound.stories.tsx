import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CombatNotFound } from './CombatNotFound.tsx';

const meta = preview.meta({
  title: 'Screens/CombatNotFound',
  component: CombatNotFound,
  parameters: { phoneFrame: true },
  args: { onGoToCombats: fn() },
});

export const Default = meta.story({
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Combat not found' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Go to combats' }));
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});

export const Deutsch = meta.story({
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Kampf nicht gefunden' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Zu den Kämpfen' })).toBeVisible();
  },
});

export const Russian = meta.story({
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Бой не найден' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'К списку боёв' })).toBeVisible();
  },
});

export const Japanese = meta.story({
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: '戦闘が見つかりません' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: '戦闘一覧へ' })).toBeVisible();
  },
});

export const ExtraKeyboardEnter = meta.story({
  name: 'Keyboard: Enter on the action',
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Go to combats' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});
