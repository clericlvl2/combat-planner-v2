import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { ApiError } from '@combat-planner/api/client';
import type { Action } from '@combat-planner/domain';
import type { Loader } from '@storybook/react-vite';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { FakeApiClient } from '../../api/FakeApiClient.ts';
import type { Scenario } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import {
  COMBAT_ID,
  MISSING_COMBAT_ID,
  STORY_ORIGIN,
  libraryPresets,
  longScenario,
  noUnitsScenario,
  rolls,
  roster,
  rosterUnits,
  runningScenario,
  setupScenario,
  unitIds,
} from './CombatScreen.scenarios.ts';
import { CombatScreen } from './CombatScreen.tsx';
import { anyValue, storyT } from '../../storybook/storyT.ts';

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

const expand = async (canvasElement: HTMLElement, name: string, t: TFunction) => {
  const row = await rowOf(canvasElement, name);
  await userEvent.click(within(row).getByRole('button', { name: t('UnitRow:details') }));
  await expect(within(row).getByRole('button', { name: t('UnitRow:details') })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  return row;
};

const openRowMenu = async (
  canvas: Canvas,
  canvasElement: HTMLElement,
  name: string,
  t: TFunction,
) => {
  const row = await expand(canvasElement, name, t);
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
  await userEvent.click(await canvas.findByRole('button', { name: t('PlayerHeader:menu') }));
  return canvas.findByRole('menu', { name: t('CombatHeader:menuLabel') });
};

const pickMenu = async (canvas: Canvas, item: string, t: TFunction) => {
  const menu = await openMenu(canvas, t);
  await userEvent.click(within(menu).getByRole('menuitem', { name: item }));
};

const nextTurnButton = (canvas: Canvas, t: TFunction) =>
  canvas.findByRole('button', { name: (label: string) => label.startsWith(t('TurnBar:nextTurn')) });

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
  const list = first.parentElement;
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

export const CSF11 = meta.story({
  tags: ['visual'],
  name: 'CS-F1.1 Empty combat',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await expect(
      await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') }),
    ).toBeVisible();
    const start = await startButton(canvas, t);
    await expect(start).toBeDisabled();
    await expect(start).toHaveTextContent(t('TurnBar:addUnitFirst'));
    await expect(canvas.getByText(t('Chip:setup'))).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'combats.open')).toHaveLength(1);
  },
});

export const CSF12 = meta.story({
  tags: ['visual'],
  name: 'CS-F1.2 New unit: empty form',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') });
    await userEvent.click(canvas.getByRole('button', { name: t('Menu:addUnit') }));
    const form = await canvas.findByRole('dialog', { name: t('Menu:addUnit') });
    await expect(within(form).getByRole('textbox', { name: t('UnitForm:name') })).toHaveAttribute(
      'placeholder',
      t('UnitForm:defaultName', { role: t('UnitForm:enemy'), n: 1 }),
    );
    await expect(within(form).getByText(t('UnitForm:hintSetup'))).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF13 = meta.story({
  name: 'CS-F1.3 From Library: filter by tag, pick',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') });
    await userEvent.click(canvas.getByRole('button', { name: t('Menu:addUnit') }));
    await userEvent.click(await canvas.findByRole('radio', { name: t('UnitForm:library') }));
    await userEvent.click(
      canvas.getByRole('button', { name: (label: string) => label.startsWith(t('UnitForm:tags')) }),
    );
    await userEvent.click(await canvas.findByRole('checkbox', { name: /^Orcs/ }));
    await userEvent.click(
      canvas.getByRole('button', { name: t('TagSheet:showPresets', { count: 2 }) }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('TagSheet:filterTitle') })).toBeNull(),
    );
    const list = within(canvas.getByRole('group', { name: t('UnitForm:presets') }));
    await expect(list.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(
      list.getByRole('button', {
        name: (label: string) => label.startsWith(`${t('UnitForm:enemy')} Orc Berserker`),
      }),
    );
    await expect(
      canvas.getByRole('button', { name: t('UnitForm:addPreset', { name: 'Orc Berserker' }) }),
    ).toBeEnabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF14 = meta.story({
  name: 'CS-F1.4 Roster ready, in order added',
  parameters: { scenario: setupScenario() },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await rowOf(canvasElement, names.shadow);
    await expect(orderOf(canvasElement, rosterOrder)).toEqual(rosterOrder);
    const start = await startButton(canvas, t);
    await expect(start).toBeEnabled();
    await expect(start).toHaveTextContent(t('TurnBar:rollsMissingInitiative'));
    await expect(
      canvas.queryByRole('button', {
        name: anyValue((round) => t('CombatHeader:editRound', { round })),
      }),
    ).toBeNull();
  },
});

export const CSF15 = meta.story({
  name: 'CS-F1.5 Initiative: roll or ±',
  parameters: { scenario: setupScenario() },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const orc = await rowOf(canvasElement, names.orc);
    await userEvent.click(within(orc).getByRole('button', { name: t('UnitRow:rollInitiative') }));
    const popover = await canvas.findByRole('dialog', { name: t('InitiativePopover:title') });
    await expect(
      within(popover).getByRole('button', { name: t('InitiativePopover:roll', { bonus: '+0' }) }),
    ).toBeVisible();
  },
});

export const CSF16 = meta.story({
  tags: ['visual'],
  name: 'CS-F1.6 Combat started: round 1',
  parameters: { scenario: setupScenario() },
  args: { random: rolls(setupRolls) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await startButton(canvas, t));
    await expect(
      await canvas.findByRole('button', { name: t('CombatHeader:editRound', { round: 1 }) }),
    ).toBeVisible();
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

export const CSF21 = meta.story({
  name: 'CS-F2.1 Vashti’s turn',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
    const next = await nextTurnButton(canvas, t);
    await expect(next).toHaveTextContent(names.tomas);
    next.focus();
    await expect(next).toHaveFocus();
  },
});

export const CSF22 = meta.story({
  name: 'CS-F2.2 Brother Tomas’s turn',
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
    await expect(
      canvas.getByRole('button', { name: t('CombatHeader:editRound', { round: 3 }) }),
    ).toBeVisible();
  },
});

export const CSF23 = meta.story({
  tags: ['visual'],
  name: 'CS-F2.3 Round 4, escalation 3',
  parameters: { scenario: runningScenario({ active: 'tomas' }) },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await nextTurnButton(canvas, t));
    await expect(
      await canvas.findByRole('button', { name: t('CombatHeader:editRound', { round: 4 }) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('CombatHeader:setEscalation', { value: 3 }) }),
    ).toBeVisible();
    await expect(await rowOf(canvasElement, names.aldric)).toHaveAttribute('data-active');
    await expect(await nextTurnButton(canvas, t)).toHaveTextContent(names.orc);
  },
});

export const CSF24 = meta.story({
  name: 'CS-F2.4 Round 99',
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

export const CSF25 = meta.story({
  name: 'CS-F2.5 All units disabled',
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

export const CSF31 = meta.story({
  name: 'CS-F3.1 Tap Orc Berserker’s HP',
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const hp = await hpOf(canvasElement, names.orc, /^14 \/40/);
    hp.focus();
    await expect(hp).toHaveFocus();
    await expect(hp).toHaveAccessibleName(new RegExp(t('HpBox:staggered')));
  },
});

export const CSF32 = meta.story({
  tags: ['visual'],
  name: 'CS-F3.2 Calculator open',
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

export const CSF33 = meta.story({
  name: 'CS-F3.3 Damage 12: preview',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    await expect(within(sheet).getByRole('button', { name: t('HistoryRow:damage') })).toBeEnabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF34 = meta.story({
  name: 'CS-F3.4 Orc Staggered, row flashes',
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
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.orc)).toHaveAttribute('data-flash'),
    );
  },
});

export const CSF35 = meta.story({
  name: 'CS-F3.5 Heal 8 on Vashti',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.vashti, /^20 \/36/);
    await typeAmount(sheet, '8');
    const heal = within(sheet).getByRole('button', { name: t('HistoryRow:heal') });
    heal.focus();
    await expect(heal).toHaveFocus();
    await expect(within(sheet).getByText('28')).toBeVisible();
  },
});

export const CSF36 = meta.story({
  name: 'CS-F3.6 Set Temp 5',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '5');
    const setTemp = within(sheet).getByRole('button', { name: t('NumpadSheet:setTemp') });
    setTemp.focus();
    await expect(setTemp).toHaveFocus();
    await expect(within(sheet).getByText(t('NumpadSheet:temp', { amount: 5 }))).toBeVisible();
  },
});

export const CSF37 = meta.story({
  name: 'CS-F3.7 Damage 8 with 5 temp',
  parameters: { scenario: runningScenario({ units: rosterUnits({ orc: { tempHp: 5 } }) }) },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    await expect(within(sheet).getByRole('button', { name: t('HistoryRow:damage') })).toBeEnabled();
  },
});

export const CSF38 = meta.story({
  name: 'CS-F3.8 Set Max 30',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '30');
    const setMax = within(sheet).getByRole('button', { name: t('NumpadSheet:setMax') });
    setMax.focus();
    await expect(setMax).toHaveFocus();
    await expect(within(sheet).getByText('/30')).toBeVisible();
  },
});

export const CSF39 = meta.story({
  tags: ['visual'],
  name: 'CS-F3.9 HP History open',
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

export const CSF41 = meta.story({
  tags: ['visual'],
  name: 'CS-F4.1 Vashti expanded',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expand(canvasElement, names.vashti, t);
    await expect(canvas.getByRole('button', { name: t('PlayerRow:conditions') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('PlayerRow:hpHistory') })).toBeVisible();
  },
});

export const CSF42 = meta.story({
  tags: ['visual'],
  name: 'CS-F4.2 Condition list',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expand(canvasElement, names.vashti, t);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    await expect(within(sheet).getByRole('checkbox', { name: t('Chip:dazed') })).toBeChecked();
    await expect(
      within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }),
    ).not.toBeChecked();
  },
});

export const CSF43 = meta.story({
  name: 'CS-F4.3 Editing the note',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.vashti, t);
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

export const CSF44 = meta.story({
  name: 'CS-F4.4 Chips and note in the row',
  parameters: {
    scenario: runningScenario({
      units: rosterUnits({ vashti: { conditions: ['dazed', 'weakened'] } }),
    }),
  },
  play: async ({ canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.vashti, t);
    await typeNote(row, 'Hex on Orc Berserker', t);
    await userEvent.click(within(row).getByRole('button', { name: t('UnitRow:details') }));
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

export const CSF45 = meta.story({
  name: 'CS-F4.5 HP History sheet',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expand(canvasElement, names.vashti, t);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:hpHistory') }));
    const sheet = await canvas.findByRole('dialog', {
      name: (label: string) => label.includes(t('HpHistory:title')),
    });
    await expect(within(sheet).getByText(/Vashti the Hexer/)).toBeVisible();
  },
});

export const CSF51 = meta.story({
  tags: ['visual'],
  name: 'CS-F5.1 Round: popover',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(
      await canvas.findByRole('button', { name: t('CombatHeader:editRound', { round: 3 }) }),
    );
    const popover = await canvas.findByRole('dialog', { name: t('Menu:round') });
    await expect(within(popover).getByRole('spinbutton')).toHaveValue('3');
  },
});

export const CSF52 = meta.story({
  name: 'CS-F5.2 Escalation: popover',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(
      await canvas.findByRole('button', { name: t('CombatHeader:editRound', { round: 3 }) }),
    );
    const popover = await canvas.findByRole('dialog', { name: t('Menu:round') });
    await userEvent.click(within(popover).getByRole('button', { name: t('Stepper:increase') }));
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'editRound', round: 4 }),
      ]),
    );
    await userEvent.click(
      canvas.getByRole('button', {
        name: anyValue((value) => t('CombatHeader:setEscalation', { value })),
      }),
    );
    await expect(
      await canvas.findByRole('dialog', { name: t('CombatHeader:escalationTitle') }),
    ).toBeVisible();
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
  },
});

export const CSF53 = meta.story({
  name: 'CS-F5.3 Round 4, escalation 3',
  parameters: { scenario: runningScenario({ round: 4 }) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(
      await canvas.findByRole('button', { name: t('CombatHeader:setEscalation', { value: 2 }) }),
    );
    const popover = await canvas.findByRole('dialog', { name: t('CombatHeader:escalationTitle') });
    await userEvent.click(
      within(popover).getByRole('button', { name: t('CombatHeader:escalationFace', { value: 3 }) }),
    );
    await expect(
      await canvas.findByRole('button', { name: t('CombatHeader:setEscalation', { value: 3 }) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('CombatHeader:editRound', { round: 4 }) }),
    ).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'setEscalation', escalation: 3 }),
    ]);
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
  },
});

export const CSF61 = meta.story({
  name: 'CS-F6.1 Orc expanded: Edit and ⋯',
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.orc, t);
    await expect(within(row).getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(within(row).getByRole('button', { name: t('CardActions:more') })).toBeVisible();
  },
});

export const CSF62 = meta.story({
  name: 'CS-F6.2 Editing the unit',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.orc, t);
    await userEvent.click(within(row).getByRole('button', { name: t('CardActions:edit') }));
    const form = await canvas.findByRole('dialog', { name: t('UnitForm:editTitle') });
    await expect(within(form).getByRole('textbox', { name: t('UnitForm:name') })).toHaveValue(
      names.orc,
    );
    await expect(within(form).queryByRole('radio', { name: t('UnitForm:library') })).toBeNull();
  },
});

export const CSF63 = meta.story({
  name: 'CS-F6.3 Saved as preset from ⋯',
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

export const CSF64 = meta.story({
  tags: ['visual'],
  name: 'CS-F6.4 Confirm removal',
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

export const CSF65 = meta.story({
  name: 'CS-F6.5 Unit removed, can be undone',
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

export const CSF66 = meta.story({
  name: 'CS-F6.6 Duplicate: copy below the original',
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
    await waitFor(() => expect(copy).toHaveAttribute('data-flash'));
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'duplicateUnit', unitId: unitIds.orc }),
    ]);
  },
});

export const CSF67 = meta.story({
  name: 'CS-F6.7 Disable: the orc skips turns',
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
      within(await rowOf(canvasElement, names.orc)).getByRole('button', {
        name: t('UnitRow:details'),
      }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
});

export const CSF71 = meta.story({
  tags: ['visual'],
  name: 'CS-F7.1 Menu open',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await damageOrc(canvas, canvasElement, '12', t);
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    const menu = await openMenu(canvas, t);
    await expect(within(menu).getByRole('menuitem', { name: t('Toast:undo') })).toBeEnabled();
    await expect(within(menu).getByRole('menuitem', { name: t('Menu:restart') })).toBeVisible();
  },
});

export const CSF72 = meta.story({
  name: 'CS-F7.2 Last action undone',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await damageOrc(canvas, canvasElement, '12', t);
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    await pickMenu(canvas, t('Toast:undo'), t);
    await expect(
      await canvas.findByText(t('CombatScreen:undoDamage', { amount: 12, name: 'Orc Berserker' })),
    ).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded)).map((action) => action.type)).toEqual([
      'damage',
      'undo',
    ]);
  },
});

export const CSF73 = meta.story({
  tags: ['visual'],
  name: 'CS-F7.3 Link and QR',
  parameters: {
    geometry: {
      truncation: {
        reason: 'the player link ends with an ellipsis by design',
        except: '[data-url]',
      },
    },
  },
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

export const CSF74 = meta.story({
  name: 'CS-F7.4 Link copied',
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

export const CSF75 = meta.story({
  name: 'CS-F7.5 Revoke link',
  parameters: {
    geometry: {
      truncation: {
        reason: 'the player link ends with an ellipsis by design',
        except: '[data-url]',
      },
    },
  },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openShare(canvas, t);
    await userEvent.click(within(sheet).getByRole('button', { name: t('ShareSheet:reissue') }));
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:revokeTitle') });
    await expect(within(dialog).getByRole('button', { name: t('Dialog:revoke') })).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'link.reissue')).toHaveLength(0);
  },
});

export const CSF76 = meta.story({
  name: 'CS-F7.6 Restart combat',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:restart'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:restartTitle') });
    await expect(within(dialog).getByRole('button', { name: t('Dialog:restart') })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF77 = meta.story({
  name: 'CS-F7.7 After Restart: Setup',
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

export const CSF78 = meta.story({
  name: 'CS-F7.8 Clear combat',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:clear'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:clearTitle') });
    await expect(within(dialog).getByText(t('Dialog:clearBody', { count: 6 }))).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF79 = meta.story({
  name: 'CS-F7.9 After Clear: empty combat',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await pickMenu(canvas, t('Menu:clear'), t);
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:clearTitle') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Button:clear') }));
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

export const CSF81 = meta.story({
  tags: ['visual'],
  name: 'CS-F8.1 Long list, scrolled, 6 languages',
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

export const CSF82 = meta.story({
  name: 'CS-F8.2 99-unit limit',
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

export const CSF83 = meta.story({
  tags: ['visual'],
  name: 'CS-F8.3 Request failed',
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
    await expect(await rowOf(canvasElement, names.orc)).not.toHaveAttribute('data-flash');
  },
});

export const ExtraRetry = meta.story({
  name: 'Extra: Retry resends the same action',
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

export const ExtraNoChangeBeforeDocument = meta.story({
  name: 'Extra: nothing changes before the document comes back',
  loaders: [heldLoader],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(await rowOf(canvasElement, names.orc)).not.toHaveAttribute('data-flash');
    releaseOf(loaded)();
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
  },
});

export const ExtraHpRules = meta.story({
  name: 'Extra: damage, heal, Set Temp and Set Max follow the rules',
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
    await apply(/^11 \/30/, '50', t('HistoryRow:heal'));
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

export const ExtraAddUnits = meta.story({
  name: 'Extra: add a new unit and a preset',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    await canvas.findByRole('heading', { name: t('EmptyState:noUnitsTitle') });
    await userEvent.click(canvas.getByRole('button', { name: t('Menu:addUnit') }));
    const form = await canvas.findByRole('dialog', { name: t('Menu:addUnit') });
    await userEvent.click(within(form).getByRole('button', { name: t('Menu:addUnit') }));
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

export const ExtraEditSaved = meta.story({
  name: 'Extra: Edit saves through editUnit',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const row = await expand(canvasElement, names.orc, t);
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

export const ExtraRemoveUndone = meta.story({
  name: 'Extra: Undo in the removal toast',
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
      await canvas.findByText(t('CombatScreen:undoRemoveUnit', { name: 'Orc Berserker' })),
    ).toBeVisible();
    await rowOf(canvasElement, names.orc);
    await expect(dispatched(fakeApiOf(loaded)).map((action) => action.type)).toEqual([
      'removeUnit',
      'undo',
    ]);
  },
});

export const ExtraRemoveUndoAfterNextTurn = meta.story({
  name: 'Extra: Undo in the removal toast after Next turn changes nothing',
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

export const ExtraRevokeConfirmed = meta.story({
  name: 'Extra: Revoke reissues the link after confirm',
  parameters: {
    geometry: {
      truncation: {
        reason: 'the player link ends with an ellipsis by design',
        except: '[data-url]',
      },
    },
  },
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

export const ExtraUndoDisabled = meta.story({
  name: 'Extra: Undo disabled with nothing to undo',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openMenu(canvas, t);
    await expect(within(menu).getByRole('menuitem', { name: t('Toast:undo') })).toBeDisabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const ExtraNotFound = meta.story({
  name: 'Extra: combat not found',
  args: { combatId: MISSING_COMBAT_ID },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await expect(
      await canvas.findByRole('heading', { name: t('CombatNotFound:title') }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('CombatNotFound:goToCombats') }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const ExtraCantReachServer = meta.story({
  name: 'Extra: first load without a response',
  loaders: [offlineLoader],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const retry = await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') });
    await expect(
      canvas.getByRole('heading', { name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await userEvent.click(retry);
    await expect(
      await canvas.findByRole('button', { name: t('CombatHeader:editRound', { round: 3 }) }),
    ).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'combats.open')).toHaveLength(1);
  },
});

export const ExtraBack = meta.story({
  name: 'Extra: back to the combat list',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatScreen');
    await userEvent.click(await canvas.findByRole('button', { name: t('CombatHeader:back') }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const ExtraUndoFromDocument = meta.story({
  name: 'Extra: Undo comes from the document after a reload',
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
      t('CombatScreen:undoDamage', { amount: 12, name: 'Orc Berserker' }),
    );
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
  },
});

export const ExtraDocumentAfterPost = meta.story({
  name: 'Extra: the document arrives after the POST',
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
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-flash'),
    );
  },
});

export const ExtraRapidTaps = meta.story({
  name: 'Extra: rapid condition taps build on the newest version',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const api = fakeApiOf(loaded);
    api.deferBroadcasts();
    const row = await expand(canvasElement, names.orc, t);
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

export const ExtraTapWhileFailureToast = meta.story({
  name: 'Extra: a tap while a failure toast is up runs at once',
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

export const ExtraDoubleNextTurnAfterFailure = meta.story({
  name: 'Extra: a double Next turn after a failure skips no turn',
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
    await expect(
      canvas.getByRole('button', { name: t('CombatHeader:editRound', { round: 4 }) }),
    ).toBeVisible();
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

export const ExtraUndoRemovalBeforeDocument = meta.story({
  name: 'Extra: Undo in the removal toast before the document arrives',
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
    await expect(await rowOf(canvasElement, names.orc)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('Toast:undo') }));
    await expect(
      await canvas.findByText(t('CombatScreen:undoRemoveUnit', { name: 'Orc Berserker' })),
    ).toBeVisible();
    const [removal, undo] = dispatched(fakeApiOf(loaded));
    await expect(removal).toMatchObject({ type: 'removeUnit', unitId: unitIds.orc });
    await expect(undo).toMatchObject({ type: 'undo', version: removal!.version + 1 });
    documents.release();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
  },
});

export const ExtraDuplicateAtLimit = meta.story({
  name: 'Extra: Duplicate disabled at the 99-unit limit',
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

export const ExtraSavePresetFails = meta.story({
  name: 'Extra: a failed Save as preset shows a toast',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    fakeApiOf(loaded).failNext('invalid');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:saveAsPreset') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('presetFailed'));
  },
});

export const ExtraSavePresetLimit = meta.story({
  name: 'Extra: Save as preset at the preset limit shows a toast',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openRowMenu(canvas, canvasElement, names.orc, t);
    fakeApiOf(loaded).failNext('limit');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:saveAsPreset') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:limitReached'));
  },
});

export const ExtraShareLinkFails = meta.story({
  name: 'Extra: Share with a failed link load shows a toast',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatScreen');
    const menu = await openMenu(canvas, t);
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(within(menu).getByRole('menuitem', { name: t('Menu:share') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('linkFailed'));
    await expect(canvas.queryByRole('dialog', { name: t('ShareSheet:title') })).toBeNull();
  },
});

export const ExtraSignedOut = meta.story({
  name: 'Extra: an expired session goes to sign-in',
  play: async ({ canvasElement, loaded }) => {
    await hpOf(canvasElement, names.orc, /^14 \/40/);
    fakeApiOf(loaded).expireSession();
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/auth/sign-in'));
  },
});
