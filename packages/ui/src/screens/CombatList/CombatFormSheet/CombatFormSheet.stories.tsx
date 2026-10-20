import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { LIMITS } from '@combat-planner/domain';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { CombatFormSheet, emptyCombatForm } from './CombatFormSheet.tsx';
import type { CombatFormMode, CombatFormValue } from './CombatFormSheet.tsx';
import { storyT } from '../../../storybook/storyT.ts';
import { storyLocale } from '../../../storybook/withLocale.tsx';

const ambush: CombatFormValue = {
  title: 'Ambush at the Ferry',
  description: 'Session 12. Goblins hold the crossing, the orc waits on the raft.',
  color: 0,
};

const now = new Date(2026, 9, 15, 12, 0).getTime();

const defaultTitle = (t: TFunction, globals: Record<string, unknown>) =>
  t('defaultTitle', {
    date: new Intl.DateTimeFormat(storyLocale(globals), { day: 'numeric', month: 'short' }).format(
      now,
    ),
  });

const meta = preview.meta({
  title: 'Screens/CombatList/CombatFormSheet',
  component: CombatFormSheet,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    mode: 'create' as CombatFormMode,
    value: emptyCombatForm,
    opened: true,
    now,
    onSubmit: fn(),
    onClose: fn(),
  },
});

export const NewCombat = meta.story({
  name: 'New combat, empty',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    await expect(canvas.getByRole('dialog', { name: t('newCombat') })).toBeVisible();
    const title = canvas.getByRole('textbox', { name: t('title') });
    await expect(title).toHaveValue('');
    await expect(title).toHaveAttribute('placeholder', defaultTitle(t, globals));
    await expect(canvas.getByText(`0/${LIMITS.combatTitle}`)).toBeVisible();
    await expect(canvas.getByText(`0/${LIMITS.combatDescription}`)).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Swatch:grey') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('create') })).toBeEnabled();
  },
});

export const NoTitle = meta.story({
  name: 'No title saves "Combat Oct 15"',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    const title = canvas.getByRole('textbox', { name: t('title') });
    await userEvent.click(title);
    await userEvent.type(title, '   ');
    await userEvent.tab();
    await expect(title).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(canvas.getByRole('button', { name: t('create') }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({
      title: defaultTitle(t, globals),
      description: '',
      color: 7,
    });
  },
});

export const Filled = meta.story({
  name: 'Form filled',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    const title = canvas.getByRole('textbox', { name: t('title') });
    await userEvent.click(title);
    await userEvent.type(title, 'Siege of Greyhold');
    await userEvent.click(canvas.getByRole('button', { name: t('Swatch:blue') }));
    await expect(canvas.getByText(`17/${LIMITS.combatTitle}`)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('create') }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({
      title: 'Siege of Greyhold',
      description: '',
      color: 5,
    });
  },
});

export const EditCombat = meta.story({
  name: 'Edit combat',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    await expect(canvas.getByRole('dialog', { name: t('editCombat') })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: t('title') })).toHaveValue(ambush.title);
    await expect(canvas.getByRole('textbox', { name: t('description') })).toHaveValue(
      ambush.description,
    );
    await expect(canvas.getByText(`19/${LIMITS.combatTitle}`)).toBeVisible();
    await expect(
      canvas.getByText(`${ambush.description.length}/${LIMITS.combatDescription}`),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Swatch:red') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: t('save') }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith(ambush);
  },
});

export const ExtraEditClearedTitle = meta.story({
  name: 'Edit: title cleared keeps the previous title',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    const title = canvas.getByRole('textbox', { name: t('title') });
    await userEvent.clear(title);
    await userEvent.tab();
    await expect(title).toHaveAttribute('placeholder', ambush.title);
    const save = canvas.getByRole('button', { name: t('save') });
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith(ambush);
  },
});

export const ExtraClose = meta.story({
  name: 'Close without saving',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:close') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboardSubmit = meta.story({
  name: 'Keyboard: Enter on Save',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    const save = canvas.getByRole('button', { name: t('save') });
    save.focus();
    await waitFor(() => expect(save).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith(ambush);
  },
});

export const ExtraRussian = meta.story({
  name: 'Russian: edit',
  globals: { locale: 'ru' },
  args: {
    mode: 'edit',
    value: {
      title: 'Капитан стражи переправы: засада у моста',
      description: 'Одноразовая встреча для новых игроков.',
      color: 3,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Изменить бой' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Сохранить' })).toBeEnabled();
  },
});

export const ExtraJapaneseNew = meta.story({
  name: 'Japanese: new',
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    const title = canvas.getByRole('textbox', { name: 'タイトル' });
    await expect(title).toHaveAttribute('placeholder', '10月15日の戦闘');
    await userEvent.click(title);
    await userEvent.type(title, '黒水の渡し守');
    await expect(canvas.getByRole('button', { name: '作成' })).toBeEnabled();
  },
});

export const ExtraPending = meta.story({
  name: 'Create stays disabled while the request is in flight',
  args: { mode: 'edit', value: ambush, pending: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    const save = canvas.getByRole('button', { name: t('save') });
    await expect(save).toBeDisabled();
    await userEvent.click(save, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});
