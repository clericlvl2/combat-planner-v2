import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { LIMITS } from '@combat-planner/domain';
import type { Preset, Role } from '@combat-planner/domain';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { TagSheetTag } from '../TagSheet/TagSheet.tsx';
import { UnitForm } from './UnitForm.tsx';
import type { UnitDraft, UnitFormHint, UnitFormMode } from './UnitForm.tsx';
import { anyValue, storyT } from '../../storybook/storyT.ts';

interface UnitFormCellProps {
  mode?: UnitFormMode;
  value?: Partial<UnitDraft>;
  lockRole?: boolean;
  lockMaxHp?: boolean;
  library?: boolean;
  unitNames?: readonly string[];
  hint?: UnitFormHint;
  onSubmit?: (draft: UnitDraft) => void;
  onCancel?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const at = '2026-10-15T12:00:00.000Z';

const exact = (text: string) => text;

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
  lockMaxHp,
  library = true,
  unitNames,
  hint,
  onSubmit,
  onCancel,
}: UnitFormCellProps) {
  return (
    <div style={stage}>
      <UnitForm
        opened
        mode={mode}
        value={value}
        lockRole={lockRole}
        lockMaxHp={lockMaxHp}
        presets={library ? presets : undefined}
        tags={tags}
        combatTitle="Ambush at the Ferry"
        unitNames={unitNames}
        hint={hint}
        onSubmit={(draft) => onSubmit?.(draft)}
        onCancel={() => onCancel?.()}
      />
    </div>
  );
}

function TakenEnemyNames(args: UnitFormCellProps) {
  const { t } = useTranslation('UnitForm');
  const enemy = (n: number) => t('defaultName', { role: t('enemy'), n });
  return <UnitFormCell {...args} unitNames={[enemy(1), enemy(3)]} />;
}

const meta = preview.meta({
  title: 'Organisms/UnitForm',
  component: UnitFormCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onSubmit: fn(), onCancel: fn() },
});

type Canvas = ReturnType<typeof within>;

const openLibrary = async (canvas: Canvas, t: TFunction) => {
  await userEvent.click(canvas.getByRole('radio', { name: t('library') }));
};

const filterOrcs = async (canvas: Canvas, apply: boolean, t: TFunction) => {
  await userEvent.click(
    canvas.getByRole('button', { name: (label: string) => label.startsWith(t('tags')) }),
  );
  await userEvent.click(await canvas.findByRole('checkbox', { name: /^Orcs/ }));
  if (apply) {
    await userEvent.click(
      canvas.getByRole('button', { name: t('TagSheet:showPresets', { count: 2 }) }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('TagSheet:filterTitle') })).toBeNull(),
    );
  }
};

const presetList = (canvas: Canvas, t: TFunction) =>
  within(canvas.getByRole('group', { name: t('presets') }));

const typeNumber = async (canvas: Canvas, label: string, text: string) => {
  const field = canvas.getByRole('spinbutton', { name: label });
  await userEvent.clear(field);
  await userEvent.type(field, `${text}{Enter}`);
  return field;
};

export const AddFilled = meta.story({
  tags: ['visual'],
  args: { value: orcShaman },
});

export const AddEmpty = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await expect(canvas.getByRole('dialog', { name: t('addTitle') })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: t('name') })).toHaveAttribute(
      'placeholder',
      t('TextField:namePlaceholder'),
    );
    await expect(canvas.getByRole('radio', { name: t('enemy') })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toHaveValue('10');
    await expect(canvas.getByRole('spinbutton', { name: t('initiativeBonus') })).toHaveValue('+0');
  },
});

export const LibraryTab = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await expect(presetList(canvas, t).getAllByRole('button')).toHaveLength(5);
    await expect(canvas.getByRole('button', { name: t('pickPreset') })).toBeDisabled();
  },
});

export const LibraryTagFilterOpen = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await filterOrcs(canvas, false, t);
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: t('TagSheet:showPresets', { count: 2 }) }),
      ).toBeVisible(),
    );
  },
});

export const LibraryPresetPicked = meta.story({
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await filterOrcs(canvas, true, t);
    await expect(
      canvas.getByRole('button', { name: t('removeTag', { name: 'Orcs' }) }),
    ).toBeVisible();
    const list = presetList(canvas, t);
    await expect(list.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(
      list.getByRole('button', {
        name: (label: string) => label.startsWith(`${t('enemy')} Orc Berserker`),
      }),
    );
    await expect(
      list.getByRole('button', {
        name: (label: string) => label.startsWith(`${t('enemy')} Orc Berserker`),
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      canvas.getByRole('button', { name: t('addPreset', { name: 'Orc Berserker' }) }),
    ).toBeEnabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const Edit = meta.story({
  args: { mode: 'edit', value: vashti },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await expect(canvas.getByRole('dialog', { name: t('editTitle') })).toBeVisible();
    await expect(canvas.queryByRole('radio', { name: t('library') })).toBeNull();
    await expect(canvas.getByRole('button', { name: t('saveChanges') })).toBeEnabled();
  },
});

export const LibrarySearchResults = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchPresets') }), 'gob');
    const list = presetList(canvas, t);
    await expect(list.getAllByRole('button')).toHaveLength(1);
    await expect(list.getByText('Goblin Archer')).toBeVisible();
    await expect(
      canvas.queryByText(t('noMatchQuery', { query: 'gob' }), { normalizer: exact }),
    ).toBeNull();
  },
});

export const LibraryNothingFound = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await filterOrcs(canvas, true, t);
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchPresets') }), 'dragon');
    await expect(canvas.getByText(t('nothingFound'))).toBeVisible();
    await expect(
      canvas.getByText(t('noMatchQueryTags', { query: 'dragon', tags: 'Orcs' }), {
        normalizer: exact,
      }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('pickPreset') })).toBeDisabled();
  },
});

export const MinimumValues = meta.story({
  args: { mode: 'edit', value: { ...vashti, maxHp: LIMITS.maxHp.min, tempHp: 0 } },
});

export const LongName = meta.story({
  tags: ['visual'],
  args: {
    mode: 'edit',
    value: { ...vashti, name: 'Капитан стражи переправы Святослав Огнев', role: 'ally', note: '' },
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    const name = canvas.getByRole('textbox', { name: t('name') });
    await expect(name).toHaveValue('Капитан стражи переправы Святослав Огнев');
    await expect(canvas.getByText(`${LIMITS.unitName}/${LIMITS.unitName}`)).toBeVisible();
  },
});

export const RoleLocked = meta.story({
  args: { mode: 'edit', value: vashti, lockRole: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    const hero = canvas.getByRole('radio', { name: t('hero') });
    await expect(hero).toBeChecked();
    await expect(hero).toBeDisabled();
    await userEvent.click(canvas.getByRole('radio', { name: t('enemy') }));
    await expect(hero).toBeChecked();
    await userEvent.click(canvas.getByRole('button', { name: t('saveChanges') }));
    await expect(args.onSubmit).toHaveBeenCalledWith(vashti);
  },
});

export const MaxHpLocked = meta.story({
  name: 'Max HP Locked',
  args: { mode: 'edit', value: vashti, lockMaxHp: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    const maxHp = canvas.getByRole('spinbutton', { name: t('maxHp') });
    await expect(maxHp).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: t('Stepper:increaseField', { label: t('maxHp') }) }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: t('Stepper:decreaseField', { label: t('maxHp') }) }),
    ).toBeDisabled();
    await expect(canvas.getByRole('spinbutton', { name: t('ac') })).toBeEnabled();
    await userEvent.click(
      canvas.getByRole('button', { name: t('Stepper:increaseField', { label: t('ac') }) }),
    );
    await userEvent.click(canvas.getByRole('button', { name: t('saveChanges') }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ ...vashti, ac: vashti.ac + 1 });
  },
});

export const HintCombatActive = meta.story({
  args: { library: false, hint: 'active', value: { initiativeBonus: 2 } },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await expect(
      canvas.getByText(t('hintActive', { bonus: '+2' }), { normalizer: exact }),
    ).toBeVisible();
  },
});

export const HintSetup = meta.story({
  args: { library: false, hint: 'setup' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await expect(canvas.getByText(t('hintSetup'))).toBeVisible();
  },
});

export const LibrarySeveralTagChips = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await userEvent.click(
      canvas.getByRole('button', { name: (label: string) => label.startsWith(t('tags')) }),
    );
    await userEvent.click(await canvas.findByRole('checkbox', { name: /^Orcs/ }));
    await userEvent.click(canvas.getByRole('checkbox', { name: /^Ferry/ }));
    await userEvent.click(canvas.getByRole('checkbox', { name: /^Goblins/ }));
    await userEvent.click(
      canvas.getByRole('button', { name: anyValue(t, 'TagSheet:showPresets', 'count') }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('TagSheet:filterTitle') })).toBeNull(),
    );
    for (const name of ['Orcs', 'Ferry', 'Goblins']) {
      await expect(canvas.getByRole('button', { name: t('removeTag', { name }) })).toBeVisible();
    }
  },
});

export const AddFromLibrarySubmitsPreset = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await filterOrcs(canvas, true, t);
    await userEvent.click(
      presetList(canvas, t).getByRole('button', {
        name: (label: string) => label.startsWith(`${t('enemy')} Orc Berserker`),
      }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: t('addPreset', { name: 'Orc Berserker' }) }),
    );
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
  },
});

export const SubmitsTypedValues = meta.story({
  tags: ['!dev'],
  args: { library: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await expect(canvas.queryByRole('radio', { name: t('library') })).toBeNull();
    await userEvent.type(canvas.getByRole('textbox', { name: t('name') }), 'Orc Shaman');
    canvas.getByRole('radio', { name: t('enemy') }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: t('ally') })).toBeChecked();
    await typeNumber(canvas, t('maxHp'), '30');
    canvas.getByRole('spinbutton', { name: t('tempHp') }).focus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await typeNumber(canvas, t('ac'), '17');
    await typeNumber(canvas, t('pd'), '15');
    await typeNumber(canvas, t('md'), '16');
    const increase = canvas.getAllByRole('button', {
      name: anyValue(t, 'Stepper:increaseField', 'label'),
    });
    await userEvent.click(increase[increase.length - 1] ?? document.body);
    await userEvent.type(canvas.getByRole('textbox', { name: t('note') }), 'Calls the storm');
    await userEvent.click(canvas.getByRole('button', { name: t('addUnit') }));
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

export const EmptyNameGetsDefaultName = meta.story({
  tags: ['!dev'],
  render: (args: UnitFormCellProps) => <TakenEnemyNames {...args} />,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    const name = canvas.getByRole('textbox', { name: t('name') });
    await expect(name).toHaveAttribute('placeholder', t('defaultName', { role: t('enemy'), n: 2 }));
    await userEvent.click(canvas.getByRole('radio', { name: t('hero') }));
    await expect(name).toHaveAttribute('placeholder', t('defaultName', { role: t('hero'), n: 1 }));
    await userEvent.click(canvas.getByRole('button', { name: t('addUnit') }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: t('defaultName', { role: t('hero'), n: 1 }),
        role: 'hero',
        maxHp: 10,
        ac: 10,
      }),
    );
  },
});

export const BlankNameKeepsPrevious = meta.story({
  tags: ['!dev'],
  args: { mode: 'edit', value: vashti },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    const name = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.clear(name);
    await userEvent.type(name, '   ');
    await expect(name).toHaveAttribute('placeholder', vashti.name);
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    const save = canvas.getByRole('button', { name: t('saveChanges') });
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSubmit).toHaveBeenCalledWith(vashti);
  },
});

export const ClampsToLimits = meta.story({
  tags: ['!dev'],
  args: { mode: 'edit', value: vashti },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await expect(await typeNumber(canvas, t('maxHp'), '1500')).toHaveValue(
      String(LIMITS.maxHp.max),
    );
    await expect(await typeNumber(canvas, t('tempHp'), '-5')).toHaveValue(
      String(LIMITS.tempHp.min),
    );
    await expect(await typeNumber(canvas, t('ac'), '150')).toHaveValue(String(LIMITS.defense.max));
    await expect(await typeNumber(canvas, t('initiativeBonus'), '-120')).toHaveValue(
      `−${Math.abs(LIMITS.initiativeBonus.min)}`,
    );
    const name = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.clear(name);
    await userEvent.type(name, 'x'.repeat(LIMITS.unitName + 5));
    await expect(name).toHaveValue('x'.repeat(LIMITS.unitName));
    await userEvent.click(canvas.getByRole('button', { name: t('saveChanges') }));
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

export const PickFillsForm = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await userEvent.click(
      presetList(canvas, t).getByRole('button', {
        name: (label: string) => label.startsWith(`${t('ally')} Brother Tomas`),
      }),
    );
    await userEvent.click(canvas.getByRole('radio', { name: t('new') }));
    await expect(canvas.getByRole('textbox', { name: t('name') })).toHaveValue(
      'Brother Tomas of the Silver Lantern Order',
    );
    await expect(canvas.getByRole('radio', { name: t('ally') })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toHaveValue('30');
    await expect(canvas.getByRole('spinbutton', { name: t('ac') })).toHaveValue('19');
    await expect(canvas.getByRole('spinbutton', { name: t('initiativeBonus') })).toHaveValue('+1');
    await userEvent.click(canvas.getByRole('button', { name: t('addUnit') }));
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

export const PickResetsOnSearch = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await userEvent.click(
      presetList(canvas, t).getByRole('button', {
        name: (label: string) => label.startsWith(`${t('enemy')} Orc Berserker`),
      }),
    );
    await expect(
      canvas.getByRole('button', { name: t('addPreset', { name: 'Orc Berserker' }) }),
    ).toBeEnabled();
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchPresets') }), 'gob');
    const cta = canvas.getByRole('button', { name: t('pickPreset') });
    await expect(cta).toBeDisabled();
    await userEvent.click(cta, { pointerEventsCheck: 0 });
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
});

export const PickResetsOnTab = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await userEvent.click(
      presetList(canvas, t).getByRole('button', {
        name: (label: string) => label.startsWith(`${t('enemy')} Orc Berserker`),
      }),
    );
    await userEvent.click(canvas.getByRole('radio', { name: t('new') }));
    const name = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.clear(name);
    await userEvent.type(name, 'Grunt');
    await openLibrary(canvas, t);
    await expect(canvas.getByRole('button', { name: t('pickPreset') })).toBeDisabled();
    await expect(
      canvas.queryByRole('button', { name: t('addPreset', { name: 'Orc Berserker' }) }),
    ).toBeNull();
    await userEvent.click(
      presetList(canvas, t).getByRole('button', {
        name: (label: string) => label.startsWith(`${t('enemy')} Orc Berserker`),
      }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: t('addPreset', { name: 'Orc Berserker' }) }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Orc Berserker', maxHp: 40 }),
    );
  },
});

export const ClearRemovesTagFilter = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitForm');
    await openLibrary(canvas, t);
    await filterOrcs(canvas, true, t);
    await expect(presetList(canvas, t).getAllByRole('button')).toHaveLength(2);
    await userEvent.click(canvas.getByRole('button', { name: t('clear') }));
    await expect(
      canvas.queryByRole('button', { name: t('removeTag', { name: 'Orcs' }) }),
    ).toBeNull();
    await expect(presetList(canvas, t).getAllByRole('button')).toHaveLength(5);
  },
});
