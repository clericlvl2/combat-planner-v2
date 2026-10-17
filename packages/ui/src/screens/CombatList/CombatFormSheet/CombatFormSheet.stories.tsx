import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { CombatFormSheet, emptyCombatForm } from './CombatFormSheet.tsx';
import type { CombatFormMode, CombatFormValue } from './CombatFormSheet.tsx';

const ambush: CombatFormValue = {
  title: 'Ambush at the Ferry',
  description: 'Session 12. Goblins hold the crossing, the orc waits on the raft.',
  color: 0,
};

const meta = preview.meta({
  title: 'Screens/CombatList/CombatFormSheet',
  component: CombatFormSheet,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    mode: 'create' as CombatFormMode,
    value: emptyCombatForm,
    opened: true,
    onSubmit: fn(),
    onClose: fn(),
  },
});

export const NewCombat = meta.story({
  name: 'New combat, empty',
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'New combat' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Title' })).toHaveValue('');
    await expect(canvas.getByText(`0/${LIMITS.combatTitle}`)).toBeVisible();
    await expect(canvas.getByText(`0/${LIMITS.combatDescription}`)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Grey' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const create = canvas.getByRole('button', { name: 'Create' });
    await expect(create).toBeDisabled();
    await userEvent.click(create, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const NoTitle = meta.story({
  name: 'Error: no title',
  play: async ({ canvas }) => {
    const title = canvas.getByRole('textbox', { name: 'Title' });
    await userEvent.click(title);
    await userEvent.type(title, '   ');
    await userEvent.tab();
    await expect(canvas.getByText('Enter a title')).toBeVisible();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled();
  },
});

export const Filled = meta.story({
  name: 'Form filled',
  play: async ({ args, canvas }) => {
    const title = canvas.getByRole('textbox', { name: 'Title' });
    await userEvent.click(title);
    await userEvent.type(title, 'Siege of Greyhold');
    await userEvent.click(canvas.getByRole('button', { name: 'Blue' }));
    await expect(canvas.getByText(`17/${LIMITS.combatTitle}`)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
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
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Edit combat' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Title' })).toHaveValue(ambush.title);
    await expect(canvas.getByRole('textbox', { name: 'Description' })).toHaveValue(
      ambush.description,
    );
    await expect(canvas.getByText(`19/${LIMITS.combatTitle}`)).toBeVisible();
    await expect(
      canvas.getByText(`${ambush.description.length}/${LIMITS.combatDescription}`),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Red' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith(ambush);
  },
});

export const ExtraEditClearedTitle = meta.story({
  name: 'Edit: title cleared',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas }) => {
    const title = canvas.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(title);
    await userEvent.tab();
    await expect(canvas.getByText('Enter a title')).toBeVisible();
    const save = canvas.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();
    await userEvent.click(save, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const ExtraClose = meta.story({
  name: 'Close without saving',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboardSubmit = meta.story({
  name: 'Keyboard: Enter on Save',
  args: { mode: 'edit', value: ambush },
  play: async ({ args, canvas }) => {
    const save = canvas.getByRole('button', { name: 'Save' });
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
    await expect(canvas.getByRole('dialog', { name: 'Изменить сражение' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Сохранить' })).toBeEnabled();
  },
});

export const ExtraJapaneseNew = meta.story({
  name: 'Japanese: new',
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    const title = canvas.getByRole('textbox', { name: 'タイトル' });
    await userEvent.click(title);
    await userEvent.type(title, '黒水の渡し守');
    await expect(canvas.getByRole('button', { name: '作成' })).toBeEnabled();
  },
});

export const ExtraPending = meta.story({
  name: 'Create stays disabled while the request is in flight',
  args: { mode: 'edit', value: ambush, pending: true },
  play: async ({ args, canvas }) => {
    const save = canvas.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();
    await userEvent.click(save, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});
