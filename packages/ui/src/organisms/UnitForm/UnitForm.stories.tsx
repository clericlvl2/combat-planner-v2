import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import type { Preset, Role } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { TagSheetTag } from '../TagSheet/TagSheet.tsx';
import { UnitForm } from './UnitForm.tsx';
import type { UnitDraft, UnitFormMode } from './UnitForm.tsx';

interface UnitFormCellProps {
  mode?: UnitFormMode;
  value?: Partial<UnitDraft>;
  lockRole?: boolean;
  library?: boolean;
  roleCounts?: Partial<Record<Role, number>>;
  onSubmit?: (draft: UnitDraft) => void;
  onCancel?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const at = '2026-10-15T12:00:00.000Z';

interface PresetStats {
  maxHp: number;
  ac: number;
  pd: number;
  md: number;
  initiativeBonus: number;
}

const preset = (
  id: string,
  name: string,
  role: Role,
  stats: PresetStats,
  tags: string[],
): Preset => ({ id, name, role, ...stats, tags, createdAt: at, updatedAt: at });

const presets: readonly Preset[] = [
  preset(
    'orc-berserker',
    'Orc Berserker',
    'enemy',
    { maxHp: 40, ac: 18, pd: 16, md: 12, initiativeBonus: 3 },
    ['orcs', 'ferry'],
  ),
  preset(
    'goblin-archer',
    'Goblin Archer',
    'enemy',
    { maxHp: 18, ac: 16, pd: 14, md: 12, initiativeBonus: 4 },
    ['goblins', 'ferry'],
  ),
  preset(
    'brother-tomas',
    'Brother Tomas of the Silver Lantern Order',
    'ally',
    { maxHp: 30, ac: 19, pd: 15, md: 17, initiativeBonus: 1 },
    ['allies'],
  ),
  preset(
    'shadow-goblin',
    '影の射手ゴブリン',
    'enemy',
    { maxHp: 18, ac: 16, pd: 14, md: 12, initiativeBonus: 4 },
    ['goblins'],
  ),
  preset(
    'orc-shaman',
    'Orc Shaman',
    'enemy',
    { maxHp: 30, ac: 17, pd: 15, md: 16, initiativeBonus: 2 },
    ['orcs'],
  ),
];

const tags: readonly TagSheetTag[] = [
  { id: 'ferry', name: 'Ferry', count: 6 },
  { id: 'goblins', name: 'Goblins', count: 3 },
  { id: 'orcs', name: 'Orcs', count: 2 },
  { id: 'allies', name: 'Allies', count: 5 },
  { id: 'bosses', name: 'Bosses', count: 2 },
];

const vashti: UnitDraft = {
  name: 'Vashti the Hexer',
  role: 'hero',
  initiativeBonus: 3,
  maxHp: 36,
  tempHp: 0,
  ac: 16,
  pd: 14,
  md: 19,
  note: 'Hex on Orc Berserker until the end of round 4',
};

const orcShaman: Partial<UnitDraft> = {
  name: 'Orc Shaman',
  role: 'enemy',
  initiativeBonus: 2,
  maxHp: 30,
  tempHp: 0,
  ac: 17,
  pd: 15,
  md: 16,
};

function UnitFormCell({
  mode = 'add',
  value,
  lockRole,
  library = true,
  roleCounts,
  onSubmit,
  onCancel,
}: UnitFormCellProps) {
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      <UnitForm
        opened={opened}
        mode={mode}
        value={value}
        lockRole={lockRole}
        presets={library ? presets : undefined}
        tags={tags}
        combatTitle="Ambush at the Ferry"
        roleCounts={roleCounts}
        onSubmit={(draft) => {
          setOpened(false);
          onSubmit?.(draft);
        }}
        onCancel={() => {
          setOpened(false);
          onCancel?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/UnitForm',
  component: UnitFormCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onSubmit: fn(), onCancel: fn() },
});

type Canvas = ReturnType<typeof within>;

const openLibrary = async (canvas: Canvas) => {
  await userEvent.click(canvas.getByRole('radio', { name: 'From Library' }));
};

const filterOrcs = async (canvas: Canvas, apply: boolean) => {
  await userEvent.click(canvas.getByRole('button', { name: /^Tags/ }));
  await userEvent.click(await canvas.findByRole('checkbox', { name: /^Orcs/ }));
  if (apply) {
    await userEvent.click(canvas.getByRole('button', { name: 'Show 2 presets' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Filter by tag' })).toBeNull());
  }
};

const presetList = (canvas: Canvas) => within(canvas.getByRole('group', { name: 'Presets' }));

const typeNumber = async (canvas: Canvas, label: string, text: string) => {
  const field = canvas.getByRole('spinbutton', { name: label });
  await userEvent.clear(field);
  await userEvent.type(field, `${text}{Enter}`);
  return field;
};

export const ExtraAnatomy = meta.story({
  name: 'Anatomy',
  args: { value: orcShaman },
});

export const ExtraNewEmpty = meta.story({
  name: 'New, empty',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Add unit' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'placeholder',
      'Enemy 1',
    );
    await expect(canvas.getByRole('radio', { name: 'Enemy' })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toHaveValue('10');
    await expect(canvas.getByRole('spinbutton', { name: 'Initiative bonus' })).toHaveValue('0');
  },
});

export const ExtraNewFilled = meta.story({
  name: 'New, filled',
  args: { value: orcShaman },
});

export const ExtraFromLibrary = meta.story({
  name: 'From Library',
  play: async ({ canvas }) => {
    await openLibrary(canvas);
    await expect(presetList(canvas).getAllByRole('button')).toHaveLength(5);
    await expect(canvas.getByRole('button', { name: 'Pick a preset' })).toBeDisabled();
  },
});

export const ExtraLibraryTagsSheet = meta.story({
  name: 'Library, Tags sheet',
  play: async ({ canvas }) => {
    await openLibrary(canvas);
    await filterOrcs(canvas, false);
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Show 2 presets' })).toBeVisible(),
    );
  },
});

export const ExtraLibraryFilteredPicked = meta.story({
  name: 'Library, filtered, picked',
  play: async ({ canvas, args }) => {
    await openLibrary(canvas);
    await filterOrcs(canvas, true);
    await expect(canvas.getByRole('button', { name: 'Remove Orcs' })).toBeVisible();
    const list = presetList(canvas);
    await expect(list.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(list.getByRole('button', { name: /^Enemy Orc Berserker/ }));
    await expect(list.getByRole('button', { name: /^Enemy Orc Berserker/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Add Orc Berserker' })).toBeEnabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const ExtraEdit = meta.story({
  name: 'Edit',
  args: { mode: 'edit', value: vashti },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Edit unit' })).toBeVisible();
    await expect(canvas.queryByRole('radio', { name: 'From Library' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  },
});

export const ExtraLibrarySearchGob = meta.story({
  name: 'Library, search “gob”',
  play: async ({ canvas }) => {
    await openLibrary(canvas);
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search presets' }), 'gob');
    const list = presetList(canvas);
    await expect(list.getAllByRole('button')).toHaveLength(1);
    await expect(list.getByText('Goblin Archer')).toBeVisible();
  },
});

export const ExtraLibraryNothingFound = meta.story({
  name: 'Library, nothing found',
  play: async ({ canvas }) => {
    await openLibrary(canvas);
    await filterOrcs(canvas, true);
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search presets' }), 'dragon');
    await expect(canvas.getByText('Nothing found')).toBeVisible();
    await expect(canvas.getByText('No preset matches “dragon” in Orcs.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Pick a preset' })).toBeDisabled();
  },
});

export const ExtraMinimumValues = meta.story({
  name: 'Minimum values',
  args: { mode: 'edit', value: { ...vashti, maxHp: LIMITS.maxHp.min, tempHp: 0 } },
  play: async ({ canvas }) => {
    const decrease = canvas.getAllByRole('button', { name: 'Decrease' });
    await expect(decrease[0]).toBeDisabled();
    await expect(decrease[1]).toBeDisabled();
    await expect(decrease[2]).toBeEnabled();
  },
});

export const ExtraEdgeCases40CharacterNameRu = meta.story({
  name: '40-character name, ru',
  args: {
    mode: 'edit',
    value: { ...vashti, name: 'Капитан стражи переправы Святослав Огнев', role: 'ally', note: '' },
  },
  play: async ({ canvas }) => {
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await expect(name).toHaveValue('Капитан стражи переправы Святослав Огнев');
    await expect(canvas.getByText(`${LIMITS.unitName}/${LIMITS.unitName}`)).toBeVisible();
    await userEvent.type(name, 'а');
    await expect(name).toHaveValue('Капитан стражи переправы Святослав Огнев');
  },
});

export const ExtraFlowAddFromLibrary = meta.story({
  name: 'Flow: filter Orcs, pick a preset, Add closes the sheet',
  play: async ({ canvas, args }) => {
    await openLibrary(canvas);
    await filterOrcs(canvas, true);
    await userEvent.click(presetList(canvas).getByRole('button', { name: /^Enemy Orc Berserker/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add Orc Berserker' }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: 'Orc Berserker',
      role: 'enemy',
      maxHp: 40,
      tempHp: 0,
      ac: 18,
      pd: 16,
      md: 12,
      initiativeBonus: 3,
      note: '',
    });
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraSubmitTypedValues = meta.story({
  name: 'Add unit submits the typed values',
  args: { library: false },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByRole('radio', { name: 'From Library' })).toBeNull();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name' }), 'Orc Shaman');
    canvas.getByRole('radio', { name: 'Enemy' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'Ally' })).toBeChecked();
    await typeNumber(canvas, 'Max HP', '30');
    canvas.getByRole('spinbutton', { name: 'Temp HP' }).focus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await typeNumber(canvas, 'Armor Class', '17');
    await typeNumber(canvas, 'Physical Defense', '15');
    await typeNumber(canvas, 'Mental Defense', '16');
    const increase = canvas.getAllByRole('button', { name: 'Increase' });
    await userEvent.click(increase[increase.length - 1] ?? document.body);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Note' }), 'Calls the storm');
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: 'Orc Shaman',
      role: 'ally',
      maxHp: 30,
      tempHp: 2,
      ac: 17,
      pd: 15,
      md: 16,
      initiativeBonus: 1,
      note: 'Calls the storm',
    });
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
});

export const ExtraEmptyNameDefault = meta.story({
  name: 'An empty name becomes the default name',
  args: { roleCounts: { enemy: 2 } },
  play: async ({ canvas, args }) => {
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await expect(name).toHaveAttribute('placeholder', 'Enemy 3');
    await userEvent.click(canvas.getByRole('radio', { name: 'Hero' }));
    await expect(name).toHaveAttribute('placeholder', 'Hero 1');
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hero 1', role: 'hero', maxHp: 10, ac: 10 }),
    );
  },
});

export const ExtraBlankNameBlocks = meta.story({
  name: 'A blank name blocks submit',
  args: { mode: 'edit', value: vashti },
  play: async ({ canvas, args }) => {
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, '   ');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Enter a name')).toBeVisible();
    await userEvent.clear(name);
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.type(name, '  Vashti ');
    await expect(canvas.queryByText('Enter a name')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ ...vashti, name: 'Vashti' });
  },
});

export const ExtraClampsToLimits = meta.story({
  name: 'Values outside the limits are clamped',
  args: { mode: 'edit', value: vashti },
  play: async ({ canvas, args }) => {
    await expect(await typeNumber(canvas, 'Max HP', '1500')).toHaveValue(String(LIMITS.maxHp.max));
    await expect(await typeNumber(canvas, 'Temp HP', '-5')).toHaveValue(String(LIMITS.tempHp.min));
    await expect(await typeNumber(canvas, 'Armor Class', '150')).toHaveValue(
      String(LIMITS.defense.max),
    );
    await expect(await typeNumber(canvas, 'Initiative bonus', '-120')).toHaveValue(
      `−${Math.abs(LIMITS.initiativeBonus.min)}`,
    );
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'x'.repeat(LIMITS.unitName + 5));
    await expect(name).toHaveValue('x'.repeat(LIMITS.unitName));
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      ...vashti,
      name: 'x'.repeat(LIMITS.unitName),
      maxHp: LIMITS.maxHp.max,
      tempHp: LIMITS.tempHp.min,
      ac: LIMITS.defense.max,
      initiativeBonus: LIMITS.initiativeBonus.min,
    });
  },
});

export const ExtraLockRole = meta.story({
  name: 'lockRole keeps the type',
  args: { mode: 'edit', value: vashti, lockRole: true },
  play: async ({ canvas, args }) => {
    const hero = canvas.getByRole('radio', { name: 'Hero' });
    await expect(hero).toBeChecked();
    await expect(hero).toBeDisabled();
    await userEvent.click(canvas.getByRole('radio', { name: 'Enemy' }));
    await expect(hero).toBeChecked();
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSubmit).toHaveBeenCalledWith(vashti);
  },
});

export const ExtraPickFillsForm = meta.story({
  name: 'Picking a preset fills the form',
  play: async ({ canvas, args }) => {
    await openLibrary(canvas);
    await userEvent.click(presetList(canvas).getByRole('button', { name: /^Ally Brother Tomas/ }));
    await userEvent.click(canvas.getByRole('radio', { name: 'New' }));
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Brother Tomas of the Silver Lantern Order',
    );
    await expect(canvas.getByRole('radio', { name: 'Ally' })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toHaveValue('30');
    await expect(canvas.getByRole('spinbutton', { name: 'Armor Class' })).toHaveValue('19');
    await expect(canvas.getByRole('spinbutton', { name: 'Initiative bonus' })).toHaveValue('+1');
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: 'Brother Tomas of the Silver Lantern Order',
      role: 'ally',
      maxHp: 30,
      tempHp: 0,
      ac: 19,
      pd: 15,
      md: 17,
      initiativeBonus: 1,
      note: '',
    });
  },
});

export const ExtraEscapeCancels = meta.story({
  name: 'Escape cancels without saving',
  args: { mode: 'edit', value: vashti },
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name' }), ' II');
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraCloseButton = meta.story({
  name: 'Close cancels without saving',
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const ExtraClearTags = meta.story({
  name: 'Clear removes the tag filter',
  play: async ({ canvas }) => {
    await openLibrary(canvas);
    await filterOrcs(canvas, true);
    await expect(presetList(canvas).getAllByRole('button')).toHaveLength(2);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(canvas.queryByRole('button', { name: 'Remove Orcs' })).toBeNull();
    await expect(presetList(canvas).getAllByRole('button')).toHaveLength(5);
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Добавить юнит' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Имя' })).toHaveAttribute(
      'placeholder',
      'Враг 1',
    );
    await expect(canvas.getByRole('spinbutton', { name: 'Бонус инициативы' })).toBeVisible();
  },
});
