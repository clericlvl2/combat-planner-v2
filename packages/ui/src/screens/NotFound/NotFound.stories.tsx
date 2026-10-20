import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { NotFound } from './NotFound.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/NotFound',
  component: NotFound,
  parameters: { phoneFrame: true },
  args: { onGoToCombats: fn() },
});

export const Default = meta.story({
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NotFound');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('goToCombats') })).toHaveAttribute(
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
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NotFound');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('goToCombats') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});

export const ExtraTapAction = meta.story({
  name: 'Tap on the action',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NotFound');
    await userEvent.click(canvas.getByRole('button', { name: t('goToCombats') }));
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});
