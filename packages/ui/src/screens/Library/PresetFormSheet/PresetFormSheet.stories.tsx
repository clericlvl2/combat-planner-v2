import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { TagSheetTag } from '../../../organisms/TagSheet/TagSheet.tsx';
import { PresetFormSheet, emptyPresetForm } from './PresetFormSheet.tsx';
import type { PresetFormMode, PresetFormValue } from './PresetFormSheet.tsx';

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

const openTags = async (canvas: Canvas) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Add tag' }));
  const sheet = await canvas.findByRole('dialog', { name: /^Tags/ });
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
  name: 'New preset, empty',
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'New preset' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    await expect(canvas.getByText(`0/${LIMITS.unitName}`)).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Enemy' })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toHaveValue('10');
    await expect(canvas.getByRole('spinbutton', { name: 'Initiative bonus' })).toHaveValue('+0');
    const create = canvas.getByRole('button', { name: 'Create' });
    await expect(create).toBeDisabled();
    await userEvent.click(create, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const NoName = meta.story({
  name: 'Error: no name',
  play: async ({ canvas }) => {
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.click(name);
    await userEvent.type(name, '   ');
    await userEvent.tab();
    await expect(canvas.getByText('Enter a name')).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled();
  },
});

export const Filled = meta.story({
  name: 'Form filled',
  play: async ({ args, canvas }) => {
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.click(name);
    await userEvent.type(name, 'Orc Warchief');
    await userEvent.click(canvas.getByRole('radio', { name: 'Ally' }));
    await userEvent.click(canvas.getByRole('spinbutton', { name: 'Armor Class' }));
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByText(`12/${LIMITS.unitName}`)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
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
  name: 'Edit preset',
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Edit preset' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toHaveValue(berserker.name);
    await expect(canvas.getByRole('button', { name: 'Remove Orcs' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Remove Ferry' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(berserker);
  },
});

export const ExtraRemoveTag = meta.story({
  name: 'Remove a tag chip',
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Ferry' }));
    await expect(canvas.queryByRole('button', { name: 'Remove Ferry' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ ...berserker, tags: ['tag-orcs'] });
  },
});

export const ExtraTagSheet = meta.story({
  name: 'Tag sheet over the form',
  args: { mode: 'edit', value: berserker },
  play: async ({ canvas }) => {
    const sheet = await openTags(canvas);
    await expect(sheet).toHaveAccessibleName('Tags · Orc Berserker');
    await expect(within(sheet).getByRole('checkbox', { name: /Orcs/ })).toBeChecked();
    await expect(within(sheet).queryByRole('checkbox', { name: /Veterans/ })).toBeNull();
    await expect(within(sheet).getByRole('button', { name: 'Done · 2 tags' })).toBeVisible();
  },
});

export const ExtraCreateTag = meta.story({
  name: 'Create a tag, checked at once',
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas }) => {
    const sheet = await openTags(canvas);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'Elite');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Create “Elite”' }));
    await expect(args.onCreateTag).toHaveBeenCalledWith('Elite');
    await expect(within(sheet).getByRole('checkbox', { name: /Elite/ })).toBeChecked();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Done · 3 tags' }));
    await expect(await canvas.findByRole('button', { name: 'Remove Elite' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      ...berserker,
      tags: ['tag-orcs', 'tag-ferry', 'tag-elite'],
    });
  },
});

export const ExtraTagSheetClosed = meta.story({
  name: 'Tag sheet closed without Done',
  args: { mode: 'edit', value: berserker },
  play: async ({ canvas }) => {
    const sheet = await openTags(canvas);
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /Bosses/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: /^Tags/ })).toBeNull());
    await expect(canvas.queryByRole('button', { name: 'Remove Bosses' })).toBeNull();
  },
});

export const ExtraClose = meta.story({
  name: 'Close without saving',
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboardSubmit = meta.story({
  name: 'Keyboard: Enter on Save',
  args: { mode: 'edit', value: berserker },
  play: async ({ args, canvas }) => {
    const save = canvas.getByRole('button', { name: 'Save' });
    save.focus();
    await waitFor(() => expect(save).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledWith(berserker);
  },
});

export const ExtraRussian = meta.story({
  name: 'Russian: edit',
  globals: { locale: 'ru' },
  args: {
    mode: 'edit',
    value: { ...berserker, name: 'Капитан стражи переправы Святослав Огнев', role: 'ally' },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Изменить шаблон' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Союзник' })).toBeChecked();
  },
});

export const ExtraJapaneseNew = meta.story({
  name: 'Japanese: new',
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    const name = canvas.getByRole('textbox', { name: '名前' });
    await userEvent.click(name);
    await userEvent.type(name, '影の射手ゴブリン');
    await expect(canvas.getByRole('button', { name: '作成' })).toBeEnabled();
  },
});

export const ExtraReusedTagNotNew = meta.story({
  name: 'Create that reuses an existing tag shows no new badge',
  args: {
    value: berserker,
    onCreateTag: fn(
      (name: string) =>
        tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase()) ?? createdTag(name),
    ),
  },
  play: async ({ args, canvas }) => {
    const sheet = await openTags(canvas);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'VETERANS');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Create “VETERANS”' }));
    await expect(args.onCreateTag).toHaveBeenCalledWith('VETERANS');
    const veterans = within(sheet).getByRole('checkbox', { name: /^Veterans/ });
    await expect(veterans).toBeChecked();
    await expect(veterans).not.toHaveAccessibleName(/new/);
  },
});

export const ExtraPending = meta.story({
  name: 'Save stays disabled while the request is in flight',
  args: { mode: 'edit', value: berserker, pending: true },
  play: async ({ args, canvas }) => {
    const save = canvas.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();
    await userEvent.click(save, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});
