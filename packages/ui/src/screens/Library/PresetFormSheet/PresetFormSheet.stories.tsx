import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { LIMITS } from '@combat-planner/domain';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { TagSheetTag } from '../../../organisms/TagSheet/TagSheet.tsx';
import { PresetFormSheet, emptyPresetForm } from './PresetFormSheet.tsx';
import type { PresetFormMode, PresetFormValue } from './PresetFormSheet.tsx';
import { anyValue, escapeRegExp, storyT } from '../../../storybook/storyT.ts';

type Canvas = ReturnType<typeof within>;

const tags: TagSheetTag[] = [
  { id: 'tag-bosses', name: 'Bosses', count: 1 },
  { id: 'tag-ferry', name: 'Ferry', count: 3 },
  { id: 'tag-goblins', name: 'Goblins', count: 2 },
  { id: 'tag-orcs', name: 'Orcs', count: 2 },
  { id: 'tag-veterans', name: 'Veterans', count: 0 },
];

const berserker: PresetFormValue = {
  name: 'Orc Berserker',
  role: 'enemy',
  maxHp: 40,
  ac: 18,
  pd: 16,
  md: 12,
  initiativeBonus: 2,
  tags: ['tag-orcs', 'tag-ferry'],
};

const createdTag = (name: string): TagSheetTag => ({ id: `tag-${name.toLowerCase()}`, name });

const openTags = async (canvas: Canvas, t: TFunction) => {
  await userEvent.click(canvas.getByRole('button', { name: t('addTag') }));
  const sheet = await canvas.findByRole('dialog', {
    name: anyValue(t, 'TagSheet:assignTitle', 'name'),
  });
  await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'));
  return sheet;
};

const meta = preview.meta({
  title: 'Screens/Library/PresetFormSheet',
  component: PresetFormSheet,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    opened: true,
    mode: 'create' as PresetFormMode,
    value: emptyPresetForm,
    tags,
    onSubmit: fn(),
    onCreateTag: fn(createdTag),
    onClose: fn(),
  },
});

export const NewPreset = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    await expect(canvas.getByRole('dialog', { name: t('newPreset') })).toBeVisible();
    const name = canvas.getByRole('textbox', { name: t('name') });
    await expect(name).toHaveValue('');
    await expect(name).toHaveAttribute(
      'placeholder',
      t('PresetFormSheet:namePlaceholder', { role: t('PresetFormSheet:enemy') }),
    );
    await expect(canvas.getByText(`0/${LIMITS.unitName}`)).toBeVisible();
    await expect(canvas.getByRole('radio', { name: t('enemy') })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toHaveValue('10');
    await expect(canvas.getByRole('spinbutton', { name: t('initiativeBonus') })).toHaveValue('+0');
    await expect(canvas.getByRole('button', { name: t('create') })).toBeEnabled();
  },
});

export const NoName = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const name = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.click(name);
    await userEvent.type(name, '   ');
    await userEvent.click(canvas.getByRole('radio', { name: t('ally') }));
    await expect(name).toHaveAttribute('placeholder', t('namePlaceholder', { role: t('ally') }));
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(canvas.getByRole('button', { name: t('create') }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({
      ...emptyPresetForm,
      name: t('namePlaceholder', { role: t('ally') }),
      role: 'ally',
    });
  },
});

export const FormFilled = meta.story({
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const name = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.click(name);
    await userEvent.type(name, 'Orc Warchief');
    await userEvent.click(canvas.getByRole('radio', { name: t('ally') }));
    const ac = canvas.getByRole('spinbutton', { name: t('ac') });
    await userEvent.clear(ac);
    await userEvent.type(ac, '11');
    await expect(canvas.getByText(`12/${LIMITS.unitName}`)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('create') }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({
      ...emptyPresetForm,
      name: 'Orc Warchief',
      role: 'ally',
      ac: 11,
    });
  },
});

export const EditPreset = meta.story({
  tags: ['visual'],
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    await expect(canvas.getByRole('dialog', { name: t('editPreset') })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: t('name') })).toHaveValue(berserker.name);
    await expect(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Orcs' }) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('removeTag', { name: 'Ferry' }) }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('save') }));
    await expect(args.onSubmit).toHaveBeenCalledWith(berserker);
  },
});

export const EditClearedName = meta.story({
  tags: ['!dev'],
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const name = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.clear(name);
    await userEvent.tab();
    await expect(name).toHaveAttribute('placeholder', berserker.name);
    const save = canvas.getByRole('button', { name: t('save') });
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith(berserker);
  },
});

export const RemoveTag = meta.story({
  tags: ['!dev'],
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('removeTag', { name: 'Ferry' }) }));
    await expect(
      canvas.queryByRole('button', { name: t('removeTag', { name: 'Ferry' }) }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: t('save') }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ ...berserker, tags: ['tag-orcs'] });
  },
});

export const TagSheetOverForm = meta.story({
  args: { mode: 'edit', value: berserker },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const sheet = await openTags(canvas, t);
    await expect(sheet).toHaveAccessibleName(t('TagSheet:assignTitle', { name: 'Orc Berserker' }));
    await expect(within(sheet).getByRole('checkbox', { name: /Orcs/ })).toBeChecked();
    await expect(within(sheet).queryByRole('checkbox', { name: /Veterans/ })).toBeNull();
    await expect(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 2 }) }),
    ).toBeVisible();
  },
});

export const CreateTag = meta.story({
  tags: ['!dev'],
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const sheet = await openTags(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'Elite');
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    );
    await expect(args.onCreateTag).toHaveBeenCalledWith('Elite');
    await expect(within(sheet).getByRole('checkbox', { name: /Elite/ })).toBeChecked();
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 3 }) }),
    );
    await expect(
      await canvas.findByRole('button', { name: t('removeTag', { name: 'Elite' }) }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('save') }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      ...berserker,
      tags: ['tag-orcs', 'tag-ferry', 'tag-elite'],
    });
  },
});

export const TagSheetClosed = meta.story({
  tags: ['!dev'],
  args: { mode: 'edit', value: berserker },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const sheet = await openTags(canvas, t);
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /Bosses/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: t('Sheet:close') }));
    await waitFor(() =>
      expect(
        canvas.queryByRole('dialog', {
          name: anyValue(t, 'TagSheet:assignTitle', 'name'),
        }),
      ).toBeNull(),
    );
    await expect(
      canvas.queryByRole('button', { name: t('removeTag', { name: 'Bosses' }) }),
    ).toBeNull();
  },
});

export const ReusedTagNotNew = meta.story({
  tags: ['!dev'],
  args: {
    value: berserker,
    onCreateTag: fn(
      (name: string) =>
        tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase()) ?? createdTag(name),
    ),
  },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const sheet = await openTags(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'VETERANS');
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'VETERANS' }) }),
    );
    await expect(args.onCreateTag).toHaveBeenCalledWith('VETERANS');
    const veterans = within(sheet).getByRole('checkbox', { name: /^Veterans/ });
    await expect(veterans).toBeChecked();
    await expect(veterans).not.toHaveAccessibleName(new RegExp(escapeRegExp(t('TagSheet:new'))));
  },
});

export const Saving = meta.story({
  args: { mode: 'edit', value: berserker, pending: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    const save = canvas.getByRole('button', { name: t('save') });
    await userEvent.click(save, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(save).toHaveAttribute('aria-busy', 'true'));
    await expect(save).toBeDisabled();
  },
});

export const EditWithNoTags = meta.story({
  args: { mode: 'edit', value: { ...berserker, tags: [] } },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PresetFormSheet');
    await expect(canvas.getByRole('dialog', { name: t('editPreset') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('addTag') })).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: t('removeTag', { name: 'Orcs' }) }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: t('removeTag', { name: 'Ferry' }) }),
    ).toBeNull();
  },
});
