import preview from '#.storybook/preview';
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

const hpOf = (canvasElement: HTMLElement, name: string, hp: RegExp): Promise<HTMLElement> =>
  waitFor(async () => within(await rowOf(canvasElement, name)).getByRole('button', { name: hp }));

const typeNote = async (row: HTMLElement, text: string) => {
  await userEvent.click(within(row).getByRole('button', { name: 'Note' }));
  await userEvent.type(within(row).getByRole('textbox', { name: 'Note' }), text);
};

const expand = async (canvasElement: HTMLElement, name: string) => {
  const row = await rowOf(canvasElement, name);
  await userEvent.click(within(row).getByRole('button', { name: 'Unit details' }));
  await expect(within(row).getByRole('button', { name: 'Unit details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  return row;
};

const openRowMenu = async (canvas: Canvas, canvasElement: HTMLElement, name: string) => {
  const row = await expand(canvasElement, name);
  await userEvent.click(within(row).getByRole('button', { name: 'More actions' }));
  return canvas.findByRole('menu', { name: `Actions for ${name}` });
};

const openNumpad = async (canvas: Canvas, canvasElement: HTMLElement, name: string, hp: RegExp) => {
  await userEvent.click(await hpOf(canvasElement, name, hp));
  return canvas.findByRole('dialog', { name });
};

const typeAmount = async (sheet: HTMLElement, digits: string) => {
  for (const digit of digits) {
    await userEvent.click(within(sheet).getByRole('button', { name: digit }));
  }
};

const openMenu = async (canvas: Canvas) => {
  await userEvent.click(await canvas.findByRole('button', { name: 'Menu' }));
  return canvas.findByRole('menu', { name: 'Combat menu' });
};

const pickMenu = async (canvas: Canvas, item: string) => {
  const menu = await openMenu(canvas);
  await userEvent.click(within(menu).getByRole('menuitem', { name: item }));
};

const nextTurnButton = (canvas: Canvas) => canvas.findByRole('button', { name: /^Next turn/ });

const startButton = (canvas: Canvas) => canvas.findByRole('button', { name: /^Start combat/ });

const damageOrc = async (canvas: Canvas, canvasElement: HTMLElement, amount: string) => {
  const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
  await typeAmount(sheet, amount);
  await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
  await waitFor(() => expect(canvas.queryByRole('dialog', { name: names.orc })).toBeNull());
};

const openShare = async (canvas: Canvas) => {
  await pickMenu(canvas, 'Share');
  return canvas.findByRole('dialog', { name: 'Share with players' });
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

const slowLoader: Loader = ({ parameters }) => ({
  api: new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 40 }),
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

export const CSF11 = meta.story({
  name: 'CS-F1.1 Empty combat',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, loaded }) => {
    await expect(await canvas.findByRole('heading', { name: 'No units yet' })).toBeVisible();
    const start = await startButton(canvas);
    await expect(start).toBeDisabled();
    await expect(start).toHaveTextContent('Add a unit first');
    await expect(canvas.getByText('Setup')).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'combats.open')).toHaveLength(1);
  },
});

export const CSF12 = meta.story({
  name: 'CS-F1.2 New unit: empty form',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, loaded }) => {
    await canvas.findByRole('heading', { name: 'No units yet' });
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    const form = await canvas.findByRole('dialog', { name: 'Add unit' });
    await expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'placeholder',
      'Enemy 1',
    );
    await expect(
      within(form).getByText('Initiative is rolled when the combat starts'),
    ).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF13 = meta.story({
  name: 'CS-F1.3 From Library: filter by tag, pick',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, loaded }) => {
    await canvas.findByRole('heading', { name: 'No units yet' });
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    await userEvent.click(await canvas.findByRole('radio', { name: 'From Library' }));
    await userEvent.click(canvas.getByRole('button', { name: /^Tags/ }));
    await userEvent.click(await canvas.findByRole('checkbox', { name: /^Orcs/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Show 2 presets' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Filter by tag' })).toBeNull());
    const list = within(canvas.getByRole('group', { name: 'Presets' }));
    await expect(list.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(list.getByRole('button', { name: /^Enemy Orc Berserker/ }));
    await expect(canvas.getByRole('button', { name: 'Add Orc Berserker' })).toBeEnabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF14 = meta.story({
  name: 'CS-F1.4 Roster ready, in order added',
  parameters: { scenario: setupScenario() },
  play: async ({ canvas, canvasElement }) => {
    await rowOf(canvasElement, names.shadow);
    await expect(orderOf(canvasElement, rosterOrder)).toEqual(rosterOrder);
    const start = await startButton(canvas);
    await expect(start).toBeEnabled();
    await expect(start).toHaveTextContent('Rolls missing initiative');
    await expect(canvas.queryByRole('button', { name: /^Edit round/ })).toBeNull();
  },
});

export const CSF15 = meta.story({
  name: 'CS-F1.5 Initiative: roll or ±',
  parameters: { scenario: setupScenario() },
  play: async ({ canvas, canvasElement }) => {
    const orc = await rowOf(canvasElement, names.orc);
    await userEvent.click(within(orc).getByRole('button', { name: 'Roll initiative' }));
    const popover = await canvas.findByRole('dialog', { name: 'Initiative' });
    await expect(within(popover).getByRole('button', { name: 'Roll d20 +0' })).toBeVisible();
  },
});

export const CSF16 = meta.story({
  name: 'CS-F1.6 Combat started: round 1',
  parameters: { scenario: setupScenario() },
  args: { random: rolls(setupRolls) },
  play: async ({ canvas, canvasElement, loaded }) => {
    await userEvent.click(await startButton(canvas));
    await expect(await canvas.findByRole('button', { name: 'Edit round, round 1' })).toBeVisible();
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
    await expect(await nextTurnButton(canvas)).toHaveTextContent(names.orc);
  },
});

export const CSF21 = meta.story({
  name: 'CS-F2.1 Vashti’s turn',
  play: async ({ canvas, canvasElement }) => {
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
    const next = await nextTurnButton(canvas);
    await expect(next).toHaveTextContent(names.tomas);
    next.focus();
    await expect(next).toHaveFocus();
  },
});

export const CSF22 = meta.story({
  name: 'CS-F2.2 Brother Tomas’s turn',
  play: async ({ canvas, canvasElement, loaded }) => {
    await userEvent.click(await nextTurnButton(canvas));
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'nextTurn' }),
      ]),
    );
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.tomas)).toHaveAttribute('data-active'),
    );
    await expect(await nextTurnButton(canvas)).toHaveTextContent('Ser Aldric · round 4');
    await expect(canvas.getByRole('button', { name: 'Edit round, round 3' })).toBeVisible();
  },
});

export const CSF23 = meta.story({
  name: 'CS-F2.3 Round 4, escalation 3',
  parameters: { scenario: runningScenario({ active: 'tomas' }) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await nextTurnButton(canvas));
    await expect(await canvas.findByRole('button', { name: 'Edit round, round 4' })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Set escalation die, escalation 3' }),
    ).toBeVisible();
    await expect(await rowOf(canvasElement, names.aldric)).toHaveAttribute('data-active');
    await expect(await nextTurnButton(canvas)).toHaveTextContent(names.orc);
  },
});

export const CSF24 = meta.story({
  name: 'CS-F2.4 Round 99',
  parameters: { scenario: runningScenario({ round: 99, escalation: 6, active: 'tomas' }) },
  play: async ({ canvas, loaded }) => {
    const next = await nextTurnButton(canvas);
    await expect(next).toBeDisabled();
    await expect(next).toHaveTextContent('Round 99 is the last');
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
  play: async ({ canvas, loaded }) => {
    const next = await nextTurnButton(canvas);
    await expect(next).toBeDisabled();
    await expect(next).toHaveTextContent('Every unit is disabled');
    await userEvent.click(next, { pointerEventsCheck: 0 });
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF31 = meta.story({
  name: 'CS-F3.1 Tap Orc Berserker’s HP',
  play: async ({ canvasElement }) => {
    const hp = await hpOf(canvasElement, names.orc, /^14 \/40/);
    hp.focus();
    await expect(hp).toHaveFocus();
    await expect(hp).toHaveAccessibleName(/Bloodied/);
  },
});

export const CSF32 = meta.story({
  name: 'CS-F3.2 Calculator open',
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await expect(within(sheet).getByRole('button', { name: 'Damage' })).toBeDisabled();
    await expect(within(sheet).getByRole('button', { name: 'Set Max' })).toBeDisabled();
  },
});

export const CSF33 = meta.story({
  name: 'CS-F3.3 Damage 12: preview',
  play: async ({ canvas, canvasElement, loaded }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    await expect(within(sheet).getByRole('button', { name: 'Damage' })).toBeEnabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF34 = meta.story({
  name: 'CS-F3.4 Orc Bloodied, row flashes',
  play: async ({ canvas, canvasElement, loaded }) => {
    await damageOrc(canvas, canvasElement, '12');
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'damage', unitId: unitIds.orc, amount: 12 }),
    ]);
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40 Bloodied/)).toBeVisible();
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.orc)).toHaveAttribute('data-flash'),
    );
  },
});

export const CSF35 = meta.story({
  name: 'CS-F3.5 Heal 8 on Vashti',
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.vashti, /^20 \/36/);
    await typeAmount(sheet, '8');
    await expect(within(sheet).getByRole('button', { name: 'Heal' })).toBeEnabled();
  },
});

export const CSF36 = meta.story({
  name: 'CS-F3.6 Set Temp 5',
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '5');
    await expect(within(sheet).getByRole('button', { name: 'Set Temp' })).toBeEnabled();
  },
});

export const CSF37 = meta.story({
  name: 'CS-F3.7 Damage 8 with 5 temp',
  parameters: { scenario: runningScenario({ units: rosterUnits({ orc: { tempHp: 5 } }) }) },
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    await expect(within(sheet).getByRole('button', { name: 'Damage' })).toBeEnabled();
  },
});

export const CSF38 = meta.story({
  name: 'CS-F3.8 Set Max 30',
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '30');
    await expect(within(sheet).getByRole('button', { name: 'Set Max' })).toBeEnabled();
  },
});

export const CSF39 = meta.story({
  name: 'CS-F3.9 HP History open',
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.vashti, /^20 \/36/);
    const toggle = within(sheet).getByRole('button', { name: /HP History/ });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  },
});

export const CSF41 = meta.story({
  name: 'CS-F4.1 Vashti expanded',
  play: async ({ canvas, canvasElement }) => {
    await expand(canvasElement, names.vashti);
    await expect(canvas.getByRole('button', { name: 'Conditions' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'HP History' })).toBeVisible();
  },
});

export const CSF42 = meta.story({
  name: 'CS-F4.2 Condition list',
  play: async ({ canvas, canvasElement }) => {
    await expand(canvasElement, names.vashti);
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Conditions' });
    await expect(within(sheet).getByRole('checkbox', { name: 'dazed' })).toBeChecked();
    await expect(within(sheet).getByRole('checkbox', { name: 'weakened' })).not.toBeChecked();
  },
});

export const CSF43 = meta.story({
  name: 'CS-F4.3 Editing the note',
  play: async ({ canvas, canvasElement, loaded }) => {
    const row = await expand(canvasElement, names.vashti);
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Conditions' });
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'weakened' }));
    await waitFor(() =>
      expect(within(sheet).getByRole('checkbox', { name: 'weakened' })).toBeChecked(),
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Conditions' })).toBeNull());
    await typeNote(row, 'Hex on Orc Berserker');
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
  play: async ({ canvasElement, loaded }) => {
    const row = await expand(canvasElement, names.vashti);
    await typeNote(row, 'Hex on Orc Berserker');
    await userEvent.click(within(row).getByRole('button', { name: 'Unit details' }));
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
    await expect(within(row).getByRole('list', { name: 'Conditions' })).toHaveTextContent(
      'dazedweakened',
    );
  },
});

export const CSF45 = meta.story({
  name: 'CS-F4.5 HP History sheet',
  play: async ({ canvas, canvasElement }) => {
    await expand(canvasElement, names.vashti);
    await userEvent.click(canvas.getByRole('button', { name: 'HP History' }));
    const sheet = await canvas.findByRole('dialog', { name: /HP History/ });
    await expect(within(sheet).getByText(/Vashti the Hexer/)).toBeVisible();
  },
});

export const CSF51 = meta.story({
  name: 'CS-F5.1 Round: popover',
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit round, round 3' }));
    const popover = await canvas.findByRole('dialog', { name: 'Round' });
    await expect(within(popover).getByRole('spinbutton')).toHaveValue('3');
  },
});

export const CSF52 = meta.story({
  name: 'CS-F5.2 Escalation: popover',
  play: async ({ canvas, canvasElement, loaded }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit round, round 3' }));
    const popover = await canvas.findByRole('dialog', { name: 'Round' });
    await userEvent.click(within(popover).getByRole('button', { name: 'Increase' }));
    await waitFor(() =>
      expect(dispatched(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'editRound', round: 4 }),
      ]),
    );
    await userEvent.click(canvas.getByRole('button', { name: /^Set escalation die/ }));
    await expect(await canvas.findByRole('dialog', { name: 'Escalation die' })).toBeVisible();
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
  },
});

export const CSF53 = meta.story({
  name: 'CS-F5.3 Round 4, escalation 3',
  parameters: { scenario: runningScenario({ round: 4 }) },
  play: async ({ canvas, canvasElement, loaded }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Set escalation die, escalation 2' }),
    );
    const popover = await canvas.findByRole('dialog', { name: 'Escalation die' });
    await userEvent.click(within(popover).getByRole('button', { name: 'Escalation 3' }));
    await expect(
      await canvas.findByRole('button', { name: 'Set escalation die, escalation 3' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit round, round 4' })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'setEscalation', escalation: 3 }),
    ]);
    await expect(await rowOf(canvasElement, names.vashti)).toHaveAttribute('data-active');
  },
});

export const CSF61 = meta.story({
  name: 'CS-F6.1 Orc expanded: Edit and ⋯',
  play: async ({ canvasElement }) => {
    const row = await expand(canvasElement, names.orc);
    await expect(within(row).getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(within(row).getByRole('button', { name: 'More actions' })).toBeVisible();
  },
});

export const CSF62 = meta.story({
  name: 'CS-F6.2 Editing the unit',
  play: async ({ canvas, canvasElement }) => {
    const row = await expand(canvasElement, names.orc);
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const form = await canvas.findByRole('dialog', { name: 'Edit unit' });
    await expect(within(form).getByRole('textbox', { name: 'Name' })).toHaveValue(names.orc);
    await expect(within(form).queryByRole('radio', { name: 'From Library' })).toBeNull();
  },
});

export const CSF63 = meta.story({
  name: 'CS-F6.3 Saved as preset from ⋯',
  play: async ({ canvas, canvasElement, loaded }) => {
    const menu = await openRowMenu(canvas, canvasElement, names.orc);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Save as preset' }));
    await expect(await canvas.findByText('Orc Berserker added to Library')).toBeVisible();
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
  name: 'CS-F6.4 Confirm removal',
  play: async ({ canvas, canvasElement, loaded }) => {
    const menu = await openRowMenu(canvas, canvasElement, names.orc);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Remove' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Remove Orc Berserker?' });
    await expect(within(dialog).getByRole('button', { name: 'Remove' })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF65 = meta.story({
  name: 'CS-F6.5 Unit removed, can be undone',
  play: async ({ canvas, canvasElement, loaded }) => {
    const menu = await openRowMenu(canvas, canvasElement, names.orc);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Remove' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Remove Orc Berserker?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await expect(await canvas.findByText('Orc Berserker removed')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Undo' })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'removeUnit', unitId: unitIds.orc }),
    ]);
    await waitFor(() => expect(orderOf(canvasElement, rosterOrder)).not.toContain(names.orc));
  },
});

export const CSF66 = meta.story({
  name: 'CS-F6.6 Duplicate: copy below the original',
  play: async ({ canvas, canvasElement, loaded }) => {
    const menu = await openRowMenu(canvas, canvasElement, names.orc);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }));
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
  play: async ({ canvas, canvasElement, loaded }) => {
    const menu = await openRowMenu(canvas, canvasElement, names.orc);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Disable' }));
    await waitFor(async () =>
      expect(await rowOf(canvasElement, names.orc)).toHaveAttribute('data-disabled'),
    );
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'setDisabled', unitId: unitIds.orc, disabled: true }),
    ]);
  },
});

export const CSF71 = meta.story({
  name: 'CS-F7.1 Menu open',
  play: async ({ canvas, canvasElement }) => {
    await damageOrc(canvas, canvasElement, '12');
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    const menu = await openMenu(canvas);
    await expect(within(menu).getByRole('menuitem', { name: 'Undo' })).toBeEnabled();
    await expect(within(menu).getByRole('menuitem', { name: 'Restart combat' })).toBeVisible();
  },
});

export const CSF72 = meta.story({
  name: 'CS-F7.2 Last action undone',
  play: async ({ canvas, canvasElement, loaded }) => {
    await damageOrc(canvas, canvasElement, '12');
    await hpOf(canvasElement, names.orc, /^2 \/40/);
    await pickMenu(canvas, 'Undo');
    await expect(await canvas.findByText('Undid: 12 damage to Orc Berserker')).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded)).map((action) => action.type)).toEqual([
      'damage',
      'undo',
    ]);
  },
});

export const CSF73 = meta.story({
  name: 'CS-F7.3 Link and QR',
  play: async ({ canvas, loaded }) => {
    const sheet = await openShare(canvas);
    await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'));
    await expect(
      within(sheet).getByText(`${STORY_ORIGIN}/combats/${COMBAT_ID}/play?t=${COMBAT_ID}.0.fake`),
    ).toBeVisible();
    await expect(
      within(sheet).getByRole('img', { name: 'QR code of the player link' }),
    ).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'link.get')).toHaveLength(1);
  },
});

export const CSF74 = meta.story({
  name: 'CS-F7.4 Link copied',
  play: async ({ canvas }) => {
    const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const sheet = await openShare(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Copy' }));
    await expect(await canvas.findByText('Link copied')).toBeVisible();
    await expect(writeText).toHaveBeenCalledWith(
      `${STORY_ORIGIN}/combats/${COMBAT_ID}/play?t=${COMBAT_ID}.0.fake`,
    );
    writeText.mockRestore();
  },
});

export const CSF75 = meta.story({
  name: 'CS-F7.5 Revoke link',
  play: async ({ canvas, loaded }) => {
    const sheet = await openShare(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Revoke and reissue link' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Revoke the link?' });
    await expect(within(dialog).getByRole('button', { name: 'Revoke' })).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'link.reissue')).toHaveLength(0);
  },
});

export const CSF76 = meta.story({
  name: 'CS-F7.6 Restart combat',
  play: async ({ canvas, loaded }) => {
    await pickMenu(canvas, 'Restart combat');
    const dialog = await canvas.findByRole('alertdialog', { name: 'Restart combat?' });
    await expect(within(dialog).getByRole('button', { name: 'Restart' })).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF77 = meta.story({
  name: 'CS-F7.7 After Restart: Setup',
  play: async ({ canvas, canvasElement, loaded }) => {
    await pickMenu(canvas, 'Restart combat');
    const dialog = await canvas.findByRole('alertdialog', { name: 'Restart combat?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restart' }));
    await expect(await startButton(canvas)).toBeEnabled();
    await expect(canvas.getByText('Setup')).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'restart' }),
    ]);
    await expect(await hpOf(canvasElement, names.orc, /^40 \/40/)).toBeVisible();
  },
});

export const CSF78 = meta.story({
  name: 'CS-F7.8 Clear combat',
  play: async ({ canvas, loaded }) => {
    await pickMenu(canvas, 'Clear combat');
    const dialog = await canvas.findByRole('alertdialog', { name: 'Clear combat?' });
    await expect(within(dialog).getByText(/All 6 units are removed/)).toBeVisible();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF79 = meta.story({
  name: 'CS-F7.9 After Clear: empty combat',
  play: async ({ canvas, loaded }) => {
    await pickMenu(canvas, 'Clear combat');
    const dialog = await canvas.findByRole('alertdialog', { name: 'Clear combat?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));
    await expect(await canvas.findByRole('heading', { name: 'No units yet' })).toBeVisible();
    await expect(await startButton(canvas)).toBeDisabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'clear' }),
    ]);
  },
});

export const CSF81 = meta.story({
  name: 'CS-F8.1 Long list, scrolled, 6 languages',
  parameters: { scenario: longScenario() },
  play: async ({ canvasElement }) => {
    await scrollList(canvasElement);
    await expect(
      await rowOf(canvasElement, '黒水の渡し守と呪われし大蛇の群れ'),
    ).toBeInTheDocument();
    await expect(
      await rowOf(canvasElement, 'Капитан стражи переправы Святослав Огнев'),
    ).toBeVisible();
  },
});

export const CSF82 = meta.story({
  name: 'CS-F8.2 99-unit limit',
  parameters: { scenario: longScenario(99) },
  play: async ({ canvas, canvasElement, loaded }) => {
    await scrollList(canvasElement);
    await pickMenu(canvas, 'Add unit');
    await expect(await canvas.findByText('This combat already has 99 units')).toBeVisible();
    await expect(canvas.queryByRole('dialog', { name: 'Add unit' })).toBeNull();
    await expect(rowsOf(canvasElement)).toHaveLength(99);
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const CSF83 = meta.story({
  name: 'CS-F8.3 Request failed',
  play: async ({ canvas, canvasElement, loaded }) => {
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await expect(
      await canvas.findByText('Couldn’t reach the server. Nothing changed.'),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(await rowOf(canvasElement, names.orc)).not.toHaveAttribute('data-flash');
  },
});

export const ExtraRetry = meta.story({
  name: 'Extra: Retry resends the same action',
  play: async ({ canvas, canvasElement, loaded }) => {
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '8');
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Retry' }));
    await expect(await hpOf(canvasElement, names.orc, /^6 \/40/)).toBeVisible();
    const [first, second] = dispatched(api);
    await expect(second?.id).toBe(first?.id);
    await expect(dispatched(api)).toHaveLength(2);
  },
});

export const ExtraNoChangeBeforeDocument = meta.story({
  name: 'Extra: nothing changes before the document comes back',
  loaders: [slowLoader],
  play: async ({ canvas, canvasElement }) => {
    const sheet = await openNumpad(canvas, canvasElement, names.orc, /^14 \/40/);
    await typeAmount(sheet, '12');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await expect(await hpOf(canvasElement, names.orc, /^14 \/40/)).toBeVisible();
    await expect(await hpOf(canvasElement, names.orc, /^2 \/40/)).toBeVisible();
  },
});

export const ExtraHpRules = meta.story({
  name: 'Extra: damage, heal, Set Temp and Set Max follow the rules',
  parameters: { scenario: runningScenario({ units: rosterUnits({ orc: { tempHp: 5 } }) }) },
  play: async ({ canvas, canvasElement }) => {
    const apply = async (hp: RegExp, digits: string, action: string) => {
      const sheet = await openNumpad(canvas, canvasElement, names.orc, hp);
      await typeAmount(sheet, digits);
      await userEvent.click(within(sheet).getByRole('button', { name: action }));
      await waitFor(() => expect(canvas.queryByRole('dialog', { name: names.orc })).toBeNull());
    };
    await apply(/^14 \/40/, '8', 'Damage');
    await expect(await hpOf(canvasElement, names.orc, /^11 \/40 Bloodied/)).toBeVisible();
    await apply(/^11 \/40/, '50', 'Heal');
    await expect(await hpOf(canvasElement, names.orc, /^40 \/40/)).toBeVisible();
    await apply(/^40 \/40/, '5', 'Set Temp');
    await apply(/^40 \/40/, '3', 'Set Temp');
    await expect(await hpOf(canvasElement, names.orc, /^40 \/40 \+3 temp/)).toBeVisible();
    await apply(/^40 \/40/, '30', 'Set Max');
    await expect(await hpOf(canvasElement, names.orc, /^30 \/30/)).toBeVisible();
  },
});

export const ExtraAddUnits = meta.story({
  name: 'Extra: add a new unit and a preset',
  parameters: { scenario: noUnitsScenario() },
  play: async ({ canvas, canvasElement, loaded }) => {
    await canvas.findByRole('heading', { name: 'No units yet' });
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    const form = await canvas.findByRole('dialog', { name: 'Add unit' });
    await userEvent.click(within(form).getByRole('button', { name: 'Add unit' }));
    await rowOf(canvasElement, 'Enemy 1');
    await pickMenu(canvas, 'Add unit');
    await userEvent.click(await canvas.findByRole('radio', { name: 'From Library' }));
    const list = within(canvas.getByRole('group', { name: 'Presets' }));
    await userEvent.click(list.getByRole('button', { name: /^Enemy Orc Shaman/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add Orc Shaman' }));
    await rowOf(canvasElement, 'Orc Shaman');
    const shaman = libraryPresets[1]!;
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'addUnit', name: 'Enemy 1', role: 'enemy', maxHp: 10 }),
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
  play: async ({ canvas, canvasElement, loaded }) => {
    const row = await expand(canvasElement, names.orc);
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const form = await canvas.findByRole('dialog', { name: 'Edit unit' });
    const name = within(form).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Orc Warlord');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));
    await rowOf(canvasElement, 'Orc Warlord');
    await expect(dispatched(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'editUnit', unitId: unitIds.orc, name: 'Orc Warlord' }),
    ]);
  },
});

export const ExtraRemoveUndone = meta.story({
  name: 'Extra: Undo in the removal toast',
  play: async ({ canvas, canvasElement, loaded }) => {
    const menu = await openRowMenu(canvas, canvasElement, names.orc);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Remove' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Remove Orc Berserker?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Undo' }));
    await expect(await canvas.findByText('Undid: Orc Berserker removed')).toBeVisible();
    await rowOf(canvasElement, names.orc);
    await expect(dispatched(fakeApiOf(loaded)).map((action) => action.type)).toEqual([
      'removeUnit',
      'undo',
    ]);
  },
});

export const ExtraRevokeConfirmed = meta.story({
  name: 'Extra: Revoke reissues the link after confirm',
  play: async ({ canvas, loaded }) => {
    const sheet = await openShare(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Revoke and reissue link' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Revoke the link?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
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
  play: async ({ canvas, loaded }) => {
    const menu = await openMenu(canvas);
    await expect(within(menu).getByRole('menuitem', { name: 'Undo' })).toBeDisabled();
    await expect(dispatched(fakeApiOf(loaded))).toEqual([]);
  },
});

export const ExtraNotFound = meta.story({
  name: 'Extra: combat not found',
  args: { combatId: MISSING_COMBAT_ID },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('heading', { name: 'Combat not found' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Go to combats' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const ExtraCantReachServer = meta.story({
  name: 'Extra: first load without a response',
  loaders: [offlineLoader],
  play: async ({ canvas, loaded }) => {
    const retry = await canvas.findByRole('button', { name: 'Try again' });
    await expect(canvas.getByRole('heading', { name: 'Can’t reach the server' })).toBeVisible();
    await userEvent.click(retry);
    await expect(await canvas.findByRole('button', { name: 'Edit round, round 3' })).toBeVisible();
    await expect(callsOf(fakeApiOf(loaded), 'combats.open')).toHaveLength(1);
  },
});

export const ExtraBack = meta.story({
  name: 'Extra: back to the combat list',
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Back to combats' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});
