import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CantReachServer } from './CantReachServer.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/CantReachServer',
  component: CantReachServer,
  parameters: { phoneFrame: true },
  args: { onRetry: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CantReachServer');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') })).toHaveAttribute(
      'data-variant',
      'secondary',
    );
    await expect(args.onRetry).not.toHaveBeenCalled();
  },
});

export const Deutsch = meta.story({
  tags: ['visual'],
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Keine Verbindung zum Server' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();
  },
});

export const Russian = meta.story({
  tags: ['visual'],
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Нет связи с сервером' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Повторить' })).toBeVisible();
  },
});

export const ExtraKeyboardEnter = meta.story({
  name: 'Keyboard: Enter on the action',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CantReachServer');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
});

export const ExtraTapAction = meta.story({
  name: 'Tap on the action',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CantReachServer');
    await userEvent.click(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
});
