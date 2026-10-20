import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { UnexpectedError } from './UnexpectedError.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/UnexpectedError',
  component: UnexpectedError,
  parameters: { phoneFrame: true },
  args: { onReload: fn() },
});

export const Default = meta.story({
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnexpectedError');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('reload') })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    await expect(args.onReload).not.toHaveBeenCalled();
  },
});

export const Deutsch = meta.story({
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Etwas ist schiefgelaufen' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Neu laden' })).toBeVisible();
  },
});

export const Russian = meta.story({
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Что-то пошло не так' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Перезагрузить' })).toBeVisible();
  },
});

export const Japanese = meta.story({
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: '問題が発生しました' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: '再読み込み' })).toBeVisible();
  },
});

export const ExtraKeyboardEnter = meta.story({
  name: 'Keyboard: Enter on the action',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnexpectedError');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('reload') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onReload).toHaveBeenCalledOnce();
  },
});

export const ExtraTapAction = meta.story({
  name: 'Tap on the action',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnexpectedError');
    await userEvent.click(canvas.getByRole('button', { name: t('reload') }));
    await expect(args.onReload).toHaveBeenCalledOnce();
  },
});
