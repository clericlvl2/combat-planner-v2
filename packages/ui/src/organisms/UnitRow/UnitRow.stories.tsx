import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { CONDITIONS } from '@combat-planner/domain';
import type { Condition, Unit } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { HpChange } from '../../hooks/useHpChanges.ts';
import { layout } from '../../layout.ts';
import { fontSizes } from '../../theme.ts';
import { UnitRow } from './UnitRow.tsx';
import type { UnitRowCallbacks, UnitRowProps } from './UnitRow.tsx';
import { storyT } from '../../storybook/storyT.ts';

type UnitSeed = Pick<Unit, 'id' | 'name' | 'role' | 'initiative' | 'hp' | 'maxHp'> &
  Partial<Unit> & { defenses: [number, number, number] };

const unitDefaults = {
  initiativeBonus: 0,
  tempHp: 0,
  acMod: 0,
  pdMod: 0,
  mdMod: 0,
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
  };

function UnitRowCell({
  unit: initialUnit,
  expanded: initiallyExpanded = false,
  initiativeOpen: initiallyInitiativeOpen = false,
  menuOpen: initiallyMenuOpen = false,
  conditionsOpen = false,
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
        onConditions={() => onConditions()}
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
    onDefenses: fn(),
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

export const ActiveTurnWounded = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByRole('button', { name: 'Vashti the Hexer' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(
      canvas.getByRole('button', {
        name: t('DefenseLine:edit'),
        description: (description: string) =>
          description.replace(/\s+/g, ' ') ===
          `${t('DefenseLine:ac')} 16 · ${t('DefenseLine:pd')} 14 · ${t('DefenseLine:md')} 19`,
      }),
    ).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent(t('dazed'));
    await expect(
      canvas.getByRole('button', { name: `20 /36 ${t('HpBox:wounded')}` }),
    ).toBeVisible();
    const row = canvasElement.querySelector<HTMLElement>('[data-active]');
    await expect(row).not.toBeNull();
    const style = getComputedStyle(row as HTMLElement);
    await expect(style.backgroundColor).toBe('rgb(255, 231, 163)');
    await expect(style.borderTopWidth).toBe('1px');
    await expect(style.boxShadow).not.toBe('none');
    await expect(style.transform).not.toBe('none');
    await expect(canvasElement.querySelector('[data-notch]')).toBeNull();
  },
});

export const FullHp = meta.story({
  name: 'Full HP',
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

export const StaggeredWithCondition = meta.story({
  args: { active: false, unit: unitOf({ ...orcSeed, conditions: ['hampered'] }) },
});

export const Dead = meta.story({
  tags: ['visual'],
  args: { active: false, unit: unitOf(goblinSeed) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(getComputedStyle(canvas.getByText('Goblin Archer 1')).textDecorationLine).toBe(
      'line-through',
    );
    await expect(canvas.getByText(t('HpBox:dead'))).toBeVisible();
  },
});

export const UnconsciousHero = meta.story({
  tags: ['visual'],
  args: { active: false, unit: unitOf({ ...vashtiSeed, hp: -17 }) },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const hp = canvas.getByRole('button', { name: `−17 /36 ${t('HpBox:unconscious')}` });
    await expect(hp.querySelector('[data-part="unconscious"]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-dead]')).toBeNull();
    await expect(getComputedStyle(canvas.getByText('Vashti the Hexer')).textDecorationLine).toBe(
      'none',
    );
  },
});

export const DisabledUnit = meta.story({
  args: { active: false, unit: shadowArcher },
  play: async ({ canvas, canvasElement }) => {
    await expect(getComputedStyle(canvas.getByText('影の射手ゴブリン')).textDecorationLine).toBe(
      'none',
    );
    await expect(canvasElement.querySelector('[data-inactive]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-off]')).not.toBeNull();
  },
});

export const AllyTempHpLongName = meta.story({
  name: 'Ally Temp HP Long Name',
  tags: ['visual'],
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
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByText(t('HpBox:temp', { amount: 5 }))).toBeVisible();
  },
});

export const WithNote = meta.story({
  args: { active: false, unit: unitOf({ ...vashtiSeed, note: hexNote }) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const note = canvas.getByText(hexNote);
    await expect(note).toBeVisible();
    await expect(getComputedStyle(note).textOverflow).toBe('ellipsis');
    await expect(note.scrollWidth).toBeGreaterThan(note.clientWidth);
    await expect(canvas.getByRole('img', { name: t('NoteField:label') })).toBeVisible();
  },
});

const claimedConditions: Condition[] = ['dazed', 'weakened', 'hampered'];

export const ClaimedByPlayer = meta.story({
  args: {
    active: false,
    unit: unitOf({ ...vashtiSeed, conditions: claimedConditions, claimedBy: MIKA }),
  },
  play: async ({ canvas }) => {
    const claimer = canvas.getByText('@Mika');
    await expect(claimer).toBeVisible();
    await expect(claimer.parentElement).toHaveTextContent('Vashti the Hexer @Mika');
    const lines = [...canvas.getByText('Vashti the Hexer').getClientRects()];
    await expect(lines.at(-1)?.top).toBe(claimer.getBoundingClientRect().top);
  },
});

export const ClaimedLongPlayerName = meta.story({
  args: {
    active: false,
    unit: unitOf({ ...vashtiSeed, conditions: claimedConditions, claimedBy: ALEXANDRA }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('@Александра Константиновна Вишневецкая')).toBeVisible();
  },
});

export const Expanded = meta.story({
  tags: ['visual'],
  args: { unit: vashtiExpanded, expanded: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByRole('button', { name: 'Vashti the Hexer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('conditions') })).not.toHaveAttribute(
      'data-tap',
    );
    await expect(canvas.getByRole('button', { name: t('hpHistory') })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: ${hexNote}` }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.queryByRole('img', { name: t('NoteField:label') })).toBeNull();
  },
});

export const ConditionsOpen = meta.story({
  tags: ['visual'],
  args: { unit: vashtiExpanded, expanded: true, conditionsOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const trigger = canvas.getByRole('button', { name: t('conditions') });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('data-open');
  },
});

export const InitiativePopoverOpen = meta.story({
  tags: ['visual'],
  args: { unit: vashtiExpanded, initiativeOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByRole('dialog', { name: t('InitiativePopover:title') })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('InitiativePopover:roll', { bonus: '+3' }) }),
    ).toBeVisible();
  },
});

export const HpHistoryOpen = meta.story({
  name: 'HP History Open',
  tags: ['visual'],
  args: { unit: vashtiExpanded, expanded: true, historyOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const trigger = canvas.getByRole('button', { name: t('hpHistory') });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('data-open');
  },
});

export const MenuOpen = meta.story({
  args: { unit: vashtiExpanded, expanded: true, menuOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const menu = await canvas.findByRole('menu', {
      name: t('menuLabel', { name: 'Vashti the Hexer' }),
    });
    const items = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    await expect(items).toEqual([
      t('duplicate'),
      t('disable'),
      t('saveAsPreset'),
      t('releaseClaim'),
      t('remove'),
    ]);
  },
});

export const MenuOpenWithClaim = meta.story({
  args: { unit: { ...vashtiExpanded, claimedBy: MIKA }, expanded: true, menuOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByText('@Mika')).toBeVisible();
    const menu = await canvas.findByRole('menu', {
      name: t('menuLabel', { name: 'Vashti the Hexer' }),
    });
    await expect(within(menu).getByRole('menuitem', { name: t('releaseClaim') })).toBeEnabled();
  },
});

export const ThreeDigitHpWithTemp = meta.story({
  name: 'Three Digit HP With Temp',
  args: { active: false, unit: unitOf({ ...dragonSeed, hp: 112, tempHp: 120 }) },
});

export const MaximumHp = meta.story({
  name: 'Maximum HP',
  tags: ['visual'],
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
  play: async ({ canvasElement }) => {
    const chips = [...canvasElement.querySelectorAll('[data-stat]')];
    const tops = new Set(chips.map((chip) => chip.getBoundingClientRect().top));
    await expect(chips).toHaveLength(3);
    await expect(tops.size).toBe(1);
  },
});

export const FourConditions = meta.story({
  tags: ['visual'],
  args: {
    active: false,
    unit: unitOf({ ...orcSeed, conditions: ['hampered', 'dazed', 'vulnerable', 'stuck'] }),
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const chips = canvas.getAllByRole('listitem');
    await expect(chips.map((chip) => chip.textContent)).toEqual([
      t('hampered'),
      t('dazed'),
      t('vulnerable'),
      t('stuck'),
    ]);
  },
});

export const AllConditions = meta.story({
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
      conditions: [...CONDITIONS],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(CONDITIONS.length);
  },
});

export const MenuOpenDuplicateDisabled = meta.story({
  args: { unit: vashtiExpanded, expanded: true, duplicateDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    const duplicate = await canvas.findByRole('menuitem', { name: t('duplicate') });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(args.onDuplicate).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: t('disable') })).toBeEnabled();
  },
});

export const SetupNoInitiative = meta.story({
  args: { active: false, unit: unitOf({ ...vashtiSeed, initiative: null }) },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByRole('img', { name: t('RoleBlock:noInitiative') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('rollInitiative') }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    const dialog = canvas.getByRole('dialog', { name: t('InitiativePopover:title') });
    await expect(within(dialog).getByRole('spinbutton')).toHaveValue('—');
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const ReadOnly = meta.story({
  args: { active: false, readOnly: true, expanded: true, initiativeOpen: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await userEvent.click(canvas.getByText('Vashti the Hexer'));
    await userEvent.click(canvas.getByText('20'));
    await userEvent.click(canvas.getByText('15'));
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(canvas.queryByText(t('conditions'))).toBeNull();
  },
});

export const TapRowExpands = meta.story({
  tags: ['!dev'],
  args: { unit: vashtiExpanded },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
    await userEvent.click(canvas.getByText('Vashti the Hexer'));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(canvas.getByRole('button', { name: t('hpHistory') }));
    await expect(args.onHistory).toHaveBeenCalledOnce();
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(name);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(name).toHaveAttribute('aria-expanded', 'false');
  },
});

export const TapRoleBlockSetsInitiative = meta.story({
  tags: ['!dev'],
  args: { unit: vashtiExpanded, active: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await userEvent.click(canvas.getByRole('button', { name: t('rollInitiative') }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    const dialog = canvas.getByRole('dialog', { name: t('InitiativePopover:title') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Stepper:increase') }));
    await expect(args.onInitiativeSet).toHaveBeenCalledOnce();
    await expect(args.onInitiativeSet).toHaveBeenCalledWith(16);
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('InitiativePopover:roll', { bonus: '+3' }) }),
    );
    await expect(args.onInitiativeRoll).toHaveBeenCalledOnce();
    await expect(args.onInitiativeRoll).toHaveBeenCalledWith(14, 11);
    await expect(canvas.getByRole('button', { name: t('rollInitiative') })).toHaveTextContent(
      /^14/,
    );
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

async function pickMenuItem(canvasElement: HTMLElement, name: string, t: TFunction) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
  await userEvent.click(await canvas.findByRole('menuitem', { name }));
  await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
}

export const EachActionFiresOnce = meta.story({
  tags: ['!dev'],
  args: { unit: { ...vashtiExpanded, claimedBy: MIKA }, expanded: true },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:edit') }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('conditions') }));
    await expect(args.onConditions).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('hpHistory') }));
    await expect(args.onHistory).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, t('duplicate'), t);
    await expect(args.onDuplicate).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, t('disable'), t);
    await expect(args.onSetDisabled).toHaveBeenCalledOnce();
    await expect(args.onSetDisabled).toHaveBeenCalledWith(true);
    await pickMenuItem(canvasElement, t('saveAsPreset'), t);
    await expect(args.onSaveAsPreset).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, t('releaseClaim'), t);
    await expect(args.onReleaseClaim).toHaveBeenCalledOnce();
    await pickMenuItem(canvasElement, t('remove'), t);
    await expect(args.onRemove).toHaveBeenCalledOnce();
    await expect(args.onMore).toHaveBeenCalledTimes(5);
    await expect(args.onMenuClose).toHaveBeenCalledTimes(5);
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
  },
});

export const RoleBlockClosesPopover = meta.story({
  tags: ['!dev'],
  args: { unit: vashtiExpanded, active: false, initiativeOpen: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await expect(canvas.getByRole('dialog', { name: t('InitiativePopover:title') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('rollInitiative') }));
    await expect(args.onInitiativeClose).toHaveBeenCalledOnce();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ReadOnlySurvivesEveryTap = meta.story({
  tags: ['!dev'],
  args: { active: false },
  render: () => (
    <div style={screen}>
      <UnitRow
        unit={unitOf({ ...orcSeed, conditions: ['hampered'], note: 'Hex until round 4' })}
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

export const DisabledUnitOpensHp = meta.story({
  name: 'Disabled Unit Opens HP',
  tags: ['!dev'],
  args: { active: false, unit: shadowArcher, expanded: true },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await userEvent.click(canvas.getByRole('button', { name: '18 /18' }));
    await expect(args.onHp).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await pickMenuItem(canvasElement, t('enable'), t);
    await expect(args.onSetDisabled).toHaveBeenCalledOnce();
    await expect(args.onSetDisabled).toHaveBeenCalledWith(false);
  },
});

type KeyboardSpies = Pick<
  UnitRowProps,
  'onInitiative' | 'onInitiativeClose' | 'onHp' | 'onToggle' | 'onConditions' | 'onDefenses'
>;

async function keyboardWalk(canvasElement: HTMLElement, args: KeyboardSpies, t: TFunction) {
  const canvas = within(canvasElement);
  const role = canvas.getByRole('button', { name: t('rollInitiative') });
  const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
  await userEvent.tab();
  await waitFor(() => expect(role).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onInitiative).toHaveBeenCalledOnce();
  const dialog = await canvas.findByRole('dialog', { name: t('InitiativePopover:title') });
  await userEvent.tab();
  await waitFor(() =>
    expect(within(dialog).getByRole('button', { name: t('Stepper:decrease') })).toHaveFocus(),
  );
  await userEvent.keyboard('{Escape}');
  await expect(args.onInitiativeClose).toHaveBeenCalledOnce();
  await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(role).toHaveFocus());
  await userEvent.tab();
  const defenses = canvas.getByRole('button', { name: t('DefenseLine:edit') });
  await waitFor(() => expect(defenses).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onDefenses).toHaveBeenCalledOnce();
  await userEvent.tab();
  await waitFor(() => expect(name).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onToggle).toHaveBeenCalledOnce();
  await expect(name).toHaveAttribute('aria-expanded', 'true');
  await userEvent.tab();
  const hp = canvas.getByRole('button', { name: `20 /36 ${t('HpBox:wounded')}` });
  await waitFor(() => expect(hp).toHaveFocus());
  await userEvent.keyboard(' ');
  await expect(args.onHp).toHaveBeenCalledOnce();
  await userEvent.tab();
  const conditions = canvas.getByRole('button', { name: t('conditions') });
  await waitFor(() => expect(conditions).toHaveFocus());
  await userEvent.keyboard('{Enter}');
  await expect(args.onConditions).toHaveBeenCalledOnce();
  await userEvent.tab({ shift: true });
  await userEvent.tab({ shift: true });
  await waitFor(() => expect(name).toHaveFocus());
  await userEvent.keyboard(' ');
  await expect(args.onToggle).toHaveBeenCalledTimes(2);
  await expect(name).toHaveAttribute('aria-expanded', 'false');
  await expect(name).toHaveFocus();
}

export const KeyboardWithMotionOn = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ args, canvasElement, globals }) => {
    const t = storyT(globals, 'UnitRow');
    await keyboardWalk(canvasElement, args, t);
    await expect(args.onInitiativeSet).not.toHaveBeenCalled();
  },
});

const frozenChange = (unit: Unit, change: Omit<HpChange, 'key' | 'unitId'>) => ({
  active: false,
  unit,
  hpChange: { key: 1, unitId: unit.id, ...change },
});

const renderFrozen = (args: UnitRowCellProps) => (
  <div data-motion-frozen="">
    <UnitRowCell {...args} />
  </div>
);

const numberOf = (canvasElement: HTMLElement) => {
  const number = canvasElement.querySelector<HTMLElement>('[data-hp-change="number"]');
  if (!number) throw new Error('no HP number');
  return number;
};

export const DamageNumber = meta.story({
  tags: ['visual'],
  parameters: { motion: 'on' },
  args: frozenChange(unitOf({ ...vashtiSeed, hp: 17 }), { kind: 'damage', amount: 3 }),
  render: renderFrozen,
  play: async ({ canvasElement }) => {
    const number = numberOf(canvasElement);
    await expect(number).toHaveTextContent('−3');
    const style = getComputedStyle(number);
    await expect(style.color).toBe('rgb(180, 35, 42)');
    await expect(style.fontSize).toBe(`${fontSizes.display}px`);
    await expect(Number(style.opacity)).toBeGreaterThan(0.5);
    await expect(getComputedStyle(number.parentElement as HTMLElement).pointerEvents).toBe('none');
  },
});

export const HealNumber = meta.story({
  tags: ['visual'],
  parameters: { motion: 'on' },
  args: frozenChange(unitOf({ ...vashtiSeed, hp: 30 }), { kind: 'heal', amount: 10 }),
  render: renderFrozen,
  play: async ({ canvasElement }) => {
    const number = numberOf(canvasElement);
    await expect(number).toHaveTextContent('+10');
    await expect(getComputedStyle(number).color).toBe('rgb(46, 122, 67)');
  },
});

export const TempNumber = meta.story({
  tags: ['visual'],
  parameters: { motion: 'on' },
  args: frozenChange(unitOf({ ...vashtiSeed, tempHp: 5 }), { kind: 'temp', amount: 5 }),
  render: renderFrozen,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const number = numberOf(canvasElement);
    await expect(number).toHaveTextContent(t('temp', { amount: 5 }));
    await expect(getComputedStyle(number).color).toBe('rgb(30, 95, 168)');
  },
});

export const StaggeredRibbon = meta.story({
  tags: ['visual'],
  parameters: { motion: 'on' },
  args: frozenChange(unitOf({ ...vashtiSeed, hp: 15 }), {
    kind: 'damage',
    amount: 5,
    status: 'staggered',
  }),
  render: renderFrozen,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const ribbon = canvasElement.querySelector<HTMLElement>('[data-hp-change="ribbon"]');
    await expect(ribbon).toHaveTextContent(t('staggered'));
    const style = getComputedStyle(ribbon as HTMLElement);
    await expect(style.textTransform).toBe('uppercase');
    await expect(style.backgroundColor).toBe('rgb(179, 58, 10)');
    await expect(style.color).toBe('rgb(255, 255, 255)');
    await expect(numberOf(canvasElement)).toHaveTextContent('−5');
  },
});
