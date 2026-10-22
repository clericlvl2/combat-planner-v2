import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
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
import { storyT } from '../../storybook/storyT.ts';

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

async function expectNoDefenses(canvas: ReturnType<typeof within>, t: TFunction) {
  for (const stat of ['ac', 'pd', 'md'] as const) {
    const label = t(`DefenseLine:${stat}`);
    await expect(canvas.queryAllByText((content: string) => content.includes(label))).toEqual([]);
  }
}

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
  conditions: ['hampered'],
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

const pageCellInset = layout.contentEdge;

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
        <button type="button" data-story-fixture="" onClick={() => setExpanded(false)}>
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

export const OwnHero = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
    await expect(name).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText(t('RoleBlock:you'))).toBeVisible();
    const claimer = canvas.getByText('@Mika');
    await expect(claimer).toBeVisible();
    await expect(name.contains(claimer)).toBe(false);
    await expect(claimer.parentElement).toHaveTextContent('Vashti the Hexer @Mika');
    const lines = [...canvas.getByText('Vashti the Hexer').getClientRects()];
    await expect(lines.at(-1)?.top).toBe(claimer.getBoundingClientRect().top);
    await expect(
      canvas.getByRole('group', {
        name: (name: string) =>
          name.replace(/\s+/g, ' ') ===
          `${t('DefenseLine:ac')} 16 · ${t('DefenseLine:pd')} 12 · ${t('DefenseLine:md')} 15`,
      }),
    ).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent(t('dazed'));
    await expect(canvas.getByText('Concentrating on Hex')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: `20 /36 ${t('HpBox:wounded')}` }),
    ).toBeVisible();
  },
});

export const OwnHeroActiveTurn = meta.story({
  args: { active: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-active][data-mine]')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-notch]')).not.toBeNull();
  },
});

export const OwnHeroExpanded = meta.story({
  tags: ['visual'],
  args: { expanded: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByRole('button', { name: 'Vashti the Hexer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('conditions') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('hpHistory') })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: Concentrating on Hex` }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
  },
});

export const ConditionsOpen = meta.story({
  tags: ['visual'],
  args: { expanded: true, conditionsOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    const trigger = canvas.getByRole('button', { name: t('conditions') });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('data-open');
  },
});

export const NoteEditing = meta.story({
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await userEvent.click(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: Concentrating on Hex` }),
    );
    const editor = canvas.getByRole('textbox', { name: t('NoteField:label') });
    await waitFor(() => expect(editor).toHaveFocus());
    await expect(editor).toHaveValue('Concentrating on Hex');
    await expect(args.onNoteChange).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const SetupNoInitiative = meta.story({
  args: {
    unit: playerUnit({ ...vashtiSeed, initiative: null }),
    setup: true,
  },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByRole('img', { name: t('RoleBlock:noInitiative') })).toBeVisible();
    await expect(canvas.queryByRole('listitem')).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', {
        name: (label: string) => label.includes(t('RoleBlock:noInitiative')),
      }),
    );
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const OtherPlayersHero = meta.story({
  args: { unit: aldric, mine: false },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText('@Jonas')).toBeVisible();
    await expect(canvas.getByText('52')).toBeVisible();
    await expect(canvas.queryByText(t('RoleBlock:you'))).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const EnemyStaggered = meta.story({
  args: { unit: orc, mine: false },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText(t('HpBox:staggered'))).toBeVisible();
    await expect(canvas.getByRole('listitem')).toHaveTextContent(t('hampered'));
    await expect(canvasElement.querySelector('[data-part="numbers"]')).toBeNull();
    await expect(canvas.queryByText(/\d+\/\d+/)).toBeNull();
    await expectNoDefenses(canvas, t);
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(t('HpBox:staggered')));
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const EnemyDead = meta.story({
  tags: ['visual'],
  args: { unit: goblin, mine: false },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText(t('HpBox:dead'))).toBeVisible();
    await expect(getComputedStyle(canvas.getByText('Goblin Archer 1')).textDecorationLine).toBe(
      'line-through',
    );
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const AllyTempHpLongName = meta.story({
  name: 'Ally Temp HP Long Name',
  args: { unit: tomas, mine: false },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText(t('HpBox:temp', { amount: 5 }))).toBeVisible();
    await expect(
      canvas.getByRole('group', {
        name: (name: string) =>
          name.replace(/\s+/g, ' ') ===
          `${t('DefenseLine:ac')} 17 · ${t('DefenseLine:pd')} 15 · ${t('DefenseLine:md')} 13`,
      }),
    ).toBeVisible();
    await expect(canvas.queryByText(/^@/)).toBeNull();
  },
});

export const AllyThreeDigitHp = meta.story({
  name: 'Ally Three Digit HP',
  args: { unit: wyrmling, mine: false },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText('187')).toBeVisible();
    await expect(canvas.getByText('/240')).toBeVisible();
    await expect(canvas.getByText(t('HpBox:temp', { amount: 120 }))).toBeVisible();
  },
});

export const FourConditions = meta.story({
  tags: ['visual'],
  args: {
    unit: playerUnit({
      id: '01JC00000000000000000ORCRU',
      name: 'Орк-берсерк',
      role: 'enemy',
      initiative: 17,
      hp: 14,
      maxHp: 40,
      conditions: ['hampered', 'dazed', 'vulnerable', 'stuck'],
    }),
    mine: false,
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText('Орк-берсерк')).toBeVisible();
    const chips = canvas.getAllByRole('listitem');
    await expect(chips.map((chip) => chip.textContent)).toEqual([
      t('hampered'),
      t('dazed'),
      t('vulnerable'),
      t('stuck'),
    ]);
  },
});

export const OwnHeroDead = meta.story({
  args: { unit: playerUnit({ ...vashtiSeed, hp: -4, conditions: [] }) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByRole('button', { name: `−4 /36 ${t('HpBox:dead')}` })).toBeVisible();
    await expect(canvas.getByText(t('RoleBlock:you'))).toBeVisible();
  },
});

export const OwnHeroLongName = meta.story({
  args: { unit: playerUnit({ ...vashtiSeed, name: 'Вашти Заклинательница с Чёрной переправы' }) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(
      canvas.getByRole('button', { name: 'Вашти Заклинательница с Чёрной переправы' }),
    ).toBeVisible();
    await expect(canvas.getByText(t('RoleBlock:you'))).toBeVisible();
  },
});

export const ChangedRowFlash = meta.story({
  args: { flash: true },
  render: (args) => (
    <div style={{ display: 'grid', alignContent: 'start', minHeight: 0, overflowY: 'auto' }}>
      <PlayerRowCell {...args} data-testid="own" />
      <PlayerRowCell {...args} unit={goblin} mine={false} data-testid="dead" />
      <PlayerRowCell {...args} unit={orc} mine={false} active data-testid="active" />
      <PlayerRowCell {...args} unit={orc} mine={false} flash={false} data-testid="still" />
    </div>
  ),
  play: async ({ canvas }) => {
    const border = (id: string) => getComputedStyle(canvas.getByTestId(id)).borderTopColor;
    await expect(canvas.getByTestId('own')).toHaveAttribute('data-flash');
    await expect(border('own')).not.toBe(border('still'));
    await expect(border('dead')).toBe(border('still'));
    await expect(border('active')).toBe('rgb(35, 31, 28)');
  },
});
export const TapRowExpandsAndCollapses = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    const name = canvas.getByRole('button', { name: 'Vashti the Hexer' });
    await userEvent.click(
      canvas.getByRole('group', {
        name: (name: string) =>
          name.replace(/\s+/g, ' ') ===
          `${t('DefenseLine:ac')} 16 · ${t('DefenseLine:pd')} 12 · ${t('DefenseLine:md')} 15`,
      }),
    );
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(name).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: t('conditions') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('conditions') }));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await userEvent.click(name);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(name).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: t('conditions') })).toBeNull();
  },
});

export const TapNoteEditsEnterSaves = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await userEvent.click(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: Concentrating on Hex` }),
    );
    const editor = canvas.getByRole('textbox', { name: t('NoteField:label') });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.type(editor, ' on Orc');
    await userEvent.keyboard('{Enter}');
    await expect(args.onNoteChange).toHaveBeenCalledOnce();
    await expect(args.onNoteChange).toHaveBeenCalledWith('Concentrating on Hex on Orc');
    await expect(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: Concentrating on Hex on Orc` }),
    ).toBeVisible();
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
});

export const CollapseSavesNote = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await userEvent.click(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: Concentrating on Hex` }),
    );
    const editor = canvas.getByRole('textbox', { name: t('NoteField:label') });
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

export const HostCollapseSavesNote = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'the story harness button that drives the host is a test fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
  },
  args: { expanded: true, hostCollapse: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await userEvent.click(
      canvas.getByRole('button', { name: `${t('NoteField:label')}: Concentrating on Hex` }),
    );
    const editor = canvas.getByRole('textbox', { name: t('NoteField:label') });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Hex ends next round');
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse from the host' }));
    await expect(args.onNoteChange).toHaveBeenCalledOnce();
    await expect(args.onNoteChange).toHaveBeenCalledWith('Hex ends next round');
    await expect(await canvas.findByText('Hex ends next round')).toBeVisible();
  },
});

export const RoleFillsRow = meta.story({
  tags: ['!dev'],
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

export const OwnControlsFireCallbacks = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await userEvent.click(canvas.getByRole('button', { name: `20 /36 ${t('HpBox:wounded')}` }));
    await expect(args.onHp).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: /^15/ }));
    await expect(args.onInitiative).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('conditions') }));
    await expect(args.onConditions).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('hpHistory') }));
    await expect(args.onHistory).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:edit') }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onNoteChange).not.toHaveBeenCalled();
  },
});

export const OtherRowsReadOnly = meta.story({
  tags: ['!dev'],
  args: { unit: aldric, mine: false, expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.queryByText(t('conditions'))).toBeNull();
    await expect(canvas.queryByText(t('hpHistory'))).toBeNull();
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

async function keyboardWalk(canvasElement: HTMLElement, args: KeyboardSpies, t: TFunction) {
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
  await expect(canvas.getByRole('button', { name: `20 /36 ${t('HpBox:wounded')}` })).toHaveFocus();
  await userEvent.keyboard(' ');
  await expect(args.onHp).toHaveBeenCalledOnce();
  await userEvent.tab();
  await expect(canvas.getByRole('button', { name: t('conditions') })).toHaveFocus();
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

export const KeyboardWithMotionOn = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ args, canvasElement, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await keyboardWalk(canvasElement, args, t);
    await expect(args.onHistory).not.toHaveBeenCalled();
  },
});

export const MoreOpensReleaseClaimMenu = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  render: (args) => <MoreMenuCell {...args} onMenuItem={onMenuSelect} />,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    onMenuSelect.mockClear();
    const more = canvas.getByRole('button', { name: t('CardActions:more') });
    await userEvent.click(more);
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    const menu = canvas.getByRole('menu', { name: t('Menu:menuLabel') });
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:releaseClaim') }));
    await expect(onMenuSelect).toHaveBeenCalledOnce();
    await expect(onMenuSelect).toHaveBeenCalledWith('releaseClaim');
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('menu')).toBeNull();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  },
});

export const EnemyFriendlyFieldsHidden = meta.story({
  tags: ['!dev'],
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
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'PlayerRow');
    await expect(canvas.getByText('Orc Berserker')).toBeVisible();
    await expect(canvas.getByText(t('HpBox:staggered'))).toBeVisible();
    await expect(canvasElement.querySelector('[data-part="numbers"]')).toBeNull();
    await expect(canvas.queryByText('14')).toBeNull();
    await expect(canvas.queryByText('/40')).toBeNull();
    await expect(canvas.queryByText(t('HpBox:temp', { amount: 6 }))).toBeNull();
    await expectNoDefenses(canvas, t);
    await expect(canvas.queryByText('@Mika')).toBeNull();
    await expect(canvas.queryByText('Hidden note')).toBeNull();
    await expect(canvas.queryByText(t('RoleBlock:you'))).toBeNull();
    await expect(canvas.queryByText(t('conditions'))).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvasElement.querySelector('[data-mine]')).toBeNull();
    await userEvent.click(canvas.getByText('Orc Berserker'));
    await userEvent.click(canvas.getByText(t('HpBox:staggered')));
    await userEvent.click(canvas.getByText('17'));
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onHp).not.toHaveBeenCalled();
    await expect(args.onInitiative).not.toHaveBeenCalled();
    await expect(args.onNoteChange).not.toHaveBeenCalled();
  },
});
