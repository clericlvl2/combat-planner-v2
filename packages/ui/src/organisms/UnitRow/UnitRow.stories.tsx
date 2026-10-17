import preview from '#.storybook/preview';
import { CONDITIONS } from '@combat-planner/domain';
import type { Condition, Unit } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { layout } from '../../layout.ts';
import { ConditionPicker } from '../ConditionPicker/ConditionPicker.tsx';
import { UnitRow } from './UnitRow.tsx';
import type { UnitRowCallbacks, UnitRowProps } from './UnitRow.tsx';

type UnitSeed = Pick<Unit, 'id' | 'name' | 'role' | 'initiative' | 'hp' | 'maxHp'> &
  Partial<Unit> & { defenses: [number, number, number] };

const unitDefaults = {
  initiativeBonus: 0,
  tempHp: 0,
  note: '',
  conditions: [],
  disabled: false,
  claimedBy: null,
  hpHistory: [],
};

function unitOf({ defenses: [ac, pd, md], ...seed }: UnitSeed): Unit {
  return { ...unitDefaults, ...seed, ac, pd, md };
}

const MIKA = '01JC0000000000000000000MKA';
const ALEXANDRA = '01JC0000000000000000000AKS';

const players: Record<string, string> = {
  [MIKA]: 'Mika',
  [ALEXANDRA]: 'Александра Константиновна Вишневецкая',
};

const hexNote = 'Hex on Orc Berserker until the end of round 4';

const vashtiSeed: UnitSeed = {
  id: '01JC00000000000000000VASHT',
  name: 'Vashti the Hexer',
  role: 'hero',
  initiative: 15,
  initiativeBonus: 3,
  hp: 20,
  maxHp: 36,
  defenses: [16, 14, 19],
  conditions: ['dazed'],
};

const vashti = unitOf(vashtiSeed);

const vashtiExpanded = unitOf({ ...vashtiSeed, conditions: ['dazed', 'weakened'], note: hexNote });

const orcSeed: UnitSeed = {
  id: '01JC00000000000000000RCBRS',
  name: 'Orc Berserker',
  role: 'enemy',
  initiative: 17,
  hp: 14,
  maxHp: 40,
  defenses: [18, 16, 12],
};

const dragonSeed: UnitSeed = {
  id: '01JC000000000000000DRAGN1',
  name: 'Ancient Black Dragon',
  role: 'enemy',
  initiative: 22,
  hp: 287,
  maxHp: 320,
  defenses: [24, 22, 20],
};

const goblinSeed: UnitSeed = {
  id: '01JC00000000000000000GBLN1',
  name: 'Goblin Archer 1',
  role: 'enemy',
  initiative: 12,
  hp: -3,
  maxHp: 18,
  defenses: [16, 14, 12],
};

const shadowArcher = unitOf({
  id: '01JC00000000000000000SHDW1',
  name: '影の射手ゴブリン',
  role: 'enemy',
  initiative: 7,
  hp: 18,
  maxHp: 18,
  defenses: [16, 14, 12],
  conditions: ['stuck'],
  disabled: true,
});

const screen: CSSProperties = { padding: layout.contentEdge };

type UnitRowCellProps = Omit<UnitRowProps, 'claimedByName' | 'readOnly' | keyof UnitRowCallbacks> &
  UnitRowCallbacks & {
    readOnly?: boolean;
    picker?: boolean;
  };

function UnitRowCell({
  unit: initialUnit,
  expanded: initiallyExpanded = false,
  initiativeOpen: initiallyInitiativeOpen = false,
  menuOpen: initiallyMenuOpen = false,
  conditionsOpen: initiallyConditionsOpen = false,
  picker = false,
  onToggle,
  onInitiative,
  onInitiativeSet,
  onInitiativeRoll,
  onInitiativeClose,
  onConditions,
  onNoteChange,
  onMore,
  onMenuClose,
  readOnly = false,
  ...props
}: UnitRowCellProps) {
  const [unit, setUnit] = useState(initialUnit);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [initiativeOpen, setInitiativeOpen] = useState(initiallyInitiativeOpen);
  const [menuOpen, setMenuOpen] = useState(initiallyMenuOpen);
  const [conditionsOpen, setConditionsOpen] = useState(initiallyConditionsOpen);
  return (
    <div style={screen}>
      <UnitRow
        {...props}
        {...(readOnly ? { readOnly: true as const } : { readOnly: false as const })}
        unit={unit}
        claimedByName={unit.claimedBy ? players[unit.claimedBy] : undefined}
        expanded={expanded}
        initiativeOpen={initiativeOpen}
        menuOpen={menuOpen}
        conditionsOpen={conditionsOpen}
        onToggle={() => {
          setExpanded((value) => !value);
          onToggle();
        }}
        onInitiative={() => {
          setInitiativeOpen(true);
          onInitiative();
        }}
        onInitiativeSet={(initiative) => {
          setUnit((current) => ({ ...current, initiative }));
          onInitiativeSet(initiative);
        }}
        onInitiativeRoll={(initiative, roll) => {
          setUnit((current) => ({ ...current, initiative }));
          onInitiativeRoll(initiative, roll);
        }}
        onInitiativeClose={() => {
          setInitiativeOpen(false);
          onInitiativeClose();
        }}
        onConditions={() => {
          if (picker) setConditionsOpen(true);
          onConditions();
        }}
        onNoteChange={(note) => {
          setUnit((current) => ({ ...current, note }));
          onNoteChange(note);
        }}
        onMore={() => {
          setMenuOpen((value) => !value);
          onMore();
        }}
        onMenuClose={() => {
          setMenuOpen(false);
          onMenuClose();
        }}
      />
      {picker ? (
        <ConditionPicker
          opened={conditionsOpen}
          unitName={unit.name}
          value={unit.conditions}
          onChange={(conditions) => setUnit((current) => ({ ...current, conditions }))}
          onClose={() => setConditionsOpen(false)}
        />
      ) : null}
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/UnitRow',
  component: UnitRowCell,
  parameters: { phoneFrame: true },
  args: {
    unit: vashti,
    active: true,
    random: () => 0.5,
    onToggle: fn(),
    onInitiative: fn(),
    onInitiativeSet: fn(),
    onInitiativeRoll: fn(),
    onInitiativeClose: fn(),
    onHp: fn(),
    onConditions: fn(),
    onHistory: fn(),
    onNoteChange: fn(),
    onEdit: fn(),
    onMore: fn(),
    onMenuClose: fn(),
    onDuplicate: fn(),
    onSetDisabled: fn(),
    onSaveAsPreset: fn(),
    onReleaseClaim: fn(),
    onRemove: fn(),
  },
});

export const Anatomy = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const chevron = canvas.getByRole('button', { name: 'Unit details' });
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText('Vashti the Hexer')).toBeVisible();
    await expect(canvas.getByText('AC 16 · PD 14 · MD 19')).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent('dazed');
    await expect(canvas.getByRole('button', { name: '20 /36 Wounded' })).toBeVisible();
    await expect(canvasElement.querySelector('[data-active] [data-notch]')).not.toBeNull();
  },
});

export const Full = meta.story({
  args: {
    active: false,
    unit: unitOf({
      id: '01JC00000000000000000ALDRC',
      name: 'Ser Aldric',
      role: 'hero',
      initiative: 19,
      hp: 52,
      maxHp: 52,
      defenses: [21, 17, 15],
    }),
  },
});

export const ActiveTurnWounded = meta.story({
  name: 'Active turn, Wounded',
});

export const Bloodied = meta.story({
  args: { active: false, unit: unitOf({ ...orcSeed, conditions: ['staggered'] }) },
});

export const Dead = meta.story({
  args: { active: false, unit: unitOf(goblinSeed) },
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByText('Goblin Archer 1')).textDecorationLine).toBe(
      'line-through',
    );
    await expect(canvas.getByText('Dead')).toBeVisible();
  },
});

export const Disabled = meta.story({
  args: { active: false, unit: shadowArcher },
  play: async ({ canvas, canvasElement }) => {
    await expect(getComputedStyle(canvas.getByText('影の射手ゴブリン')).textDecorationLine).toBe(
      'none',
    );
    await expect(canvasElement.querySelector('[data-inactive]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-off]')).not.toBeNull();
  },
});

export const AllyTempHPLongName = meta.story({
  name: 'Ally, temp HP, long name',
  args: {
    active: false,
    unit: unitOf({
      id: '01JC00000000000000000TMAS1',
      name: 'Brother Tomas of the Silver Lantern Order',
      role: 'ally',
      initiative: 9,
      hp: 30,
      maxHp: 30,
      tempHp: 5,
      defenses: [19, 15, 17],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('+5 temp')).toBeVisible();
  },
});

export const VariantsStates40CharactersRu = meta.story({
  name: '40 characters, ru',
  args: {
    active: false,
    unit: unitOf({
      id: '01JC00000000000000000SVYT1',
      name: 'Капитан стражи переправы Святослав Огнев',
      role: 'ally',
      initiative: 10,
      hp: 40,
      maxHp: 40,
      defenses: [19, 16, 13],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Капитан стражи переправы Святослав Огнев')).toBeVisible();
  },
});

export const WithNote = meta.story({
  name: 'With note',
  args: { active: false, unit: unitOf({ ...vashtiSeed, note: hexNote }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(hexNote)).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Note' })).toBeVisible();
  },
});

const claimedConditions: Condition[] = ['dazed', 'weakened', 'hindered'];

export const ShortPlayerName = meta.story({
  name: 'Short player name',
  args: {
    active: false,
    unit: unitOf({ ...vashtiSeed, conditions: claimedConditions, claimedBy: MIKA }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Mika')).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Claimed by' })).toBeVisible();
  },
});

export const LongPlayerName37Characters = meta.story({
  name: 'Long player name, 37 characters',
  args: {
    active: false,
    unit: unitOf({ ...vashtiSeed, conditions: claimedConditions, claimedBy: ALEXANDRA }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Александра Константиновна Вишневецкая')).toBeVisible();
  },
});

export const Expanded = meta.story({
  args: { unit: vashtiExpanded, expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Unit details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Conditions' })).not.toHaveAttribute(
      'data-tap',
    );
    await expect(canvas.getByRole('button', { name: 'HP History' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: `Note: ${hexNote}` })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(canvas.queryByRole('img', { name: 'Note' })).toBeNull();
  },
});

export const ConditionsListOpen = meta.story({
  name: 'Conditions: list open',
  args: { unit: vashtiExpanded, expanded: true, conditionsOpen: true },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Conditions' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('data-open');
  },
});

export const InitiativeTapTheRoleBlock = meta.story({
  name: 'Initiative: tap the role block',
  args: { unit: vashtiExpanded, initiativeOpen: true, 'data-tap': 'initiative' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Initiative' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Roll d20 +3' })).toBeVisible();
  },
});

export const HPHistoryOpen = meta.story({
  name: 'HP History open',
  args: { unit: vashtiExpanded, expanded: true, historyOpen: true },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'HP History' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('data-open');
  },
});

export const EditAnd = meta.story({
  name: 'Edit and ⋯',
  args: { unit: vashtiExpanded, expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'More actions' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const Open = meta.story({
  name: '⋯ open',
  args: { unit: vashtiExpanded, expanded: true, menuOpen: true },
  play: async ({ canvas }) => {
    const menu = await canvas.findByRole('menu', { name: 'Actions for Vashti the Hexer' });
    const items = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    await expect(items).toEqual([
      'Duplicate',
      'Disable',
      'Save as preset',
      'Release claim',
      'Remove',
    ]);
  },
});

export const Wounded287320 = meta.story({
  name: 'Wounded, 287/320',
  args: { active: false, unit: unitOf(dragonSeed) },
});

export const BloodiedTemp120 = meta.story({
  name: 'Bloodied, temp +120',
  args: { active: false, unit: unitOf({ ...dragonSeed, hp: 112, tempHp: 120 }) },
});

export const Full999999 = meta.story({
  name: 'Full, 999/999',
  args: {
    active: false,
    unit: unitOf({
      id: '01JC00000000000000000TRRSQ',
      name: 'The Tarrasque',
      role: 'enemy',
      initiative: 3,
      hp: 999,
      maxHp: 999,
      defenses: [30, 28, 26],
    }),
  },
});

export const Dead105320 = meta.story({
  name: 'Dead, −105/320',
  args: { active: false, unit: unitOf({ ...dragonSeed, hp: -105 }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('−105')).toBeVisible();
  },
});

export const DeBlutend = meta.story({
  name: 'de · Blutend',
  globals: { locale: 'de' },
  args: { active: false, unit: unitOf({ ...orcSeed, name: 'Ork-Berserker' }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Blutend')).toBeVisible();
  },
});

export const EsMalheridoTemp = meta.story({
  name: 'es · Malherido + temp',
  globals: { locale: 'es' },
  args: { active: false, unit: unitOf({ ...orcSeed, name: 'Berserker orco', tempHp: 5 }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Malherido')).toBeVisible();
    await expect(canvas.getByText('+5 temp.')).toBeVisible();
  },
});

export const FrEnsanglant3Digits = meta.story({
  name: 'fr · Ensanglanté, 3 digits',
  globals: { locale: 'fr' },
  args: { active: false, unit: unitOf({ ...dragonSeed, name: 'Dragon noir ancien', hp: 112 }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Ensanglanté')).toBeVisible();
  },
});

export const Ja = meta.story({
  name: 'ja · 重傷',
  globals: { locale: 'ja' },
  args: { active: false, unit: unitOf({ ...orcSeed, name: 'オークの狂戦士' }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('重傷')).toBeVisible();
  },
});

export const Ru3DigitsTemp = meta.story({
  name: 'ru · Тяжело ранен, 3 digits + temp',
  globals: { locale: 'ru' },
  args: {
    active: false,
    unit: unitOf({ ...dragonSeed, name: 'Древний чёрный дракон', hp: 112, tempHp: 120 }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Тяжело ранен')).toBeVisible();
    await expect(canvas.getByText('+120 врем.')).toBeVisible();
  },
});

export const Ru = meta.story({
  name: 'ru · Мёртв',
  globals: { locale: 'ru' },
  args: { active: false, unit: unitOf({ ...goblinSeed, name: 'Гоблин-лучник' }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Мёртв')).toBeVisible();
  },
});

export const FourConditionsAllShown = meta.story({
  name: 'Four conditions, all shown',
  args: {
    active: false,
    unit: unitOf({ ...orcSeed, conditions: ['staggered', 'dazed', 'vulnerable', 'stuck'] }),
  },
  play: async ({ canvas }) => {
    const chips = canvas.getAllByRole('listitem');
    await expect(chips.map((chip) => chip.textContent)).toEqual([
      'staggered',
      'dazed',
      'vulnerable',
      'stuck',
    ]);
  },
});

export const All12Colors = meta.story({
  name: 'All 12 colors',
  args: {
    active: false,
    unit: unitOf({
      id: '01JC00000000000000000PLTT1',
      name: 'Condition palette',
      role: 'enemy',
      initiative: 6,
      hp: 10,
      maxHp: 10,
      defenses: [10, 10, 10],
      conditions: [...CONDITIONS.filter((item) => item !== 'staggered'), 'staggered'],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(CONDITIONS.length);
  },
});

export const ExtraFlowTapRow = meta.story({
  name: 'Flow: tap the row to expand it',
  args: { unit: vashtiExpanded },
  play: async ({ args, canvas }) => {
    const chevron = canvas.getByRole('button', { name: 'Unit details' });
    await userEvent.click(canvas.getByText('Vashti the Hexer'));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'HP History' }));
    await expect(args.onHistory).toHaveBeenCalledOnce();
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
  },
});

export const ExtraFlowTapRoleBlock = meta.story({
  name: 'Flow: tap the role block to set initiative',
  args: { unit: vashtiExpanded, active: false },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Roll initiative' }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    const dialog = canvas.getByRole('dialog', { name: 'Initiative' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Increase' }));
    await expect(args.onInitiativeSet).toHaveBeenCalledOnce();
    await expect(args.onInitiativeSet).toHaveBeenCalledWith(16);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Roll d20 +3' }));
    await expect(args.onInitiativeRoll).toHaveBeenCalledOnce();
    await expect(args.onInitiativeRoll).toHaveBeenCalledWith(14, 11);
    await expect(canvas.getByRole('button', { name: 'Roll initiative' })).toHaveTextContent(/^14/);
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const ExtraChevronToggles = meta.story({
  name: 'Chevron toggles, a tap on HP never does',
  args: { unit: vashtiExpanded },
  play: async ({ args, canvas }) => {
    const chevron = canvas.getByRole('button', { name: 'Unit details' });
    await userEvent.click(canvas.getByRole('button', { name: '20 /36 Wounded' }));
    await userEvent.click(canvas.getByText('Wounded'));
    await expect(args.onHp).toHaveBeenCalledTimes(2);
    await expect(args.onToggle).not.toHaveBeenCalled();
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
  },
});

async function pickMenuItem(canvasElement: HTMLElement, name: string) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
  await userEvent.click(await canvas.findByRole('menuitem', { name }));
  await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
}

export const ExtraActions = meta.story({
  name: 'Each action fires its own callback once',
  args: { unit: { ...vashtiExpanded, claimedBy: MIKA }, expanded: true },
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    await expect(args.onConditions).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'HP History' }));
    await expect(args.onHistory).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, 'Duplicate');
    await expect(args.onDuplicate).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, 'Disable');
    await expect(args.onSetDisabled).toHaveBeenCalledOnce();
    await expect(args.onSetDisabled).toHaveBeenCalledWith(true);
    await pickMenuItem(canvasElement, 'Save as preset');
    await expect(args.onSaveAsPreset).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, 'Release claim');
    await expect(args.onReleaseClaim).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, 'Remove');
    await expect(args.onRemove).toHaveBeenCalledOnce();
    await expect(args.onMore).toHaveBeenCalledTimes(5);
    await expect(args.onMenuClose).toHaveBeenCalledTimes(5);
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
  },
});

export const ExtraReleaseClaimUnclaimed = meta.story({
  name: 'Release claim stays visible and disabled when nobody claimed the unit',
  args: { unit: vashtiExpanded, expanded: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    const release = await canvas.findByRole('menuitem', { name: 'Release claim' });
    await expect(release).toBeDisabled();
    await userEvent.click(release, { pointerEventsCheck: 0 });
    await expect(args.onReleaseClaim).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toBeEnabled();
  },
});

export const ExtraFlashSkipsDeadAndDisabled = meta.story({
  name: 'The flash border skips dead and disabled rows',
  args: { active: false, flash: true },
  render: (args) => (
    <div style={{ ...screen, display: 'grid', gap: layout.listGap }}>
      <UnitRow {...args} unit={unitOf(goblinSeed)} readOnly data-testid="dead" />
      <UnitRow {...args} unit={shadowArcher} readOnly data-testid="disabled" />
      <UnitRow {...args} unit={unitOf(orcSeed)} readOnly data-testid="alive" />
    </div>
  ),
  play: async ({ canvas }) => {
    const border = (id: string) => getComputedStyle(canvas.getByTestId(id)).borderTopColor;
    await expect(border('dead')).toBe('rgb(226, 216, 198)');
    await expect(border('disabled')).toBe('rgb(226, 216, 198)');
    await expect(border('alive')).not.toBe('rgb(226, 216, 198)');
  },
});

export const ExtraRoleBlockTogglesPopover = meta.story({
  name: 'The role block closes its own popover',
  args: { unit: vashtiExpanded, active: false, initiativeOpen: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Initiative' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Roll initiative' }));
    await expect(args.onInitiativeClose).toHaveBeenCalledOnce();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraTapMarkerOnActiveRow = meta.story({
  name: 'The tap marker stays visible on the active row',
  args: { active: true, 'data-tap': 'hp' },
  play: async ({ canvas }) => {
    const hp = canvas.getByRole('button', { name: '20 /36 Wounded' });
    await expect(getComputedStyle(hp).outlineColor).toBe('rgb(35, 31, 28)');
  },
});

export const ExtraReadOnlyWithoutCallbacks = meta.story({
  name: 'A read-only row needs no callbacks',
  args: { active: false },
  render: () => (
    <div style={screen}>
      <UnitRow unit={vashti} readOnly />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText('Vashti the Hexer'));
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.getByText('Vashti the Hexer')).toBeVisible();
  },
});

export const ExtraReadOnlyEveryTapWithoutCallbacks = meta.story({
  name: 'A read-only row with every flag set survives every tap without callbacks',
  args: { active: false },
  render: () => (
    <div style={screen}>
      <UnitRow
        unit={unitOf({ ...orcSeed, conditions: ['staggered'], note: 'Hex until round 4' })}
        readOnly
        expanded
        initiativeOpen
        conditionsOpen
        historyOpen
        menuOpen
        data-testid="row"
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const errors: unknown[] = [];
    const record = (event: ErrorEvent) => errors.push(event.error);
    window.addEventListener('error', record);
    const row = canvas.getByTestId('row');
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(canvas.queryByRole('menu')).toBeNull();
    for (const target of [row, ...row.querySelectorAll<HTMLElement>('*')]) {
      await userEvent.click(target, { pointerEventsCheck: 0 });
    }
    row.focus();
    await userEvent.keyboard('{Enter} ');
    window.removeEventListener('error', record);
    await expect(errors).toEqual([]);
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(row).not.toHaveAttribute('data-expanded');
  },
});

export const ExtraDisabledOpensHp = meta.story({
  name: 'Disabled unit still opens HP and offers Enable',
  args: { active: false, unit: shadowArcher, expanded: true },
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: '18 /18' }));
    await expect(args.onHp).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await pickMenuItem(canvasElement, 'Enable');
    await expect(args.onSetDisabled).toHaveBeenCalledOnce();
    await expect(args.onSetDisabled).toHaveBeenCalledWith(false);
  },
});

export const ExtraConditionsPicker = meta.story({
  name: 'Conditions opens the picker and the chips follow',
  args: { unit: vashtiExpanded, active: false, expanded: true, 'data-tap': 'conditions' },
  render: (args) => <UnitRowCell {...args} picker />,
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Conditions' });
    await expect(trigger).toHaveAttribute('data-tap');
    await userEvent.click(trigger);
    await expect(args.onConditions).toHaveBeenCalledOnce();
    const sheet = await canvas.findByRole('dialog', { name: 'Conditions' });
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'hindered' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const chips = canvas.getAllByRole('listitem');
    await expect(chips.map((chip) => chip.textContent)).toEqual(['dazed', 'hindered', 'weakened']);
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const ExtraNoteEnterSaves = meta.story({
  name: 'Note: tap edits in place, Enter saves',
  args: { unit: vashtiExpanded, expanded: true, 'data-tap': 'note' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: `Note: ${hexNote}` }));
    const editor = canvas.getByRole('textbox', { name: 'Note' });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Hex ends next round');
    await userEvent.keyboard('{Enter}');
    await expect(args.onNoteChange).toHaveBeenCalledOnce();
    await expect(args.onNoteChange).toHaveBeenCalledWith('Hex ends next round');
    await expect(canvas.getByRole('button', { name: 'Note: Hex ends next round' })).toBeVisible();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const ExtraSetupNoInitiative = meta.story({
  name: 'Setup, no initiative',
  args: { active: false, unit: unitOf({ ...vashtiSeed, initiative: null }) },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('img', { name: 'No initiative' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Roll initiative' }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    const dialog = canvas.getByRole('dialog', { name: 'Initiative' });
    await expect(within(dialog).getByRole('spinbutton')).toHaveValue('—');
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

type KeyboardSpies = Pick<
  UnitRowProps,
  'onInitiative' | 'onInitiativeClose' | 'onHp' | 'onToggle' | 'onConditions'
>;

async function keyboardWalk(canvasElement: HTMLElement, args: KeyboardSpies) {
  const canvas = within(canvasElement);
  const role = canvas.getByRole('button', { name: 'Roll initiative' });
  const chevron = canvas.getByRole('button', { name: 'Unit details' });
  await userEvent.tab();
  await waitFor(() => expect(role).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onInitiative).toHaveBeenCalledOnce();
  const dialog = await canvas.findByRole('dialog', { name: 'Initiative' });
  await userEvent.tab();
  await waitFor(() =>
    expect(within(dialog).getByRole('button', { name: 'Decrease' })).toHaveFocus(),
  );
  await userEvent.keyboard('{Escape}');
  await expect(args.onInitiativeClose).toHaveBeenCalledOnce();
  await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(role).toHaveFocus());
  await userEvent.tab();
  const hp = canvas.getByRole('button', { name: '20 /36 Wounded' });
  await waitFor(() => expect(hp).toHaveFocus());
  await userEvent.keyboard(' ');
  await expect(args.onHp).toHaveBeenCalledOnce();
  await userEvent.tab();
  await waitFor(() => expect(chevron).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onToggle).toHaveBeenCalledOnce();
  await expect(chevron).toHaveAttribute('aria-expanded', 'true');
  await userEvent.tab();
  const conditions = canvas.getByRole('button', { name: 'Conditions' });
  await waitFor(() => expect(conditions).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onConditions).toHaveBeenCalledOnce();
  await userEvent.tab({ shift: true });
  await waitFor(() => expect(chevron).toHaveFocus());
  await userEvent.keyboard(' ');
  await expect(args.onToggle).toHaveBeenCalledTimes(2);
  await expect(chevron).toHaveAttribute('aria-expanded', 'false');
  await expect(chevron).toHaveFocus();
}

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Tab, Enter, Space and Escape',
  play: async ({ args, canvasElement }) => {
    await keyboardWalk(canvasElement, args);
    await expect(args.onInitiativeSet).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboardMotion = meta.story({
  name: 'Keyboard with motion on',
  parameters: { motion: 'on' },
  play: async ({ args, canvasElement }) => {
    await keyboardWalk(canvasElement, args);
    await expect(args.onInitiativeSet).not.toHaveBeenCalled();
  },
});

export const ExtraReadOnly = meta.story({
  name: 'Read-only row in NumpadSheet never fires',
  args: { active: false, readOnly: true, expanded: true, initiativeOpen: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await userEvent.click(canvas.getByText('Vashti the Hexer'));
    await userEvent.click(canvas.getByText('20'));
    await userEvent.click(canvas.getByText('15'));
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(canvas.queryByText('Conditions')).toBeNull();
  },
});

export const ExtraNumpadResult = meta.story({
  name: 'NumpadSheet result: before, after flashes',
  args: { active: false },
  render: (args) => (
    <div style={{ ...screen, display: 'grid', gap: layout.listGap }}>
      <UnitRow {...args} unit={unitOf({ ...orcSeed, conditions: ['staggered'] })} readOnly />
      <UnitRow
        {...args}
        unit={unitOf({ ...orcSeed, hp: 2, conditions: ['staggered'] })}
        readOnly
        flash
      />
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const rows = canvasElement.querySelectorAll('[data-readonly]');
    await expect(rows).toHaveLength(2);
    await expect(rows[0]).not.toHaveAttribute('data-flash');
    await expect(rows[1]).toHaveAttribute('data-flash');
    await userEvent.click(within(canvasElement).getByText('2'));
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});
