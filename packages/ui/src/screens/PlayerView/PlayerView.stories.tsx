import preview from '#.storybook/preview';
import type { Action } from '@combat-planner/domain';
import type { Loader } from '@storybook/react-vite';
import { focusManager } from '@tanstack/react-query';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { FakeApiClient } from '../../api/FakeApiClient.ts';
import type { Scenario } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import {
  ALEX,
  COMBAT_ID,
  COMBAT_TITLE,
  ME,
  MIKA,
  TOKEN,
  actAsDm,
  claimAs,
  ferryCombat,
  playerScenario,
  unitIds,
} from './PlayerView.scenarios.ts';
import { PlayerView } from './PlayerView.tsx';

type Canvas = ReturnType<typeof within>;

const sentBy = (api: FakeApiClient): Action[] =>
  api.calls
    .filter((call) => call.method === 'play.dispatch' && call.args[1] === MIKA)
    .map((call) => call.args[2] as Action);

const rowOf = async (canvas: Canvas, name: string): Promise<HTMLElement> => {
  const label = await canvas.findByText(name);
  const row = label.closest('[data-unit-role]');
  if (!(row instanceof HTMLElement)) throw new Error(`${name} has no row`);
  return row;
};

const typeName = async (canvas: Canvas) => {
  await userEvent.type(await canvas.findByRole('textbox', { name: 'Your name' }), 'Mika');
};

const openNumpad = async (canvas: Canvas) => {
  const vashti = await rowOf(canvas, ME);
  await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
  return canvas.findByRole('dialog', { name: ME });
};

const expandOwn = async (canvas: Canvas) => {
  await userEvent.click(await canvas.findByRole('button', { name: ME }));
  await expect(canvas.getByRole('button', { name: ME })).toHaveAttribute('aria-expanded', 'true');
};

const joinScenario = playerScenario(ferryCombat({ status: 'setup', joined: false, ilse: true }));
const setupScenario = playerScenario(ferryCombat({ status: 'setup' }));
const orcTurn = playerScenario(ferryCombat({ active: 'orc' }));
const ownTurn = playerScenario(ferryCombat({ active: 'vashti' }));

const offlineLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  api.failNext('network');
  api.play.subscribe = () => () => {};
  return { api };
};

const heldEndLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  const subscribe = api.play.subscribe.bind(api.play);
  const ends: Array<() => void> = [];
  api.play.subscribe = (token, playerId, onDocument, onEnd) =>
    subscribe(token, playerId, onDocument, (event) => {
      ends.push(() => onEnd(event));
    });
  return {
    api,
    deliverEnds: () => {
      for (const end of ends.splice(0)) end();
    },
  };
};

const deliverEndsOf = (loaded: Record<string, unknown>): (() => void) => {
  const { deliverEnds } = loaded;
  if (typeof deliverEnds !== 'function') throw new Error('heldEndLoader is missing');
  return deliverEnds as () => void;
};

const refocus = () => {
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  focusManager.setFocused(undefined);
};

const meta = preview.meta({
  title: 'Screens/PlayerView',
  component: PlayerView,
  args: { combatId: COMBAT_ID, token: TOKEN, playerId: MIKA },
  parameters: { phoneFrame: { overlay: true }, scenario: ownTurn },
});

export const PVF11 = meta.story({
  name: 'PV-F1.1 Hero list',
  parameters: { scenario: joinScenario },
  play: async ({ canvas }) => {
    const name = await canvas.findByRole('textbox', { name: 'Your name' });
    name.focus();
    await expect(name).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeDisabled();
    await expect(canvas.getByText('Enter your name and pick a hero')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Ser Aldric' })).toBeDisabled();
  },
});

export const PVF12 = meta.story({
  name: 'PV-F1.2 Name entered, hero picked',
  parameters: { scenario: joinScenario },
  play: async ({ canvas, loaded }) => {
    await typeName(canvas);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await expect(canvas.getByRole('checkbox', { name: ME })).toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeEnabled();
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const PVF13 = meta.story({
  name: 'PV-F1.3 In the combat, waiting for the DM',
  parameters: {
    scenario: playerScenario(ferryCombat({ status: 'setup', joined: false })),
  },
  play: async ({ canvas, loaded }) => {
    await typeName(canvas);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await userEvent.click(canvas.getByRole('button', { name: 'Join' }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'claimUnit', unitId: unitIds.vashti, displayName: 'Mika' }),
      ]),
    );
    await expect(await canvas.findByText('Waiting for the DM to start the combat')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: ME })).toBeVisible();
  },
});

export const PVF14 = meta.story({
  name: 'PV-F1.4 Another player took Vashti',
  parameters: { scenario: joinScenario },
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await typeName(canvas);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await claimAs(api, ALEX, 'Alex', unitIds.vashti);
    await expect(await canvas.findByText('Vashti the Hexer was just taken')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: ME })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeDisabled();
    await expect(sentBy(api)).toEqual([]);
  },
});

export const PVF21 = meta.story({
  name: 'PV-F2.1 Own row without initiative',
  parameters: { scenario: setupScenario },
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    const role = within(vashti).getByRole('button', { name: /You$/ });
    await expect(within(role).getByRole('img', { name: 'No initiative' })).toBeVisible();
    await expect(canvas.getByText('Waiting for the DM to start the combat')).toBeVisible();
  },
});

export const PVF22 = meta.story({
  name: 'PV-F2.2 Roll or ±',
  parameters: { scenario: setupScenario },
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /You$/ }));
    const popover = await canvas.findByRole('dialog', { name: 'Initiative' });
    await expect(within(popover).getByRole('button', { name: /^Roll d20/ })).toBeVisible();
  },
});

export const PVF23 = meta.story({
  name: 'PV-F2.3 Initiative 15',
  parameters: { scenario: setupScenario },
  args: { random: () => 0.6 },
  play: async ({ canvas, loaded }) => {
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /You$/ }));
    const popover = await canvas.findByRole('dialog', { name: 'Initiative' });
    await userEvent.click(within(popover).getByRole('button', { name: /^Roll d20/ }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'rollInitiative', unitId: unitIds.vashti, roll: 13 }),
      ]),
    );
    await expect(await canvas.findByRole('button', { name: /^15 Hero You/ })).toBeVisible();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const PVF31 = meta.story({
  name: 'PV-F3.1 Another unit’s turn',
  parameters: { scenario: orcTurn },
  play: async ({ canvas }) => {
    const orc = await rowOf(canvas, 'Orc Berserker');
    await expect(orc).toHaveAttribute('data-active');
    await expect(orc.textContent).not.toMatch(/AC|14|40/);
    await expect(canvas.queryByText('影の射手ゴブリン')).toBeNull();
    await expect(canvas.getByRole('heading', { name: 'Round 3' })).toBeVisible();
  },
});

export const PVF32 = meta.story({
  name: 'PV-F3.2 Own turn',
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    await expect(vashti).toHaveAttribute('data-active');
    await expect(within(vashti).getByRole('button', { name: /^20 \/36/ })).toBeEnabled();
  },
});

export const PVF33 = meta.story({
  name: 'PV-F3.3 Damage 7',
  play: async ({ canvas, loaded }) => {
    const sheet = await openNumpad(canvas);
    await expect(within(sheet).queryByRole('button', { name: 'Set Max' })).toBeNull();
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    await expect(within(sheet).getByRole('button', { name: 'Damage' })).toBeEnabled();
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const PVF34 = meta.story({
  name: 'PV-F3.4 HP 13/36, Bloodied',
  play: async ({ canvas, loaded }) => {
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'damage', unitId: unitIds.vashti, amount: 7 }),
      ]),
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const vashti = await rowOf(canvas, ME);
    await expect(within(vashti).getByRole('button', { name: /^13 \/36 Bloodied/ })).toBeVisible();
    await expect(vashti).toHaveAttribute('data-flash');
  },
});

export const PVF35 = meta.story({
  name: 'PV-F3.5 Own row expanded',
  play: async ({ canvas }) => {
    await expandOwn(canvas);
    await expect(canvas.getByRole('button', { name: 'Conditions' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: 'More actions' })).toHaveLength(1);
  },
});

export const PVF36 = meta.story({
  name: 'PV-F3.6 Condition sheet',
  play: async ({ canvas }) => {
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Conditions' });
    await expect(within(sheet).getByRole('checkbox', { name: 'dazed' })).toBeChecked();
    await expect(within(sheet).getByRole('checkbox', { name: 'weakened' })).not.toBeChecked();
  },
});

export const PVF37 = meta.story({
  name: 'PV-F3.7 Editing the note',
  play: async ({ canvas, loaded }) => {
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: /^Note/ }));
    const note = await canvas.findByRole('textbox', { name: 'Note' });
    await userEvent.type(note, ', 2 rounds left');
    await expect(note).toHaveValue('Hex on Orc Berserker, 2 rounds left');
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const PVF41 = meta.story({
  name: 'PV-F4.1 Menu open',
  parameters: { scenario: orcTurn },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Menu' }));
    const items = await canvas.findAllByRole('menuitem');
    await expect(items.map((item) => item.textContent)).toEqual(['Heroes']);
  },
});

export const PVF42 = meta.story({
  name: 'PV-F4.2 Hero picker: Vashti is free',
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc', ilse: true })) },
  play: async ({ canvas, loaded }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Menu' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Heroes' }));
    await userEvent.click(await canvas.findByRole('checkbox', { name: ME }));
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: ME })).not.toBeChecked());
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked(),
    );
    await expect(sentBy(fakeApiOf(loaded))).toEqual([
      expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.ilse, displayName: 'Mika' }),
    ]);
    await expect(canvas.queryByText('The DM released Vashti the Hexer. Pick a hero.')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Done' })).toBeEnabled();
  },
});

export const PVF51 = meta.story({
  name: 'PV-F5.1 DM restarted the combat',
  play: async ({ canvas, loaded }) => {
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'restart' });
    await expect(await canvas.findByText('The DM restarted the combat')).toBeVisible();
    await expect(canvas.getByText('Waiting for the DM to start the combat')).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Setup' })).toBeVisible();
  },
});

export const PVF52 = meta.story({
  name: 'PV-F5.2 DM cleared the combat',
  play: async ({ canvas, loaded }) => {
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'clear' });
    await expect(await canvas.findByText('The DM cleared the combat')).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'No units yet' })).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: 'Your name' })).toBeNull();
  },
});

export const PVF53 = meta.story({
  name: 'PV-F5.3 Hero removed or released',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup', ilse: true })) },
  play: async ({ canvas, loaded }) => {
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(
      await canvas.findByText('The DM released Vashti the Hexer. Pick a hero.'),
    ).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Who are you playing?' })).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: ME })).not.toBeChecked();
  },
});

export const PVF54 = meta.story({
  name: 'PV-F5.4 Link revoked',
  play: async ({ canvas, loaded }) => {
    await rowOf(canvas, ME);
    await fakeApiOf(loaded).link.reissue(COMBAT_ID);
    await expect(
      await canvas.findByRole('heading', { name: 'This link no longer works' }),
    ).toBeVisible();
  },
});

export const PVF55 = meta.story({
  name: 'PV-F5.5 Combat deleted',
  play: async ({ canvas, loaded }) => {
    await rowOf(canvas, ME);
    await fakeApiOf(loaded).combats.remove(COMBAT_ID);
    await expect(
      await canvas.findByRole('heading', { name: `${COMBAT_TITLE} was deleted` }),
    ).toBeVisible();
  },
});

export const PVF56 = meta.story({
  name: 'PV-F5.6 Request failed',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await expect(
      await canvas.findByText('Couldn’t reach the server. Nothing changed.'),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible();
    const vashti = await rowOf(canvas, ME);
    await expect(within(vashti).getByRole('button', { name: /^20 \/36/ })).toBeVisible();
  },
});

export const ExtraDmRemoved = meta.story({
  name: 'Extra: DM removed the own hero',
  parameters: { scenario: orcTurn },
  play: async ({ canvas, loaded }) => {
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'removeUnit', unitId: unitIds.vashti });
    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent('The DM removed Vashti the Hexer. Pick a hero.');
    await expect(toast.querySelector('.tabler-icon-info-circle')).not.toBeNull();
    await expect(canvas.getByRole('heading', { name: 'Who are you playing?' })).toBeVisible();
    await expect(canvas.queryByRole('checkbox', { name: ME })).toBeNull();
  },
});

export const ExtraOwnRelease = meta.story({
  name: 'Extra: own release of the last hero opens Heroes',
  play: async ({ canvas, loaded }) => {
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Release claim' }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
      ]),
    );
    await expect(
      await canvas.findByRole('heading', { name: 'Who are you playing?' }),
    ).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: ME })).not.toBeChecked();
    await expect(canvas.queryByText(/The DM released/)).toBeNull();
  },
});

export const ExtraFailedReleaseThenDmRelease = meta.story({
  name: 'Extra: a failed own release does not hide a later DM release',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    api.failNext('version');
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Release claim' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'The combat changed. Try again.',
    );
    await expect(canvas.getByRole('button', { name: ME })).toBeVisible();
    await actAsDm(api, { type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(
      await canvas.findByRole('heading', { name: 'Who are you playing?' }),
    ).toBeVisible();
  },
});

export const ExtraNoteSaved = meta.story({
  name: 'Extra: note saved on blur',
  play: async ({ canvas, loaded }) => {
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: /^Note/ }));
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Note' }), ', 2 rounds left');
    await userEvent.tab();
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({
          type: 'editNote',
          unitId: unitIds.vashti,
          note: 'Hex on Orc Berserker, 2 rounds left',
        }),
      ]),
    );
  },
});

export const ExtraConditionToggled = meta.story({
  name: 'Extra: condition toggled',
  play: async ({ canvas, loaded }) => {
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Conditions' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Conditions' });
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'weakened' }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({
          type: 'toggleCondition',
          unitId: unitIds.vashti,
          condition: 'weakened',
        }),
      ]),
    );
    await waitFor(() =>
      expect(within(sheet).getByRole('checkbox', { name: 'weakened' })).toBeChecked(),
    );
  },
});

export const ExtraDeletedBeforeEnd = meta.story({
  name: 'Extra: a 404 refetch before the deleted end shows Combat deleted',
  loaders: [heldEndLoader],
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await rowOf(canvas, ME);
    await api.combats.remove(COMBAT_ID);
    refocus();
    const heading = await canvas.findByRole('heading', { name: `${COMBAT_TITLE} was deleted` });
    await expect(heading).toBeVisible();
    await expect(api.calls.filter((call) => call.method === 'play.get').length).toBeGreaterThan(1);
    deliverEndsOf(loaded)();
    await expect(
      await canvas.findByRole('heading', { name: `${COMBAT_TITLE} was deleted` }),
    ).toBeVisible();
  },
});

export const ExtraCantReachServer = meta.story({
  name: 'Extra: first load without a response',
  loaders: [offlineLoader],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Can’t reach the server' })).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: 'Round 3' })).toBeNull();
  },
});

export const ExtraCantReachServerRetry = meta.story({
  name: 'Extra: Try again after a first load without a response',
  loaders: [offlineLoader],
  play: async ({ canvas, loaded }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Try again' }));
    await expect(await canvas.findByRole('heading', { name: 'Round 3' })).toBeVisible();
    await expect(fakeApiOf(loaded).calls.filter((call) => call.method === 'play.get')).toHaveLength(
      2,
    );
  },
});

export const ExtraDmLanguage = meta.story({
  name: 'Extra: interface in the DM language',
  parameters: {
    scenario: playerScenario(ferryCombat({ status: 'setup' }), { settings: { language: 'de' } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Vorbereitung' })).toBeVisible();
    await expect(canvas.getByText('Warte, bis die Spielleitung den Kampf startet')).toBeVisible();
  },
});
