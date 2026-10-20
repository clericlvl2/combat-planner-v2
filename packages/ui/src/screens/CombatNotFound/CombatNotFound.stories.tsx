import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CombatNotFound } from './CombatNotFound.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/CombatNotFound',
  component: CombatNotFound,
  parameters: { phoneFrame: true },
  args: { onGoToCombats: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('goToCombats') })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    await expect(args.onGoToCombats).not.toHaveBeenCalled();
  },
});

export const Deutsch = meta.story({
  tags: ['visual'],
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Kampf nicht gefunden' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Zu den Kämpfen' })).toBeVisible();
  },
});

export const Russian = meta.story({
  tags: ['visual'],
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Бой не найден' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'К списку боёв' })).toBeVisible();
  },
});

export const Japanese = meta.story({
  tags: ['visual'],
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
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('goToCombats') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});

export const ExtraTapAction = meta.story({
  name: 'Tap on the action',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await userEvent.click(canvas.getByRole('button', { name: t('goToCombats') }));
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});
