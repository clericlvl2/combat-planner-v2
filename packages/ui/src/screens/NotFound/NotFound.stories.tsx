import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { NotFound } from './NotFound.tsx';

const meta = preview.meta({
  title: 'Screens/NotFound',
  component: NotFound,
  parameters: { phoneFrame: true },
  args: { onGoToCombats: fn() },
});

export const Default = meta.story({
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Go to combats' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    await expect(args.onGoToCombats).not.toHaveBeenCalled();
  },
});

export const Deutsch = meta.story({
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Zu den Kämpfen' })).toBeVisible();
  },
});

export const Russian = meta.story({
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Страница не найдена' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'К списку боёв' })).toBeVisible();
  },
});

export const Japanese = meta.story({
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'ページが見つかりません' }),
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

export const ExtraTapAction = meta.story({
  name: 'Tap on the action',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to combats' }));
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});
