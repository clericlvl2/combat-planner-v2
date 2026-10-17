import preview from '#.storybook/preview';
import { LIMITS, project } from '@combat-planner/domain';
import type { Combat, Condition, PlayerUnit, Role, Unit } from '@combat-planner/domain';
import { IconUserOff } from '@tabler/icons-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { layout } from '../../layout.ts';
import { Menu } from '../Menu/Menu.tsx';
import { PlayerRow } from './PlayerRow.tsx';
import type { PlayerRowProps } from './PlayerRow.tsx';

interface UnitSeed {
  id: string;
  name: string;
  role: Role;
  initiative: number | null;
  hp: number;
  maxHp: number;
  tempHp?: number;
  conditions?: Condition[];
  claimedBy?: string;
  defenses?: [number, number, number];
  note?: string;
}

const MIKA = '01JC0000000000000000000MKA';
const JONAS = '01JC0000000000000000000JNS';

const names: Record<string, string> = { [MIKA]: 'Mika', [JONAS]: 'Jonas' };

const createdAt = '2026-10-16T18:00:00.000Z';

function unitOf(seed: UnitSeed): Unit {
  const [ac, pd, md] = seed.defenses ?? [10, 10, 10];
  return {
    id: seed.id,
    name: seed.name,
    role: seed.role,
    initiativeBonus: 0,
    initiative: seed.initiative,
    maxHp: seed.maxHp,
    hp: seed.hp,
    tempHp: seed.tempHp ?? 0,
    ac,
    pd,
    md,
    note: seed.note ?? '',
    conditions: seed.conditions ?? [],
    disabled: false,
    claimedBy: seed.claimedBy ?? null,
    hpHistory: [],
  };
}

function playerUnit(seed: UnitSeed): PlayerUnit {
  const combat: Combat = {
    id: '01JC00000000000000000CMBT1',
    title: 'Ambush at the Ferry',
    description: '',
    color: LIMITS.color.min,
    status: 'active',
    round: 3,
    escalation: 2,
    activeUnitId: null,
    lastPlayedAt: createdAt,
    linkGeneration: 0,
    version: 1,
    players: names,
    createdAt,
    updatedAt: createdAt,
    units: [unitOf(seed)],
  };
  const [projected] = project(combat, { kind: 'player', playerId: MIKA }).units;
  if (projected === undefined) throw new Error(`${seed.name} is not visible to the player`);
  return projected;
}

const vashtiSeed: UnitSeed = {
  id: '01JC00000000000000000VASHT',
  name: 'Vashti the Hexer',
  role: 'hero',
  initiative: 15,
  hp: 20,
  maxHp: 36,
  conditions: ['dazed'],
  claimedBy: MIKA,
  defenses: [16, 12, 15],
  note: 'Concentrating on Hex',
};

const vashti = playerUnit(vashtiSeed);

const aldric = playerUnit({
  id: '01JC00000000000000000ALDRC',
  name: 'Ser Aldric',
  role: 'hero',
  initiative: 19,
  hp: 52,
  maxHp: 52,
  claimedBy: JONAS,
  defenses: [18, 14, 12],
});

const orc = playerUnit({
  id: '01JC00000000000000000ORCBR',
  name: 'Orc Berserker',
  role: 'enemy',
  initiative: 17,
  hp: 14,
  maxHp: 40,
  conditions: ['staggered'],
});

const goblin = playerUnit({
  id: '01JC00000000000000000GOBLN',
  name: 'Goblin Archer 1',
  role: 'enemy',
  initiative: 12,
  hp: -3,
  maxHp: 18,
});

const tomas = playerUnit({
  id: '01JC00000000000000000TOMAS',
  name: 'Brother Tomas of the Silver Lantern Order',
  role: 'ally',
  initiative: 9,
  hp: 24,
  maxHp: 30,
  tempHp: 5,
  defenses: [17, 15, 13],
});

const wyrmling = playerUnit({
  id: '01JC00000000000000000WYRML',
  name: 'Silver Dragon Wyrmling',
  role: 'ally',
  initiative: 14,
  hp: 187,
  maxHp: 240,
  tempHp: 120,
  defenses: [20, 18, 17],
});

const pageCellInset = layout.contentEdge * 2;

const screen: CSSProperties = { padding: pageCellInset };

type PlayerRowCellProps = Omit<PlayerRowProps, 'claimedByName'> & { hostCollapse?: boolean };

function PlayerRowCell({
  unit,
  expanded: initiallyExpanded = false,
  onToggle,
  onNoteChange,
  hostCollapse = false,
  ...props
}: PlayerRowCellProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [note, setNote] = useState(unit.note);
  return (
    <div style={screen}>
      <PlayerRow
        {...props}
        unit={note === undefined ? unit : { ...unit, note }}
        claimedByName={unit.claimedBy ? names[unit.claimedBy] : undefined}
        expanded={expanded}
        onToggle={() => {
          setExpanded((value) => !value);
          onToggle();
        }}
        onNoteChange={(value) => {
          setNote(value);
          onNoteChange(value);
        }}
      />
      {hostCollapse ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setExpanded(false)}
        >
          Collapse from the host
        </button>
      ) : null}
    </div>
  );
}

const onMenuSelect = fn();

interface MoreMenuCellProps extends PlayerRowCellProps {
  onMenuItem: (id: string) => void;
}

function MoreMenuCell({ onMenuItem, ...props }: MoreMenuCellProps) {
  const { t } = useTranslation('Menu');
  const [opened, setOpened] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <PlayerRowCell
        {...props}
        moreOpen={opened}
        onMore={(event) => {
          setOpened((value) => !value);
          props.onMore(event);
        }}
      />
      <div style={{ position: 'absolute', right: pageCellInset, top: '100%' }}>
        <Menu
          opened={opened}
          aria-label={t('menuLabel')}
          items={[{ id: 'releaseClaim', icon: IconUserOff, label: t('releaseClaim') }]}
          onSelect={onMenuItem}
          onClose={() => setOpened(false)}
        />
      </div>
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/PlayerRow',
  component: PlayerRowCell,
  parameters: { phoneFrame: true },
  args: {
    unit: vashti,
    mine: true,
    onToggle: fn(),
    onInitiative: fn(),
    onHp: fn(),
    onConditions: fn(),
    onHistory: fn(),
    onNoteChange: fn(),
    onEdit: fn(),
    onMore: fn(),
  },
});

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
    await expect(name).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText('You')).toBeVisible();
    await expect(canvas.getByText('Mika')).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Claimed by' })).toBeVisible();
    await expect(canvas.getByText('AC 16 · PD 12 · MD 15')).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent('dazed');
    await expect(canvas.getByText('Concentrating on Hex')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '20 /36 Wounded' })).toBeVisible();
  },
});

export const OwnHero = meta.story({
  name: 'Own hero',
});

export const OwnActiveTurn = meta.story({
  name: 'Own, active turn',
  args: { active: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-active][data-mine]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-notch]')).not.toBeNull();
  },
});

export const OwnExpanded = meta.story({
  name: 'Own, expanded',
  args: { expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Vashti the Hexer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Conditions' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'HP History' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Note: Concentrating on Hex' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
  },
});

export const OwnConditionsOpen = meta.story({
  name: 'Own, Conditions open',
  args: { expanded: true, conditionsOpen: true, 'data-tap': 'conditions' },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Conditions' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('data-open');
    await expect(trigger).toHaveAttribute('data-tap');
  },
});

export const OwnEditingNote = meta.story({
  name: 'Own, editing note',
  args: { expanded: true, 'data-tap': 'note' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note: Concentrating on Hex' }));
    const editor = canvas.getByRole('textbox', { name: 'Note' });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.type(editor, ', 2 rounds left');
    await expect(editor).toHaveValue('Concentrating on Hex, 2 rounds left');
    await expect(args.onNoteChange).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const OwnSetupNoInitiative = meta.story({
  name: 'Own, Setup, no initiative',
  args: {
    unit: playerUnit({ ...vashtiSeed, initiative: null }),
    setup: true,
    'data-tap': 'initiative',
  },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('img', { name: 'No initiative' })).toBeVisible();
    await expect(canvas.queryByRole('listitem')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: /No initiative/ }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const OtherHero = meta.story({
  name: 'Other hero',
  args: { unit: aldric, mine: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Jonas')).toBeVisible();
    await expect(canvas.getByText('52')).toBeVisible();
    await expect(canvas.queryByText('You')).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const EnemyBloodied = meta.story({
  name: 'Enemy, Bloodied',
  args: { unit: orc, mine: false },
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.getByText('Bloodied')).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent('staggered');
    await expect(canvasElement.querySelector('[data-part="numbers"]')).toBeNull();
    await expect(canvas.queryByText(/\d+\/\d+/)).toBeNull();
    await expect(canvas.queryByText(/AC/)).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText('Bloodied'));
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const EnemyDead = meta.story({
  name: 'Enemy, Dead',
  args: { unit: goblin, mine: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Dead')).toBeVisible();
    await expect(getComputedStyle(canvas.getByText('Goblin Archer 1')).textDecorationLine).toBe(
      'line-through',
    );
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const AllyTempHPLongName = meta.story({
  name: 'Ally, temp HP, long name',
  args: { unit: tomas, mine: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('+5 temp')).toBeVisible();
    await expect(canvas.getByText('AC 17 · PD 15 · MD 13')).toBeVisible();
    await expect(canvas.queryByRole('img', { name: 'Claimed by' })).toBeNull();
  },
});

export const AllyThreeDigitHP = meta.story({
  name: 'Ally, three-digit HP',
  args: { unit: wyrmling, mine: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('187')).toBeVisible();
    await expect(canvas.getByText('/240')).toBeVisible();
    await expect(canvas.getByText('+120 temp')).toBeVisible();
  },
});

export const RuFourConditions = meta.story({
  name: 'ru, four conditions',
  args: {
    unit: playerUnit({
      id: '01JC00000000000000000ORCRU',
      name: 'Орк-берсерк',
      role: 'enemy',
      initiative: 17,
      hp: 14,
      maxHp: 40,
      conditions: ['staggered', 'dazed', 'vulnerable', 'stuck'],
    }),
    mine: false,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Орк-берсерк')).toBeVisible();
    const chips = canvas.getAllByRole('listitem');
    await expect(chips.map((chip) => chip.textContent)).toEqual([
      'staggered',
      'dazed',
      'vulnerable',
      'stuck',
    ]);
  },
});

export const ExtraFlowTapRow = meta.story({
  name: 'Flow: tap row expands and collapses',
  play: async ({ args, canvas }) => {
    const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
    await userEvent.click(canvas.getByText('AC 16 · PD 12 · MD 15'));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: 'Conditions' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await userEvent.click(name);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(name).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: 'Conditions' })).toBeNull();
  },
});

export const ExtraFlowTapNote = meta.story({
  name: 'Flow: tap Note edits in place, Enter saves',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note: Concentrating on Hex' }));
    const editor = canvas.getByRole('textbox', { name: 'Note' });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.type(editor, ' on Orc');
    await userEvent.keyboard('{Enter}');
    await expect(args.onNoteChange).toHaveBeenCalledOnce();
    await expect(args.onNoteChange).toHaveBeenCalledWith('Concentrating on Hex on Orc');
    await expect(
      canvas.getByRole('button', { name: 'Note: Concentrating on Hex on Orc' }),
    ).toBeVisible();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const ExtraCollapseSavesNote = meta.story({
  name: 'Collapsing the row saves the note',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note: Concentrating on Hex' }));
    const editor = canvas.getByRole('textbox', { name: 'Note' });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Hex ends next round');
    await userEvent.click(canvas.getByRole('button', { name: 'Vashti the Hexer' }));
    await expect(args.onNoteChange).toHaveBeenCalledOnce();
    await expect(args.onNoteChange).toHaveBeenCalledWith('Hex ends next round');
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(canvas.getByText('Hex ends next round')).toBeVisible();
  },
});

export const ExtraHostCollapseSavesNote = meta.story({
  name: 'A host collapse while editing saves the note',
  args: { expanded: true, hostCollapse: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note: Concentrating on Hex' }));
    const editor = canvas.getByRole('textbox', { name: 'Note' });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Hex ends next round');
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse from the host' }));
    await expect(args.onNoteChange).toHaveBeenCalledOnce();
    await expect(args.onNoteChange).toHaveBeenCalledWith('Hex ends next round');
    await expect(await canvas.findByText('Hex ends next round')).toBeVisible();
  },
});

export const ExtraRoleFillsRow = meta.story({
  name: 'The role block fills the row height',
  play: async ({ canvas, canvasElement }) => {
    const row = canvas
      .getByRole('button', { name: 'Vashti the Hexer' })
      .closest('[data-unit-role]');
    const role = canvasElement.querySelector<HTMLElement>('[data-fill]');
    await expect(role).not.toBeNull();
    const rowBox = row?.getBoundingClientRect();
    const roleBox = role?.getBoundingClientRect();
    await expect(roleBox?.height).toBe((rowBox?.height ?? 0) - 4);
  },
});

export const ExtraOwnCallbacks = meta.story({
  name: 'Own row: every control fires its callback',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: '20 /36 Wounded' }));
    await expect(args.onHp).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: /^15/ }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    await expect(args.onConditions).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'HP History' }));
    await expect(args.onHistory).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onNoteChange).not.toHaveBeenCalled();
  },
});

export const ExtraOtherReadOnly = meta.story({
  name: 'Other rows are read-only and never expand',
  args: { unit: aldric, mine: false, expanded: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.queryByText('Conditions')).toBeNull();
    await expect(canvas.queryByText('HP History')).toBeNull();
    await userEvent.click(canvas.getByText('Ser Aldric'));
    await userEvent.click(canvas.getByText('52'));
    await userEvent.click(canvas.getByText('19'));
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(args.onConditions).not.toHaveBeenCalled();
    await expect(args.onEdit).not.toHaveBeenCalled();
  },
});

interface KeyboardSpies {
  onInitiative: unknown;
  onToggle: unknown;
  onHp: unknown;
  onConditions: unknown;
}

async function keyboardWalk(canvasElement: HTMLElement, args: KeyboardSpies) {
  const canvas = within(canvasElement);
  const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
  await userEvent.tab();
  await expect(canvas.getByRole('button', { name: /^15/ })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect(args.onInitiative).toHaveBeenCalledOnce();
  await userEvent.tab();
  await expect(name).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect(args.onToggle).toHaveBeenCalledOnce();
  await expect(name).toHaveAttribute('aria-expanded', 'true');
  await expect(name).toHaveFocus();
  await userEvent.tab();
  await expect(canvas.getByRole('button', { name: '20 /36 Wounded' })).toHaveFocus();
  await userEvent.keyboard(' ');
  await expect(args.onHp).toHaveBeenCalledOnce();
  await userEvent.tab();
  await expect(canvas.getByRole('button', { name: 'Conditions' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect(args.onConditions).toHaveBeenCalledOnce();
  await userEvent.tab({ shift: true });
  await userEvent.tab({ shift: true });
  await expect(name).toHaveFocus();
  await userEvent.keyboard(' ');
  await expect(args.onToggle).toHaveBeenCalledTimes(2);
  await expect(name).toHaveAttribute('aria-expanded', 'false');
  await expect(name).toHaveFocus();
}

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Tab, Enter and Space',
  play: async ({ args, canvasElement }) => {
    await keyboardWalk(canvasElement, args);
    await expect(args.onHistory).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboardMotion = meta.story({
  name: 'Keyboard with motion on',
  parameters: { motion: 'on' },
  play: async ({ args, canvasElement }) => {
    await keyboardWalk(canvasElement, args);
    await expect(args.onHistory).not.toHaveBeenCalled();
  },
});

export const ExtraMoreMenu = meta.story({
  name: 'More opens the menu with Release claim',
  args: { expanded: true },
  render: (args) => <MoreMenuCell {...args} onMenuItem={onMenuSelect} />,
  play: async ({ args, canvas }) => {
    onMenuSelect.mockClear();
    const more = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.click(more);
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    const menu = canvas.getByRole('menu', { name: 'Actions' });
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Release claim' }));
    await expect(onMenuSelect).toHaveBeenCalledOnce();
    await expect(onMenuSelect).toHaveBeenCalledWith('releaseClaim');
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('menu')).toBeNull();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Состояния' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'История ОЗ' })).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent('ошеломлён');
    await expect(canvas.getByText('Вы')).toBeVisible();
  },
});

export const ExtraEnemyWithFields = meta.story({
  name: 'Enemy carrying friendly fields stays hidden',
  args: {
    unit: {
      ...orc,
      claimedBy: MIKA,
      hp: 14,
      maxHp: 40,
      tempHp: 6,
      ac: 15,
      pd: 13,
      md: 11,
      note: 'Hidden note',
    },
    mine: true,
    expanded: true,
  },
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.getByText('Orc Berserker')).toBeVisible();
    await expect(canvas.getByText('Bloodied')).toBeVisible();
    await expect(canvasElement.querySelector('[data-part="numbers"]')).toBeNull();
    await expect(canvas.queryByText('14')).toBeNull();
    await expect(canvas.queryByText('/40')).toBeNull();
    await expect(canvas.queryByText('+6 temp')).toBeNull();
    await expect(canvas.queryByText(/AC/)).toBeNull();
    await expect(canvas.queryByText('Mika')).toBeNull();
    await expect(canvas.queryByRole('img', { name: 'Claimed by' })).toBeNull();
    await expect(canvas.queryByText('Hidden note')).toBeNull();
    await expect(canvas.queryByText('You')).toBeNull();
    await expect(canvas.queryByText('Conditions')).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvasElement.querySelector('[data-mine]')).toBeNull();
    await userEvent.click(canvas.getByText('Orc Berserker'));
    await userEvent.click(canvas.getByText('Bloodied'));
    await userEvent.click(canvas.getByText('17'));
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(args.onNoteChange).not.toHaveBeenCalled();
  },
});

async function expectTriggerLabelsFit(canvasElement: HTMLElement, labels: string[]) {
  const canvas = within(canvasElement);
  for (const label of labels) {
    const text = within(canvas.getByRole('button', { name: label })).getByText(label);
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
  }
}

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr, trigger labels fit',
  globals: { locale: 'fr' },
  args: { expanded: true },
  play: async ({ canvasElement }) => {
    await expectTriggerLabelsFit(canvasElement, ['États', 'Historique PV']);
    await expect(within(canvasElement).getByRole('button', { name: 'Modifier' })).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es, trigger labels fit',
  globals: { locale: 'es' },
  args: { expanded: true },
  play: async ({ canvasElement }) => {
    await expectTriggerLabelsFit(canvasElement, ['Estados', 'Historial PG']);
    await expect(within(canvasElement).getByRole('button', { name: 'Editar' })).toBeVisible();
  },
});
