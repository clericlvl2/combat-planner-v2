import preview from '#.storybook/preview';
import { healthSegments, healthStatus } from '@combat-planner/domain';
import type { Condition, PlayerUnit, Role } from '@combat-planner/domain';
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

function playerUnit(seed: UnitSeed, position: number): PlayerUnit {
  const status = healthStatus(seed.hp, seed.maxHp);
  const visible: PlayerUnit = {
    id: seed.id,
    name: seed.name,
    role: seed.role,
    healthStatus: status,
    healthSegments: healthSegments(status, seed.hp, seed.maxHp),
    conditions: seed.conditions ?? [],
    position,
    initiative: seed.initiative,
  };
  if (seed.role === 'enemy') return visible;
  const [ac, pd, md] = seed.defenses ?? [10, 10, 10];
  const friendly: PlayerUnit = {
    ...visible,
    claimedBy: seed.claimedBy ?? null,
    hp: seed.hp,
    tempHp: seed.tempHp ?? 0,
    maxHp: seed.maxHp,
    ac,
    pd,
    md,
  };
  return seed.claimedBy === MIKA ? { ...friendly, note: seed.note ?? '', hpHistory: [] } : friendly;
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

const vashti = playerUnit(vashtiSeed, 2);

const aldric = playerUnit(
  {
    id: '01JC00000000000000000ALDRC',
    name: 'Ser Aldric',
    role: 'hero',
    initiative: 19,
    hp: 52,
    maxHp: 52,
    claimedBy: JONAS,
    defenses: [18, 14, 12],
  },
  1,
);

const orc = playerUnit(
  {
    id: '01JC00000000000000000ORCBR',
    name: 'Orc Berserker',
    role: 'enemy',
    initiative: 17,
    hp: 14,
    maxHp: 40,
    conditions: ['staggered'],
  },
  2,
);

const goblin = playerUnit(
  {
    id: '01JC00000000000000000GOBLN',
    name: 'Goblin Archer 1',
    role: 'enemy',
    initiative: 12,
    hp: -3,
    maxHp: 18,
  },
  5,
);

const tomas = playerUnit(
  {
    id: '01JC00000000000000000TOMAS',
    name: 'Brother Tomas of the Silver Lantern Order',
    role: 'ally',
    initiative: 9,
    hp: 24,
    maxHp: 30,
    tempHp: 5,
    defenses: [17, 15, 13],
  },
  6,
);

const wyrmling = playerUnit(
  {
    id: '01JC00000000000000000WYRML',
    name: 'Silver Dragon Wyrmling',
    role: 'ally',
    initiative: 14,
    hp: 187,
    maxHp: 240,
    tempHp: 120,
    defenses: [20, 18, 17],
  },
  4,
);

const names: Record<string, string> = { [MIKA]: 'Mika', [JONAS]: 'Jonas' };

const pageCellInset = layout.contentEdge * 2;

const screen: CSSProperties = { padding: pageCellInset };

type PlayerRowCellProps = Omit<PlayerRowProps, 'claimedByName'>;

function PlayerRowCell({
  unit,
  expanded: initiallyExpanded = false,
  onToggle,
  onNoteChange,
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
    unit: playerUnit({ ...vashtiSeed, initiative: null }, 2),
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
    unit: playerUnit(
      {
        id: '01JC00000000000000000ORCRU',
        name: 'Орк-берсерк',
        role: 'enemy',
        initiative: 17,
        hp: 14,
        maxHp: 40,
        conditions: ['staggered', 'dazed', 'vulnerable', 'stuck'],
      },
      2,
    ),
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
