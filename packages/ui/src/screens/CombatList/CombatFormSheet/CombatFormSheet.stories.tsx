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

const longDescription = 'Гоблины держат переправу через Чёрную реку, орк ждёт на плоту. '
  .repeat(9)
  .slice(0, LIMITS.combatDescription);

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
  tags: ['visual'],
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

export const NoTitleSavesDefaultTitle = meta.story({
  tags: ['!dev'],
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

export const FormFilled = meta.story({
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
  tags: ['visual'],
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

export const EditClearedTitle = meta.story({
  tags: ['!dev'],
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

export const Saving = meta.story({
  args: { mode: 'edit', value: ambush, pending: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    const save = canvas.getByRole('button', { name: t('save') });
    await userEvent.click(save, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(save).toHaveAttribute('aria-busy', 'true'));
    await expect(save).toBeDisabled();
  },
});

export const LongDescription = meta.story({
  args: { mode: 'edit', value: { ...ambush, description: longDescription } },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatFormSheet');
    await expect(canvas.getByRole('textbox', { name: t('description') })).toHaveValue(
      longDescription,
    );
    await expect(
      canvas.getByText(`${LIMITS.combatDescription}/${LIMITS.combatDescription}`),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('save') })).toBeVisible();
  },
});
