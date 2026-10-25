import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { ApiError } from '@combat-planner/api/client';
import type { Action } from '@combat-planner/domain';
import type { Loader } from '@storybook/react-vite';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { ulid } from 'ulid';
import { FakeApiClient } from '../../api/FakeApiClient.ts';
import type { Scenario } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { layout } from '../../layout.ts';
import {
  COMBAT_ID,
  JONAS,
  MIKA,
  MISSING_COMBAT_ID,
  STORY_ORIGIN,
  combatOf,
  combatScenario,
  libraryPresets,
  longScenario,
  longUnits,
  noUnitsScenario,
  rolls,
  roster,
  rosterUnits,
  runningScenario,
  setupScenario,
  unitIds,
} from './CombatScreen.scenarios.ts';
import { CombatScreen } from './CombatScreen.tsx';
import { anyValue, collapsedSpace, escapeRegExp, storyT } from '../../storybook/storyT.ts';

type Canvas = ReturnType<typeof within>;

const names = {
  aldric: roster.aldric.name,
  orc: roster.orc.name,
  vashti: roster.vashti.name,
  goblin: roster.goblin.name,
  tomas: roster.tomas.name,
  shadow: roster.shadow.name,
};

const rosterOrder = Object.values(names);

const ticketName = (t: TFunction, round: number, value: number): string =>
  t('CombatHeader:editRoundAndEscalation', { round, value });

const ticketAny = (t: TFunction): RegExp => {
  const [before = '', between = '', after = ''] = String(
    t('CombatHeader:editRoundAndEscalation', { round: '\u0000', value: '\u0000' }),
  ).split('\u0000');
  return new RegExp(`^${[before, between, after].map(escapeRegExp).join('\\d+')}$`);
};

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

const dispatched = (api: FakeApiClient): Action[] =>
  api.calls
    .filter((call) => call.method === 'combats.dispatch')
    .map((call) => call.args[1] as Action);

const callsOf = (api: FakeApiClient, method: string) =>
  api.calls.filter((call) => call.method === method);

const rowsOf = (canvasElement: HTMLElement): HTMLElement[] =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-unit-role]')].filter(
    (element) => element.parentElement?.closest('[data-unit-role]') === null,
  );

const nameOfRow = (row: HTMLElement, candidates: readonly string[]): string | undefined =>
  candidates.find((name) => within(row).queryByText(name, { exact: true }) !== null);

const orderOf = (canvasElement: HTMLElement, candidates: readonly string[]) =>
  rowsOf(canvasElement).map((row) => nameOfRow(row, candidates));

const rowOf = (canvasElement: HTMLElement, name: string): Promise<HTMLElement> =>
  waitFor(() => {
    const row = rowsOf(canvasElement).find(
      (candidate) => within(candidate).queryByText(name, { exact: true }) !== null,
    );
    if (!row) throw new Error(`${name} has no row`);
    return row;
  });

const hpOf = (
  canvasElement: HTMLElement,
  name: string,
  hp: RegExp | ((label: string) => boolean),
): Promise<HTMLElement> =>
  waitFor(async () => within(await rowOf(canvasElement, name)).getByRole('button', { name: hp }));

const typeNote = async (row: HTMLElement, text: string, t: TFunction) => {
  await userEvent.click(within(row).getByRole('button', { name: t('NoteField:label') }));
  await userEvent.type(within(row).getByRole('textbox', { name: t('NoteField:label') }), text);
};

const expand = async (canvasElement: HTMLElement, name: string) => {
  const row = await rowOf(canvasElement, name);
  await userEvent.click(within(row).getByRole('button', { name }));
  await expect(within(row).getByRole('button', { name })).toHaveAttribute('aria-expanded', 'true');
  return row;
};

const openRowMenu = async (
  canvas: Canvas,
  canvasElement: HTMLElement,
  name: string,
  t: TFunction,
) => {
  const row = await expand(canvasElement, name);
  await userEvent.click(within(row).getByRole('button', { name: t('CardActions:more') }));
  return canvas.findByRole('menu', { name: t('UnitRow:menuLabel', { name }) });
};

const openNumpad = async (
  canvas: Canvas,
  canvasElement: HTMLElement,
  name: string,
  hp: RegExp | ((label: string) => boolean),
) => {
  await userEvent.click(await hpOf(canvasElement, name, hp));
  return canvas.findByRole('dialog', { name });
};

const typeAmount = async (sheet: HTMLElement, digits: string) => {
  for (const digit of digits) {
    await userEvent.click(within(sheet).getByRole('button', { name: digit }));
  }
};

const openMenu = async (canvas: Canvas, t: TFunction) => {
  await userEvent.click(await canvas.findByRole('button', { name: t('CombatHeader:menu') }));
  return canvas.findByRole('menu', { name: t('CombatHeader:menuLabel') });
};

const pickMenu = async (canvas: Canvas, item: string, t: TFunction) => {
  const menu = await openMenu(canvas, t);
  await userEvent.click(within(menu).getByRole('menuitem', { name: item }));
};

const nextTurnButton = (canvas: Canvas, t: TFunction) =>
  canvas.findByRole('button', { name: (label: string) => label.startsWith(t('TurnBar:nextTurn')) });

const addTileOf = (canvas: Canvas, t: TFunction): Promise<HTMLElement> =>
  canvas.findByRole('button', { name: t('EmptyState:addUnit') });

const startButton = (canvas: Canvas, t: TFunction) =>
  canvas.findByRole('button', {
    name: (label: string) => label.startsWith(t('TurnBar:startCombat')),
  });

const damageOrc = async (
  canvas: Canvas,
  canvasElement: HTMLElement,
  amount: string,
  t: TFunction,
) => {
  const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
  await typeAmount(sheet, amount);
  await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
  await waitFor(() => expect(canvas.queryByRole('dialog', { name: names.orc })).toBeNull());
};

const openShare = async (canvas: Canvas, t: TFunction) => {
  await pickMenu(canvas, t('Menu:share'), t);
  const sheet = await canvas.findByRole('dialog', { name: t('ShareSheet:title') });
  await waitFor(() => expect(document.activeElement).toBe(sheet));
  return sheet;
};

const scrollList = async (canvasElement: HTMLElement) => {
  const first = await rowOf(canvasElement, 'Flussbrückenwächterin Adelheid von Stein');
  const list = first.closest<HTMLElement>('[data-scrollarea-viewport]');
  if (!list) throw new Error('The unit list is missing');
  list.scrollTop = 38;
  await waitFor(() => expect(list.scrollTop).toBe(38));
};

const offlineLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  const open = api.combats.open.bind(api.combats);
  let failed = false;
  api.combats.open = (id) => {
    if (failed) return open(id);
    failed = true;
    return Promise.reject(new ApiError({ status: 0, code: 'network' }));
  };
  api.combats.subscribe = () => () => {};
  return { api };
};

const heldLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  const send = api.combats.dispatch.bind(api.combats);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  api.combats.dispatch = async (id, action) => {
    await held;
    return send(id, action);
  };
  return { api, release };
};

const releaseOf = (loaded: Record<string, unknown>): (() => void) => {
  const { release } = loaded;
  if (typeof release !== 'function') throw new Error('heldLoader is missing');
  return release as () => void;
};

const heldDocumentsLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  const subscribe = api.combats.subscribe.bind(api.combats);
  const held: Array<() => void> = [];
  let holding = false;
  api.combats.subscribe = (id, onDocument, onEnd) =>
    subscribe(
      id,
      (document) => {
        if (holding) held.push(() => onDocument(document));
        else onDocument(document);
      },
      onEnd,
    );
  return {
    api,
    hold: () => {
      holding = true;
    },
    release: () => {
      holding = false;
      for (const deliver of held.splice(0)) deliver();
    },
  };
};

const heldDocumentsOf = (loaded: Record<string, unknown>) => {
  const { hold, release } = loaded;
  if (typeof hold !== 'function' || typeof release !== 'function') {
    throw new Error('heldDocumentsLoader is missing');
  }
  return { hold: hold as () => void, release: release as () => void };
};

type PlayerAction =
  | { type: 'releaseUnit'; unitId: string }
  | {
      type: 'claimUnit';
      unitId: string;
      displayName: string;
    };

const actAsPlayer = async (api: FakeApiClient, playerId: string, body: PlayerAction) => {
  const { token } = await api.link.get(COMBAT_ID);
  const play = api.playAs(playerId);
  const { combat } = await play.get(token);
  await play.dispatch(token, { ...body, id: ulid(), version: combat.version });
};

const dismissToast = async (canvas: Canvas, t: TFunction) => {
  await userEvent.click(canvas.getByRole('button', { name: t('Toast:dismiss') }));
};

const expectBracketOn = (canvasElement: HTMLElement, row: HTMLElement) =>
  waitFor(async () => {
    const bar = canvasElement.querySelector('[data-turn-bracket]');
    if (!(bar instanceof HTMLElement)) throw new Error('The turn bracket is missing');
    await expect(bar).toBeVisible();
    const box = bar.getBoundingClientRect();
    const card = row.getBoundingClientRect();
    await expect(
      Math.abs(box.top + box.height / 2 - (card.top + card.height / 2)),
    ).toBeLessThanOrEqual(1);
    await expect(box.right).toBeLessThan(card.left);
  });

const setupRolls = [19, 17, 12, 12, 7];

const meta = preview.meta({
  title: 'Screens/CombatScreen',
  component: CombatScreen,
  decorators: [withRouter],
  args: { combatId: COMBAT_ID, origin: STORY_ORIGIN, random: rolls([11]) },
  render: (args) => (
    <>
      <CombatScreen {...args} />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: { overlay: true },
    scenario: runningScenario(),
    reactRouter: reactRouterParameters({
      location: { path: `/combats/${COMBAT_ID}` },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const EmptyCombat = meta.story({
  tags: ['visual'],
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const heading = await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') });
    await expect(heading).toBeVisible();
    const emptyState = heading.parentElement;
    if (!emptyState) throw new Error('The empty state is missing');
    await expect(within(emptyState).queryByRole('button')).toBeNull();
    const tile = await addTileOf(canvas, t);
    await expect(tile).toBeEnabled();
    await expect(tile.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      emptyState.getBoundingClientRect().bottom,
    );
    const start = await startButton(canvas, t);
    await expect(start).toBeDisabled();
    await expect(start).toHaveTextContent(t('TurnBar:addUnitFirst'));
    await expect(canvas.getByText(t('Chip:setup'))).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'combats.open')).toHaveLength(1);
  },
});

export const AddUnitSheet = meta.story({
  tags: ['visual'],
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') });
    await userEvent.click(await addTileOf(canvas, t));
    const form = await canvas.findByRole('dialog', { name: t('Menu:addUnit') });
    await expect(within(form).getByRole('textbox', { name: t('UnitForm:name') })).toHaveAttribute(
      'placeholder',
      t('UnitForm:defaultName', { role: t('UnitForm:enemy'), n: 1 }),
    );
    await expect(within(form).getByText(t('UnitForm:hintSetup'))).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const SetupWithUnits = meta.story({
  parameters: { scenario: setupScenario() },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const last = await rowOf(canvasElement, names.shadow);
    await expect(orderOf(canvasElement, rosterOrder)).toEqual(rosterOrder);
    const tile = await addTileOf(canvas, t);
    await expect(last.nextElementSibling).toBe(tile);
    await expect(tile.getBoundingClientRect().width).toBeCloseTo(
      last.getBoundingClientRect().width,
      0,
    );
    const start = await startButton(canvas, t);
    await expect(start).toBeEnabled();
    await expect(start).toHaveTextContent(t('TurnBar:rollsMissingInitiative'));
    await expect(canvas.queryByRole('button', { name: ticketAny(t) })).toBeNull();
  },
});

export const AddTileOpensAddSheet = meta.story({
  tags: ['!dev'],
  parameters: { scenario: setupScenario() },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await rowOf(canvasElement, names.shadow);
    await userEvent.click(await addTileOf(canvas, t));
    const form = await canvas.findByRole('dialog', { name: t('Menu:addUnit') });
    await expect(within(form).getByText(t('UnitForm:hintSetup'))).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CombatStarted = meta.story({
  tags: ['visual'],
  parameters: { scenario: setupScenario() },
  args: { random: rolls(setupRolls) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await startButton(canvas, t));
    await expect(await canvas.findByRole('button', { name: ticketName(t, 1, 0) })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({
        type: 'start',
        rolls: {
          [unitIds.aldric]: 19,
          [unitIds.orc]: 17,
          [unitIds.vashti]: 12,
          [unitIds.goblin]: 12,
          [unitIds.shadow]: 7,
        },
      }),
    ]);
    await expect(orderOf(canvasElement, rosterOrder)).toEqual(rosterOrder);
    await expect(await rowOf(canvasElement, names.aldric)).toHaveAttribute('data-active');
    await expect(await nextTurnButton(canvas, t)).toHaveTextContent(names.orc);
  },
});

export const RunningCombat = meta.story({
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
    const next = await nextTurnButton(canvas, t);
    await expect(next).toHaveTextContent(names.tomas);
    await expect(canvas.queryByRole('button', { name: t('EmptyState:addUnit') })).toBeNull();
    next.focus();
    await expect(next).toHaveFocus();
  },
});

export const NextTurnPassesToNextUnit = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await nextTurnButton(canvas, t));
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'nextTurn' }),
      ]),
    );
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.tomas)).toHaveAttribute('data-active'),
    );
    await expect(await nextTurnButton(canvas, t)).toHaveTextContent(
      t('nextWrap', { name: 'Ser Aldric', round: 4 }),
    );
    await expect(canvas.getByRole('button', { name: ticketName(t, 3, 2) })).toBeVisible();
  },
});

export const BracketFollowsNextTurn = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expectBracketOn(canvasElement, await rowOf(canvasElement, names.vashti));
    await userEvent.click(await nextTurnButton(canvas, t));
    const tomas = await rowOf(canvasElement, names.tomas);
    await waitFor(() => expect(tomas).toHaveAttribute('data-active'));
    await expectBracketOn(canvasElement, tomas);
  },
});

export const BracketFollowsExpand = meta.story({
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    const vashti = await rowOf(canvasElement, names.vashti);
    await expectBracketOn(canvasElement, vashti);
    const before = vashti.getBoundingClientRect().top;
    await expand(canvasElement, names.aldric);
    await waitFor(() => expect(vashti.getBoundingClientRect().top).toBeGreaterThan(before));
    await expectBracketOn(canvasElement, vashti);
  },
});

export const NewRoundEscalationRaised = meta.story({
  tags: ['visual'],
  parameters: { scenario: runningScenario({ active: 'tomas' }) },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await nextTurnButton(canvas, t));
    await expect(await canvas.findByRole('button', { name: ticketName(t, 4, 3) })).toBeVisible();
    await expect(await rowOf(canvasElement, names.aldric)).toHaveAttribute('data-active');
    await expect(await nextTurnButton(canvas, t)).toHaveTextContent(names.orc);
  },
});

export const LastRoundReached = meta.story({
  parameters: { scenario: runningScenario({ round: 99, escalation: 6, active: 'tomas' }) },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const next = await nextTurnButton(canvas, t);
    await expect(next).toBeDisabled();
    await expect(next).toHaveTextContent(t('TurnBar:lastRound', { round: 99 }));
    await userEvent.click(next, { pointerEventsCheck: 0 });
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const EveryUnitDisabled = meta.story({
  parameters: {
    scenario: runningScenario({
      active: null,
      units: rosterUnits().map((unit) => ({ ...unit, disabled: true })),
    }),
  },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const next = await nextTurnButton(canvas, t);
    await expect(next).toBeDisabled();
    await expect(next).toHaveTextContent(t('TurnBar:everyUnitDisabled'));
    await userEvent.click(next, { pointerEventsCheck: 0 });
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const HpNumpad = meta.story({
  name: 'HP Numpad',
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await expect(
      within(sheet).getByRole('button', { name: t('HistoryRow:damage') }),
    ).toBeDisabled();
    await expect(
      within(sheet).getByRole('button', { name: t('NumpadSheet:setMax') }),
    ).toBeDisabled();
  },
});

export const DamageStaggersRow = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await damageOrc(canvas, canvasElement, '12', t);
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'damage', unitId: unitIds.orc, amount: 12 }),
    ]);
    await expect(
      await hpOf(canvasElement, names.orc, (label: string) =>
        label.startsWith(`2 /40 ${t('HpBox:staggered')}`),
      ),
    ).toBeVisible();
  },
});

export const HpHistoryOpen = meta.story({
  name: 'HP History Open',
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.vashti, /^20 \/36/);
    const toggle = within(sheet).getByRole('button', {
      name: (label: string) => label.includes(t('HpHistory:title')),
    });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  },
});

export const UnitExpanded = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expand(canvasElement, names.vashti);
    await expect(canvas.getByRole('button', { name: t('PlayerRow:conditions') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('UnitRow:hpHistory') })).toBeVisible();
  },
});

export const ConditionList = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expand(canvasElement, names.vashti);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    await expect(within(sheet).getByRole('checkbox', { name: t('Chip:dazed') })).toBeChecked();
    await expect(
      within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }),
    ).not.toBeChecked();
  },
});

export const ConditionAndNoteSaved = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.vashti);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    await userEvent.click(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }));
    await waitFor(() =>
      expect(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') })).toBeChecked(),
    );
    await userEvent.click(within(sheet).getByRole('button', { name: t('Sheet:done') }));
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('PlayerRow:conditions') })).toBeNull(),
    );
    await typeNote(row, 'Hex on Orc Berserker', t);
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'toggleCondition', condition: 'weakened' }),
    ]);
  },
});

export const RowWithConditionsAndNote = meta.story({
  parameters: {
    scenario: runningScenario({
      units: rosterUnits({ vashti: { conditions: ['dazed', 'weakened'] } }),
    }),
  },
  play: async ({ canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.vashti);
    await typeNote(row, 'Hex on Orc Berserker', t);
    await userEvent.click(within(row).getByRole('button', { name: names.vashti }));
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({
          type: 'editNote',
          unitId: unitIds.vashti,
          note: 'Hex on Orc Berserker',
        }),
      ]),
    );
    await expect(within(row).getByText('Hex on Orc Berserker')).toBeVisible();
    await expect(
      within(row).getByRole('list', { name: t('PlayerRow:conditions') }),
    ).toHaveTextContent(`${t('UnitRow:dazed')}${t('UnitRow:weakened')}`);
  },
});

export const HpHistoryFromRow = meta.story({
  name: 'HP History From Row',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expand(canvasElement, names.vashti);
    await userEvent.click(canvas.getByRole('button', { name: t('UnitRow:hpHistory') }));
    const sheet = await canvas.findByRole('dialog', {
      name: (label: string) => label.includes(t('HpHistory:title')),
    });
    await expect(within(sheet).getByText(/Vashti the Hexer/)).toBeVisible();
  },
});

export const RoundSheetOpen = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const ticket = await canvas.findByRole('button', { name: ticketName(t, 3, 2) });
    await userEvent.click(ticket);
    const sheet = await canvas.findByRole('dialog', { name: t('CombatHeader:roundSheetTitle') });
    await expect(within(sheet).getByRole('spinbutton')).toHaveValue('3');
    await expect(
      within(sheet).getByRole('button', { name: t('CombatHeader:escalationFace', { value: 2 }) }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(ticket).toHaveAttribute('aria-expanded', 'true');
  },
});

export const RoundAndEscalationEdits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await canvas.findByRole('button', { name: ticketName(t, 3, 2) }));
    const sheet = await canvas.findByRole('dialog', { name: t('CombatHeader:roundSheetTitle') });
    await userEvent.click(within(sheet).getByRole('button', { name: t('Stepper:increase') }));
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'editRound', round: 4 }),
      ]),
    );
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CombatHeader:escalationFace', { value: 3 }) }),
    );
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'editRound', round: 4 }),
        expect.objectContaining({ type: 'setEscalation', escalation: 3 }),
      ]),
    );
    await expect(sheet).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: ticketName(t, 4, 3), hidden: true }),
    ).toBeInTheDocument();
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
  },
});

export const InitiativeSheetRolls = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const orc = await rowOf(canvasElement, names.orc);
    await userEvent.click(within(orc).getByRole('button', { name: t('UnitRow:rollInitiative') }));
    const sheet = await canvas.findByRole('dialog', { name: t('InitiativeSheet:title') });
    await expect(within(sheet).getByText(names.orc)).toBeVisible();
    await userEvent.click(
      within(sheet).getByRole('button', { name: anyValue(t, 'InitiativeSheet:roll', 'bonus') }),
    );
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'rollInitiative', unitId: unitIds.orc, roll: 11 }),
      ]),
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const SaveAsPresetFromMenu = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:saveAsPreset') }));
    await expect(
      await canvas.findByText(t('Toast:presetAdded', { name: 'Orc Berserker' })),
    ).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'presets.create').map((call) => call.args[0])).toEqual([
      expect.objectContaining({
        name: names.orc,
        role: 'enemy',
        maxHp: 40,
        ac: 18,
        pd: 16,
        md: 12,
        initiativeBonus: 0,
        tags: [],
      }),
    ]);
  },
});

export const RemoveConfirmation = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:remove') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:removeTitle', { name: 'Orc Berserker' }),
    });
    await expect(within(dialog).getByRole('button', { name: t('Menu:remove') })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const UnitRemovedUndoToast = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:remove') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:removeTitle', { name: 'Orc Berserker' }),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Menu:remove') }));
    await expect(
      await canvas.findByText(t('Toast:unitRemoved', { name: 'Orc Berserker' })),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Toast:undo') })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'removeUnit', unitId: unitIds.orc }),
    ]);
    await waitFor(() => expect(orderOf(canvasElement, rosterOrder)).not.toContain(names.orc));
  },
});

export const DuplicateBelowOriginal = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:duplicate') }));
    const copy = await rowOf(canvasElement, 'Orc Berserker 2');
    const all = [...rosterOrder, 'Orc Berserker 2'];
    await expect(orderOf(canvasElement, all).slice(0, 4)).toEqual([
      names.aldric,
      names.orc,
      'Orc Berserker 2',
      names.vashti,
    ]);
    await expect(within(copy).getByRole('button', { name: /^40 \/40/ })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'duplicateUnit', unitId: unitIds.orc }),
    ]);
  },
});

export const DisabledUnit = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:disable') }));
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.orc)).toHaveAttribute('data-disabled'),
    );
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'setDisabled', unitId: unitIds.orc, disabled: true }),
    ]);
    await expect(
      within(await rowOf(canvasElement, names.orc)).getByRole('button', { name: names.orc }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
});

export const CombatMenu = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await damageOrc(canvas, canvasElement, '12', t);
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    const menu = await openMenu(canvas, t);
    await expect(within(menu).getByRole('menuitem', { name: t('Toast:undo') })).toBeEnabled();
    await expect(within(menu).getByRole('menuitem', { name: t('Menu:restart') })).toBeVisible();
  },
});

export const UndoLastAction = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await damageOrc(canvas, canvasElement, '12', t);
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    await pickMenu(canvas, t('Toast:undo'), t);
    await expect(
      await canvas.findByText(
        collapsedSpace(t('CombatScreen:undoDamage', { amount: 12, name: 'Orc Berserker' })),
      ),
    ).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded)).map((action) => action.type)).toEqual([
      'damage',
      'undo',
    ]);
  },
});

export const DefensesTriggerOpensSheet = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.orc);
    await userEvent.click(within(row).getByRole('button', { name: t('UnitRow:defenses') }));
    const sheet = await canvas.findByRole('dialog', {
      name: t('DefenseSheet:title', { name: names.orc }),
    });
    const stepperOf = (stat: string) => {
      const stepper = sheet.querySelector<HTMLElement>(`[data-stat="${stat}"]`);
      if (!stepper) throw new Error(`${stat} row missing`);
      return within(stepper);
    };
    await userEvent.click(stepperOf('ac').getByRole('button', { name: t('Stepper:increase') }));
    await userEvent.click(stepperOf('ac').getByRole('button', { name: t('Stepper:increase') }));
    await userEvent.click(stepperOf('pd').getByRole('button', { name: t('Stepper:decrease') }));
    await expect(stepperOf('ac').getByText('20')).toBeVisible();
    await expect(stepperOf('pd').getByText('15')).toBeVisible();
    await expect(within(sheet).getAllByText(t('DefenseSheet:base', { value: 18 }))).toHaveLength(1);
    const line = row.querySelector<HTMLElement>('[role="group"]:has(> [data-stat])');
    if (!line) throw new Error('defense line missing');
    await waitFor(() =>
      expect(line).toHaveAccessibleName(
        `${t('DefenseLine:ac')}\u00A020\u00A0· ${t('DefenseLine:pd')}\u00A015\u00A0· ${t('DefenseLine:md')}\u00A012`,
      ),
    );
    await expect(line.querySelector('[data-stat="ac"]')).toHaveAttribute('data-mod', 'up');
    await expect(line.querySelector('[data-stat="pd"]')).toHaveAttribute('data-mod', 'down');
    await userEvent.click(within(sheet).getByRole('button', { name: t('DefenseSheet:reset') }));
    await waitFor(() => expect(line.querySelector('[data-mod]')).toBeNull());
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'setDefenseMods', ac: 1, pd: 0, md: 0 }),
        expect.objectContaining({ type: 'setDefenseMods', ac: 2, pd: 0, md: 0 }),
        expect.objectContaining({ type: 'setDefenseMods', ac: 2, pd: -1, md: 0 }),
        expect.objectContaining({ type: 'setDefenseMods', ac: 0, pd: 0, md: 0 }),
      ]),
    );
    await userEvent.click(within(sheet).getByRole('button', { name: t('Sheet:close') }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await pickMenu(canvas, t('Toast:undo'), t);
    await expect(
      await canvas.findByText(
        collapsedSpace(t('CombatScreen:undoSetDefenseMods', { name: names.orc })),
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(line.querySelector('[data-stat="pd"]')).toHaveAttribute('data-mod', 'down'),
    );
  },
});

export const ShareSheet = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openShare(canvas, t);
    await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'));
    await expect(
      within(sheet).getByText(`${STORY_ORIGIN}/combats/${COMBAT_ID}/play?t=${COMBAT_ID}.0.fake`),
    ).toBeVisible();
    await expect(within(sheet).getByRole('img', { name: t('ShareSheet:qr') })).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'link.get')).toHaveLength(1);
  },
});

export const CopyLinkToClipboard = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const sheet = await openShare(canvas, t);
    await userEvent.click(within(sheet).getByRole('button', { name: t('ShareSheet:copy') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:linkCopied'));
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('ShareSheet:title') })).toBeNull(),
    );
    await expect(writeText).toHaveBeenCalledWith(
      `${STORY_ORIGIN}/combats/${COMBAT_ID}/play?t=${COMBAT_ID}.0.fake`,
    );
    writeText.mockRestore();
  },
});

export const RevokeLinkConfirmation = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openShare(canvas, t);
    await userEvent.click(within(sheet).getByRole('button', { name: t('ShareSheet:reissue') }));
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:revokeTitle') });
    await expect(within(dialog).getByRole('button', { name: t('Dialog:revoke') })).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'link.reissue')).toHaveLength(0);
  },
});

export const RestartConfirmation = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:restart'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:restartTitle') });
    await expect(within(dialog).getByRole('button', { name: t('Dialog:restart') })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const RestartReturnsToSetup = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:restart'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:restartTitle') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Dialog:restart') }));
    await expect(await startButton(canvas, t)).toBeEnabled();
    await expect(canvas.getByText(t('Chip:setup'))).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'restart' }),
    ]);
    await expect(await hpOf(canvasElement, names.orc, /^40 \/40/)).toBeVisible();
  },
});

export const ClearConfirmation = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:clear'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:clearTitle') });
    await expect(within(dialog).getByText(t('Dialog:clearBody', { count: 6 }))).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const ClearEmptiesCombat = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:clear'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:clearTitle') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Dialog:clear') }));
    await expect(
      await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') }),
    ).toBeVisible();
    await expect(await startButton(canvas, t)).toBeDisabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'clear' }),
    ]);
  },
});

const longNameBreak = {
  wordBreaks: {
    reason: 'the longest German unit name is wider than the unit row name column',
    except: '[data-part="name"]',
  },
};

export const LongList = meta.story({
  tags: ['visual'],
  parameters: { geometry: longNameBreak, scenario: longScenario() },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await scrollList(canvasElement);
    await expect(
      await rowOf(canvasElement, '黒水の渡し守と呪われし大蛇の群れ'),
    ).toBeInTheDocument();
    await expect(
      await rowOf(canvasElement, 'Капитан стражи переправы Святослав Огнев'),
    ).toBeVisible();
    await expect(await nextTurnButton(canvas, t)).toHaveAccessibleName(
      /Brother Tomas of the Silver Lantern Order/,
    );
  },
});

export const UnitLimitReached = meta.story({
  parameters: { geometry: longNameBreak, scenario: longScenario(99) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await scrollList(canvasElement);
    await pickMenu(canvas, t('Menu:addUnit'), t);
    await expect(await canvas.findByText(t('Toast:unitCap', { limit: 99 }))).toBeVisible();
    await expect(canvas.queryByRole('dialog', { name: t('Menu:addUnit') })).toBeNull();
    await expect(rowsOf(canvasElement)).toHaveLength(99);
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const SetupUnitLimitReached = meta.story({
  parameters: {
    geometry: longNameBreak,
    scenario: combatScenario(combatOf({ status: 'setup', units: longUnits(99) })),
  },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const tile = await addTileOf(canvas, t);
    const list = tile.closest<HTMLElement>('[data-scrollarea-viewport]');
    if (!list) throw new Error('The unit list is missing');
    list.scrollTop = list.scrollHeight;
    await waitFor(() => expect(tile).toBeVisible());
    await expect(tile).toBeDisabled();
    await expect(tile).toHaveAccessibleDescription(t('Toast:unitCap', { limit: 99 }));
    await expect(rowsOf(canvasElement)).toHaveLength(99);
    await userEvent.click(tile, { pointerEventsCheck: 0 });
    await expect(canvas.queryByRole('dialog', { name: t('Menu:addUnit') })).toBeNull();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const RequestFailed = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await canvas.findByText(t('Toast:serverUnreachable'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Toast:retry') })).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
  },
});

export const RetryResendsSameAction = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await userEvent.click(await canvas.findByRole('button', { name: t('Toast:retry') }));
    await expect(await hpOf(canvasElement, names.orc, /^6 \/40/)).toBeVisible();
    const [first, second] = dispatched(api);
    await expect(second?.id).toBe(first?.id);
    await expect(dispatched(api)).toHaveLength(2);
  },
});

export const ChangeShowsBeforeDocument = meta.story({
  tags: ['!dev'],
  loaders: [heldLoader],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toHaveLength(0);
    releaseOf(loaded)();
    await waitFor(() => expect(dispatched(fakeApiOf(loaded))).toHaveLength(1));
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
  },
});

export const RefusalRollsBack = meta.story({
  tags: ['!dev'],
  loaders: [heldLoader],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
    releaseOf(loaded)();
    await expect(await canvas.findByText(t('Toast:serverUnreachable'))).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
  },
});

export const ForeignDocumentKeepsPending = meta.story({
  tags: ['!dev'],
  loaders: [heldLoader],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
    await actAsPlayer(api, MIKA, { type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(
      await canvas.findByText(t('Toast:playerReleased', { name: 'Mika', hero: names.vashti })),
    ).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
    await expect(dispatched(api)).toHaveLength(0);
  },
});

export const HpChangesFollowRules = meta.story({
  name: 'HP Changes Follow Rules',
  tags: ['!dev'],
  parameters: { scenario: runningScenario({ units: rosterUnits({ orc: { tempHp: 5 } }) }) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const apply = async (hp: RegExp, digits: string, action: string) => {
      const sheet = await openNumpad(canvas, canvasElement, names.orc, hp);
      await typeAmount(sheet, digits);
      await userEvent.click(within(sheet).getByRole('button', { name: action }));
      await waitFor(() => expect(canvas.queryByRole('dialog', { name: names.orc })).toBeNull());
    };
    await apply(/^14 \/40/, '8', t('HistoryRow:damage'));
    await expect(
      await hpOf(canvasElement, names.orc, (label: string) =>
        label.startsWith(`11 /40 ${t('HpBox:staggered')}`),
      ),
    ).toBeVisible();
    await apply(/^11 \/40/, '30', t('NumpadSheet:setMax'));
    await expect(await hpOf(canvasElement, names.orc, /^11 \/30/)).toBeVisible();
    await apply(/^11 \/30/, '50', t('NumpadSheet:heal'));
    await expect(await hpOf(canvasElement, names.orc, /^30 \/30/)).toBeVisible();
    await apply(/^30 \/30/, '5', t('NumpadSheet:setTemp'));
    await expect(
      await hpOf(canvasElement, names.orc, (label: string) =>
        label.startsWith(`30 /30 ${t('HpBox:temp', { amount: 5 })}`),
      ),
    ).toBeVisible();
    await apply(/^30 \/30/, '3', t('NumpadSheet:setTemp'));
    await expect(
      await hpOf(canvasElement, names.orc, (label: string) =>
        label.startsWith(`30 /30 ${t('HpBox:temp', { amount: 3 })}`),
      ),
    ).toBeVisible();
    await apply(/^30 \/30/, '99', t('HistoryRow:damage'));
    await expect(await hpOf(canvasElement, names.orc, /^[−-]30 \/30/)).toBeVisible();
    await expect(
      dispatched(fakeApiOf(loaded)).map((action) =>
        'amount' in action ? [action.type, action.amount] : [action.type],
      ),
    ).toEqual([
      ['damage', 8],
      ['setMaxHp', 30],
      ['heal', 50],
      ['setTempHp', 5],
      ['setTempHp', 3],
      ['damage', 99],
    ]);
  },
});

export const AddUnitAndPreset = meta.story({
  tags: ['!dev'],
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') });
    await userEvent.click(await addTileOf(canvas, t));
    const form = await canvas.findByRole('dialog', { name: t('Menu:addUnit') });
    await userEvent.click(within(form).getByRole('button', { name: t('UnitForm:addUnit') }));
    await rowOf(canvasElement, t('UnitForm:defaultName', { role: t('UnitForm:enemy'), n: 1 }));
    await pickMenu(canvas, t('Menu:addUnit'), t);
    await userEvent.click(await canvas.findByRole('radio', { name: t('UnitForm:library') }));
    const list = within(canvas.getByRole('group', { name: t('UnitForm:presets') }));
    await userEvent.click(
      list.getByRole('button', {
        name: (label: string) => label.startsWith(`${t('UnitForm:enemy')} Orc Shaman`),
      }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: t('UnitForm:addPreset', { name: 'Orc Shaman' }) }),
    );
    await rowOf(canvasElement, 'Orc Shaman');
    const shaman = libraryPresets[1]!;
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({
        type: 'addUnit',
        name: t('UnitForm:defaultName', { role: t('UnitForm:enemy'), n: 1 }),
        role: 'enemy',
        maxHp: 10,
      }),
      expect.objectContaining({
        type: 'addUnit',
        name: shaman.name,
        maxHp: shaman.maxHp,
        ac: shaman.ac,
      }),
    ]);
  },
});

export const EditSavesUnit = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.orc);
    await userEvent.click(within(row).getByRole('button', { name: t('CardActions:edit') }));
    const form = await canvas.findByRole('dialog', { name: t('UnitForm:editTitle') });
    const name = within(form).getByRole('textbox', { name: t('UnitForm:name') });
    await userEvent.clear(name);
    await userEvent.type(name, 'Orc Warlord');
    await userEvent.click(within(form).getByRole('button', { name: t('UnitForm:saveChanges') }));
    await rowOf(canvasElement, 'Orc Warlord');
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'editUnit', unitId: unitIds.orc, name: 'Orc Warlord' }),
    ]);
  },
});

export const RoleChangeShowsNoToast = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.vashti);
    await userEvent.click(within(row).getByRole('button', { name: t('CardActions:edit') }));
    const form = await canvas.findByRole('dialog', { name: t('UnitForm:editTitle') });
    await userEvent.click(within(form).getByRole('radio', { name: t('UnitForm:ally') }));
    await userEvent.click(within(form).getByRole('button', { name: t('UnitForm:saveChanges') }));
    await waitFor(async () =>
      expect(within(await rowOf(canvasElement, names.vashti)).queryByText('@Mika')).toBeNull(),
    );
    await expect(
      canvas.queryByText(t('Toast:playerReleased', { name: 'Mika', hero: names.vashti })),
    ).toBeNull();
    await pickMenu(canvas, t('Toast:undo'), t);
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-unit-role', 'hero'),
    );
    await expect(
      canvas.queryByText(t('Toast:playerClaimed', { name: 'Mika', hero: names.vashti })),
    ).toBeNull();
  },
});

export const UndoRestoresRemovedUnit = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:remove') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:removeTitle', { name: 'Orc Berserker' }),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Menu:remove') }));
    await userEvent.click(await canvas.findByRole('button', { name: t('Toast:undo') }));
    await expect(
      await canvas.findByText(
        collapsedSpace(t('CombatScreen:undoRemoveUnit', { name: 'Orc Berserker' })),
      ),
    ).toBeVisible();
    await rowOf(canvasElement, names.orc);
    await expect(dispatched(fakeApiOf(loaded)).map((action) => action.type)).toEqual([
      'removeUnit',
      'undo',
    ]);
  },
});

export const RemoveUndoIgnoredAfterNextTurn = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const before = await api.combats.get(COMBAT_ID);
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:remove') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:removeTitle', { name: 'Orc Berserker' }),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Menu:remove') }));
    await expect(
      await canvas.findByText(t('Toast:unitRemoved', { name: 'Orc Berserker' })),
    ).toBeVisible();
    await waitFor(() => expect(orderOf(canvasElement, rosterOrder)).not.toContain(names.orc));
    await userEvent.click(await nextTurnButton(canvas, t));
    await waitFor(async () =>
      expect((await api.combats.get(COMBAT_ID)).version).toBe(before.version + 2),
    );
    const turned = await api.combats.get(COMBAT_ID);
    await userEvent.click(canvas.getByRole('button', { name: t('Toast:undo') }));
    await expect(await canvas.findByText(t('Toast:combatChanged'))).toBeVisible();
    await expect(canvas.queryByText(t('undoRemoveUnit', { name: 'Orc Berserker' }))).toBeNull();
    const after = await api.combats.get(COMBAT_ID);
    await expect(after.version).toBe(turned.version);
    await expect(after.activeUnitId).toBe(turned.activeUnitId);
    await expect(after.units.map((unit) => unit.id)).not.toContain(unitIds.orc);
    await expect(orderOf(canvasElement, rosterOrder)).not.toContain(names.orc);
    const [removal, nextTurn, undo] = dispatched(api);
    await expect(nextTurn).toMatchObject({ type: 'nextTurn', version: removal!.version + 1 });
    await expect(undo).toMatchObject({ type: 'undo', version: removal!.version + 1 });
  },
});

export const RevokeReissuesLink = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openShare(canvas, t);
    await userEvent.click(within(sheet).getByRole('button', { name: t('ShareSheet:reissue') }));
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:revokeTitle') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Dialog:revoke') }));
    await expect(
      await within(sheet).findByText(
        `${STORY_ORIGIN}/combats/${COMBAT_ID}/play?t=${COMBAT_ID}.1.fake`,
      ),
    ).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'link.reissue')).toHaveLength(1);
  },
});

export const StopSharingClosesSheet = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const sheet = await openShare(canvas, t);
    await userEvent.click(within(sheet).getByRole('button', { name: t('ShareSheet:stop') }));
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:stopTitle') });
    await expect(within(dialog).getByText(t('Dialog:stopBody'))).toBeVisible();
    await expect(callsOf(api, 'link.stopSharing')).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: t('Dialog:stop') }));
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('ShareSheet:title') })).toBeNull(),
    );
    await waitFor(() => expect(callsOf(api, 'link.stopSharing')).toHaveLength(1));
    await waitFor(async () =>
      expect(within(await rowOf(canvasElement, names.vashti)).queryByText('@Mika')).toBeNull(),
    );
    await expect(
      canvas.queryByText(t('Toast:playerReleased', { name: 'Mika', hero: names.vashti })),
    ).toBeNull();
    await expect(
      canvas.queryByText(t('Toast:playerReleased', { name: 'Jonas', hero: names.aldric })),
    ).toBeNull();
    const reopened = await openShare(canvas, t);
    await expect(
      await within(reopened).findByText(
        `${STORY_ORIGIN}/combats/${COMBAT_ID}/play?t=${COMBAT_ID}.1.fake`,
      ),
    ).toBeVisible();
    await expect(callsOf(api, 'link.get')).toHaveLength(2);
  },
});

export const MenuNothingToUndo = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openMenu(canvas, t);
    await expect(within(menu).getByRole('menuitem', { name: t('Toast:undo') })).toBeDisabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const NotFoundGoesHome = meta.story({
  tags: ['!dev'],
  args: { combatId: MISSING_COMBAT_ID },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expect(
      await canvas.findByRole('heading', { name: t('CombatNotFound:title') }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('MessageScreen:home') }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/'));
  },
});

export const ExpiredSessionActionGoesToSignIn = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    fakeApiOf(loaded).failNext('unauthorized');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:duplicate') }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/auth/sign-in'));
    await expect(callsOf(fakeApiOf(loaded), 'combats.dispatch')).toHaveLength(1);
  },
});

export const TryAgainAfterFailedLoad = meta.story({
  tags: ['!dev'],
  loaders: [offlineLoader],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const retry = await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') });
    await expect(
      canvas.getByRole('heading', { name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await userEvent.click(retry);
    await expect(await canvas.findByRole('button', { name: ticketName(t, 3, 2) })).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'combats.open')).toHaveLength(1);
  },
});

export const UndoComesFromDocument = meta.story({
  tags: ['!dev'],
  loaders: [
    async ({ parameters }) => {
      const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
      const { version } = await api.combats.get(COMBAT_ID);
      await api.combats.dispatch(COMBAT_ID, {
        id: '01JQ0000000000000000000001',
        version,
        type: 'damage',
        unitId: unitIds.orc,
        amount: 12,
      });
      return { api };
    },
  ],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    await pickMenu(canvas, t('Toast:undo'), t);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      collapsedSpace(t('CombatScreen:undoDamage', { amount: 12, name: 'Orc Berserker' })),
    );
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
  },
});

export const DocumentArrivesAfterPost = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    fakeApiOf(loaded).deferBroadcasts();
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:remove') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:removeTitle', { name: 'Orc Berserker' }),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Menu:remove') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:unitRemoved', { name: 'Orc Berserker' }),
    );
    await waitFor(() =>
      expect(within(canvasElement).queryByText(names.orc, { exact: true })).toBeNull(),
    );
    const sheet = await openNumpad(canvas, canvasElement, names.vashti, /^20 \/36/);
    await typeAmount(sheet, '5');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await hpOf(canvasElement, names.vashti, /^15 \/36/)).toBeVisible();
  },
});

export const RapidTapsUseNewestVersion = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    api.deferBroadcasts();
    const row = await expand(canvasElement, names.orc);
    await userEvent.click(within(row).getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    within(sheet)
      .getByRole('checkbox', { name: t('Chip:weakened') })
      .click();
    within(sheet)
      .getByRole('checkbox', { name: t('Chip:dazed') })
      .click();
    await waitFor(() => expect(callsOf(api, 'combats.dispatch')).toHaveLength(2));
    const [first, second] = dispatched(api);
    await waitFor(() => expect(second!.version).toBe(first!.version + 1));
    await waitFor(() =>
      expect(within(sheet).getByRole('checkbox', { name: t('Chip:dazed') })).toBeChecked(),
    );
    await expect(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') })).toBeChecked();
    await expect(canvas.queryByText(t('Toast:combatChanged'))).toBeNull();
  },
});

export const TapDuringFailureToastRuns = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    const failure = await canvas.findByText(t('Toast:serverUnreachable'));
    await userEvent.click(await nextTurnButton(canvas, t));
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.tomas)).toHaveAttribute('data-active'),
    );
    await expect(failure).toBeVisible();
    const [damage, nextTurn] = dispatched(api);
    await expect(nextTurn).toMatchObject({ type: 'nextTurn', version: damage!.version });
    await userEvent.click(canvas.getByRole('button', { name: t('Toast:retry') }));
    await expect(await canvas.findByText(t('Toast:combatChanged'))).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(dispatched(api).map((action) => action.id)).toEqual([
      damage!.id,
      nextTurn!.id,
      damage!.id,
    ]);
  },
});

export const DoubleNextTurnAfterFailure = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    api.failNext('network');
    await userEvent.click(await nextTurnButton(canvas, t));
    await expect(await canvas.findByRole('button', { name: t('Toast:retry') })).toBeVisible();
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
    await userEvent.click(await nextTurnButton(canvas, t));
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.tomas)).toHaveAttribute('data-active'),
    );
    await userEvent.click(await nextTurnButton(canvas, t));
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.aldric)).toHaveAttribute('data-active'),
    );
    await expect(canvas.getByRole('button', { name: ticketName(t, 4, 3) })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('Toast:retry') }));
    await expect(await canvas.findByText(t('Toast:combatChanged'))).toBeVisible();
    await expect(await rowOf(canvasElement, names.aldric)).toHaveAttribute('data-active');
    await expect(await nextTurnButton(canvas, t)).toHaveTextContent(names.orc);
    const sent = dispatched(api);
    const first = sent[0]!.version;
    await expect(sent.map((action) => [action.type, action.version])).toEqual([
      ['nextTurn', first],
      ['nextTurn', first],
      ['nextTurn', first + 1],
      ['nextTurn', first],
    ]);
    await expect(sent[3]!.id).toBe(sent[0]!.id);
  },
});

export const UndoRemovalBeforeDocument = meta.story({
  tags: ['!dev'],
  loaders: [heldDocumentsLoader],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const documents = heldDocumentsOf(loaded);
    await hpOf(canvasElement, names.orc, /^14 \/40/);
    documents.hold();
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:remove') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:removeTitle', { name: 'Orc Berserker' }),
    });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Menu:remove') }));
    await expect(
      await canvas.findByText(t('Toast:unitRemoved', { name: 'Orc Berserker' })),
    ).toBeVisible();
    await expect(orderOf(canvasElement, [names.orc])).not.toContain(names.orc);
    await userEvent.click(canvas.getByRole('button', { name: t('Toast:undo') }));
    await expect(
      await canvas.findByText(
        collapsedSpace(t('CombatScreen:undoRemoveUnit', { name: 'Orc Berserker' })),
      ),
    ).toBeVisible();
    const [removal, undo] = dispatched(fakeApiOf(loaded));
    await expect(removal).toMatchObject({ type: 'removeUnit', unitId: unitIds.orc });
    await expect(undo).toMatchObject({ type: 'undo', version: removal!.version + 1 });
    documents.release();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
  },
});

export const DuplicateDisabledAtLimit = meta.story({
  tags: ['!dev'],
  parameters: { geometry: longNameBreak, scenario: longScenario(99) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(
      canvas,
      canvasElement,
      'Flussbrückenwächterin Adelheid von Stein',
      t,
    );
    const duplicate = within(menu).getByRole('menuitem', { name: t('Menu:duplicate') });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(canvas.queryByText(t('Toast:unitCap', { limit: 99 }))).toBeNull();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const SavePresetFailureToast = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    fakeApiOf(loaded).failNext('invalid');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:saveAsPreset') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('presetFailed'));
  },
});

export const SavePresetLimitToast = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    fakeApiOf(loaded).failNext('limit');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:saveAsPreset') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:limitReached'));
  },
});

export const ShareLinkFailureToast = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openMenu(canvas, t);
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:share') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('linkFailed'));
    await expect(canvas.queryByRole('dialog', { name: t('ShareSheet:title') })).toBeNull();
  },
});

export const PlayerTookHeroToast = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    await rowOf(canvasElement, names.vashti);
    await actAsPlayer(api, MIKA, { type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(
      await canvas.findByText(t('Toast:playerReleased', { name: 'Mika', hero: names.vashti })),
    ).toBeVisible();
    await dismissToast(canvas, t);
    await actAsPlayer(api, MIKA, {
      type: 'claimUnit',
      unitId: unitIds.vashti,
      displayName: 'Mika',
    });
    await expect(
      await canvas.findByText(t('Toast:playerClaimed', { name: 'Mika', hero: names.vashti })),
    ).toBeVisible();
  },
});

export const PresenceToastsInOrder = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    await rowOf(canvasElement, names.aldric);
    api.announce(COMBAT_ID, { type: 'playerJoined' });
    await api.playAs(JONAS).leave(COMBAT_ID);
    await expect(await canvas.findByText(t('Toast:playerJoined'))).toBeVisible();
    await dismissToast(canvas, t);
    await expect(await canvas.findByText(t('Toast:playerLeft', { name: 'Jonas' }))).toBeVisible();
    await dismissToast(canvas, t);
    await waitFor(() =>
      expect(canvas.queryByText(t('Toast:playerLeft', { name: 'Jonas' }))).toBeNull(),
    );
    await expect(
      canvas.queryByText(t('Toast:playerReleased', { name: 'Jonas', hero: names.aldric })),
    ).toBeNull();
  },
});

export const SeveralReleasesOneToastEach = meta.story({
  tags: ['!dev'],
  loaders: [heldDocumentsLoader],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    const { hold, release } = heldDocumentsOf(loaded);
    await rowOf(canvasElement, names.aldric);
    hold();
    await actAsPlayer(api, JONAS, { type: 'releaseUnit', unitId: unitIds.aldric });
    await actAsPlayer(api, MIKA, { type: 'releaseUnit', unitId: unitIds.vashti });
    release();
    await expect(
      await canvas.findByText(t('Toast:playerReleased', { name: 'Jonas', hero: names.aldric })),
    ).toBeVisible();
    await dismissToast(canvas, t);
    await expect(
      await canvas.findByText(t('Toast:playerReleased', { name: 'Mika', hero: names.vashti })),
    ).toBeVisible();
  },
});

export const DmReleaseShowsNoToast = meta.story({
  name: 'DM Release Shows No Toast',
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.vashti, t);
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('UnitRow:releaseClaim') }));
    await waitFor(async () =>
      expect(within(await rowOf(canvasElement, names.vashti)).queryByText('@Mika')).toBeNull(),
    );
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
    ]);
    await actAsPlayer(fakeApiOf(loaded), JONAS, { type: 'releaseUnit', unitId: unitIds.aldric });
    await expect(
      await canvas.findByText(t('Toast:playerReleased', { name: 'Jonas', hero: names.aldric })),
    ).toBeVisible();
    await dismissToast(canvas, t);
    await expect(
      canvas.queryByText(t('Toast:playerReleased', { name: 'Mika', hero: names.vashti })),
    ).toBeNull();
  },
});

const loadingLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  api.combats.open = () => new Promise(() => undefined);
  api.combats.subscribe = () => () => {};
  return { api };
};

export const Loading = meta.story({
  tags: ['visual'],
  loaders: [loadingLoader],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expect(await canvas.findByRole('button', { name: t('PageHeader:back') })).toBeVisible();
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-card-skeleton]')?.children).toHaveLength(5),
    );
    await expect(rowsOf(canvasElement)).toHaveLength(0);
  },
});

export const ShareWaitsForLink = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openMenu(canvas, t);
    fakeApiOf(loaded).holdNext();
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:share') }));
    const busy = canvas.getByRole('button', { name: t('CombatHeader:menu') });
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
    await expect(canvas.queryByRole('dialog', { name: t('ShareSheet:title') })).toBeNull();
  },
});

export const UndoWaits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await damageOrc(canvas, canvasElement, '12', t);
    const menu = await openMenu(canvas, t);
    const undo = within(menu).getByRole('menuitem', { name: t('Toast:undo') });
    await waitFor(() => expect(undo).toBeEnabled());
    fakeApiOf(loaded).holdNext();
    await userEvent.click(undo);
    const busy = canvas.getByRole('button', { name: t('CombatHeader:menu') });
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
  },
});

export const SaveAsPresetWaits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    fakeApiOf(loaded).holdNext();
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:saveAsPreset') }));
    const row = await rowOf(canvasElement, names.orc);
    const busy = within(row).getByRole('button', { name: t('CardActions:more') });
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
  },
});

export const ReleaseWaits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.vashti, t);
    fakeApiOf(loaded).holdNext();
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('UnitRow:releaseClaim') }));
    const row = await rowOf(canvasElement, names.vashti);
    const busy = within(row).getByRole('button', { name: t('CardActions:more') });
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
    await expect(within(row).getByText('@Mika')).toBeVisible();
  },
});

export const HeaderScrollsWithList = meta.story({
  tags: ['!dev'],
  parameters: { geometry: longNameBreak, scenario: longScenario() },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const header = await canvas.findByRole('banner');
    const first = await rowOf(canvasElement, 'Flussbrückenwächterin Adelheid von Stein');
    const viewport = first.closest<HTMLElement>('[data-scrollarea-viewport]');
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const strip = canvasElement.querySelector<HTMLElement>('[data-status-strip]');
    if (!viewport || !frame || !strip) throw new Error('The combat screen parts are missing');
    await expect(viewport).toContainElement(header);
    viewport.scrollTop = header.getBoundingClientRect().height + 40;
    await waitFor(() =>
      expect(header.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        viewport.getBoundingClientRect().top,
      ),
    );
    const edge = frame.getBoundingClientRect();
    await expect(strip.getBoundingClientRect().top).toBe(edge.top);
    await expect(strip.getBoundingClientRect().height).toBe(layout.statusBar);
    const bar = (await nextTurnButton(canvas, t)).parentElement!;
    await expect(bar.getBoundingClientRect().bottom).toBe(edge.bottom);
  },
});
