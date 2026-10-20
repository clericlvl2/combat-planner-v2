import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import type { ApiErrorCode } from '@combat-planner/api/client';
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
import { anyValue, storyT } from '../../storybook/storyT.ts';

type Canvas = ReturnType<typeof within>;

const playerT = (parameters: { scenario?: Scenario }) =>
  storyT({ locale: parameters.scenario?.settings.language }, 'PlayerView');

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

const typeName = async (canvas: Canvas, t: TFunction) => {
  await userEvent.type(await canvas.findByRole('textbox', { name: t('Heroes:nameLabel') }), 'Mika');
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

const firstLoadFails =
  (code: ApiErrorCode): Loader =>
  ({ parameters }) => {
    const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
    api.failNext(code);
    api.play.subscribe = () => () => {};
    return { api };
  };

const offlineLoader = firstLoadFails('network');

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
  tags: ['visual'],
  name: 'PV-F1.1 Hero list',
  parameters: { scenario: joinScenario },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    const name = await canvas.findByRole('textbox', { name: t('Heroes:nameLabel') });
    name.focus();
    await expect(name).toHaveFocus();
    await expect(canvas.getByRole('button', { name: t('Heroes:join') })).toBeDisabled();
    await expect(canvas.getByText(t('Heroes:hint'))).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Ser Aldric' })).toBeDisabled();
  },
});

export const PVF12 = meta.story({
  name: 'PV-F1.2 Name entered, hero picked',
  parameters: { scenario: joinScenario },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await typeName(canvas, t);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await expect(canvas.getByRole('checkbox', { name: ME })).toBeChecked();
    await expect(canvas.getByRole('button', { name: t('Heroes:join') })).toBeEnabled();
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const PVF13 = meta.story({
  tags: ['visual'],
  name: 'PV-F1.3 In the combat, waiting for the DM',
  parameters: {
    scenario: playerScenario(ferryCombat({ status: 'setup', joined: false })),
  },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await typeName(canvas, t);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await userEvent.click(canvas.getByRole('button', { name: t('Heroes:join') }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'claimUnit', unitId: unitIds.vashti, displayName: 'Mika' }),
      ]),
    );
    await expect(await canvas.findByText(t('TurnOrder:waiting'))).toBeVisible();
    await expect(await canvas.findByRole('button', { name: ME })).toBeVisible();
  },
});

export const PVF14 = meta.story({
  name: 'PV-F1.4 Another player took Vashti',
  parameters: { scenario: joinScenario },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    await typeName(canvas, t);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await claimAs(api, ALEX, 'Alex', unitIds.vashti);
    await expect(
      await canvas.findByText(t('Toast:heroTaken', { hero: 'Vashti the Hexer' })),
    ).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: ME })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: t('Heroes:join') })).toBeDisabled();
    await expect(sentBy(api)).toEqual([]);
  },
});

export const PVF21 = meta.story({
  tags: ['visual'],
  name: 'PV-F2.1 Own row without initiative',
  parameters: { scenario: setupScenario },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    const vashti = await rowOf(canvas, ME);
    const role = within(vashti).getByRole('button', {
      name: (label: string) => label.endsWith(t('RoleBlock:you')),
    });
    await expect(
      within(role).getByRole('img', { name: t('RoleBlock:noInitiative') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('TurnOrder:waiting'))).toBeVisible();
  },
});

export const PVF22 = meta.story({
  name: 'PV-F2.2 Roll or ±',
  parameters: { scenario: setupScenario },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(
      within(vashti).getByRole('button', {
        name: (label: string) => label.endsWith(t('RoleBlock:you')),
      }),
    );
    const popover = await canvas.findByRole('dialog', { name: t('InitiativePopover:title') });
    await expect(
      within(popover).getByRole('button', {
        name: anyValue((bonus) => t('InitiativePopover:roll', { bonus })),
      }),
    ).toBeVisible();
  },
});

export const PVF23 = meta.story({
  name: 'PV-F2.3 Initiative 15',
  parameters: { scenario: setupScenario },
  args: { random: () => 0.6 },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(
      within(vashti).getByRole('button', {
        name: (label: string) => label.endsWith(t('RoleBlock:you')),
      }),
    );
    const popover = await canvas.findByRole('dialog', { name: t('InitiativePopover:title') });
    await userEvent.click(
      within(popover).getByRole('button', {
        name: anyValue((bonus) => t('InitiativePopover:roll', { bonus })),
      }),
    );
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'rollInitiative', unitId: unitIds.vashti, roll: 13 }),
      ]),
    );
    await expect(
      await canvas.findByRole('button', {
        name: (label: string) =>
          label.startsWith(`15 ${t('RoleBlock:hero')} ${t('RoleBlock:you')}`),
      }),
    ).toBeVisible();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const PVF31 = meta.story({
  name: 'PV-F3.1 Another unit’s turn',
  parameters: { scenario: orcTurn },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    const orc = await rowOf(canvas, 'Orc Berserker');
    await expect(orc).toHaveAttribute('data-active');
    await expect(orc.textContent).not.toMatch(/AC|14|40/);
    await expect(canvas.queryByText('影の射手ゴブリン')).toBeNull();
    await expect(
      canvas.getByRole('heading', { name: t('PlayerHeader:round', { round: 3 }) }),
    ).toBeVisible();
  },
});

export const PVF32 = meta.story({
  tags: ['visual'],
  name: 'PV-F3.2 Own turn',
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    await expect(vashti).toHaveAttribute('data-active');
    await expect(within(vashti).getByRole('button', { name: /^20 \/36/ })).toBeEnabled();
  },
});

export const PVF33 = meta.story({
  name: 'PV-F3.3 Damage 7',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const sheet = await openNumpad(canvas);
    await expect(within(sheet).queryByRole('button', { name: t('NumpadSheet:setMax') })).toBeNull();
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    await expect(within(sheet).getByRole('button', { name: t('HistoryRow:damage') })).toBeEnabled();
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const PVF34 = meta.story({
  name: 'PV-F3.4 HP 13/36, Staggered',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'damage', unitId: unitIds.vashti, amount: 7 }),
      ]),
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const vashti = await rowOf(canvas, ME);
    await expect(
      within(vashti).getByRole('button', {
        name: (label: string) => label.startsWith(`13 /36 ${t('HpBox:staggered')}`),
      }),
    ).toBeVisible();
    await expect(vashti).toHaveAttribute('data-flash');
  },
});

export const PVF35 = meta.story({
  tags: ['visual'],
  name: 'PV-F3.5 Own row expanded',
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await expect(canvas.getByRole('button', { name: t('PlayerRow:conditions') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: t('CardActions:more') })).toHaveLength(1);
  },
});

export const PVF36 = meta.story({
  tags: ['visual'],
  name: 'PV-F3.6 Condition sheet',
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    await expect(within(sheet).getByRole('checkbox', { name: t('Chip:dazed') })).toBeChecked();
    await expect(
      within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }),
    ).not.toBeChecked();
  },
});

export const PVF37 = meta.story({
  name: 'PV-F3.7 Editing the note',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await userEvent.click(
      canvas.getByRole('button', {
        name: (label: string) => label.startsWith(t('NoteField:label')),
      }),
    );
    const note = await canvas.findByRole('textbox', { name: t('NoteField:label') });
    await userEvent.type(note, ', 2 rounds left');
    await expect(note).toHaveValue('Hex on Orc Berserker, 2 rounds left');
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const PVF41 = meta.story({
  name: 'PV-F4.1 Menu open',
  parameters: { scenario: orcTurn },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    await userEvent.click(await canvas.findByRole('button', { name: t('PlayerHeader:menu') }));
    const items = await canvas.findAllByRole('menuitem');
    await expect(items.map((item) => item.textContent)).toEqual([t('Menu:heroes')]);
  },
});

export const PVF42 = meta.story({
  name: 'PV-F4.2 Hero picker: Vashti is free',
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc', ilse: true })) },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await userEvent.click(await canvas.findByRole('button', { name: t('PlayerHeader:menu') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('Menu:heroes') }));
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
    await expect(
      canvas.queryByText(t('Toast:dmReleased', { hero: 'Vashti the Hexer' })),
    ).toBeNull();
    await expect(canvas.getByRole('button', { name: t('Sheet:done') })).toBeEnabled();
  },
});

export const PVF51 = meta.story({
  name: 'PV-F5.1 DM restarted the combat',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'restart' });
    await expect(await canvas.findByText(t('Toast:dmRestarted'))).toBeVisible();
    await expect(canvas.getByText(t('TurnOrder:waiting'))).toBeVisible();
    await expect(canvas.getByRole('heading', { name: t('Chip:setup') })).toBeVisible();
  },
});

export const PVF52 = meta.story({
  name: 'PV-F5.2 DM cleared the combat',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'clear' });
    await expect(await canvas.findByText(t('Toast:dmCleared'))).toBeVisible();
    await expect(canvas.getByRole('heading', { name: t('TurnOrder:noUnitsTitle') })).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: t('Heroes:nameLabel') })).toBeNull();
  },
});

export const PVF53 = meta.story({
  name: 'PV-F5.3 Hero removed or released',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup', ilse: true })) },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(
      await canvas.findByText(t('Toast:dmReleased', { hero: 'Vashti the Hexer' })),
    ).toBeVisible();
    await expect(canvas.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: ME })).not.toBeChecked();
  },
});

export const PVF54 = meta.story({
  name: 'PV-F5.4 Link revoked',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await rowOf(canvas, ME);
    await fakeApiOf(loaded).link.reissue(COMBAT_ID);
    await expect(
      await canvas.findByRole('heading', { name: t('MessageScreen:linkRevokedTitle') }),
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
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    api.failNext('network');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await canvas.findByText(t('Toast:serverUnreachable'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Toast:retry') })).toBeVisible();
    const vashti = await rowOf(canvas, ME);
    await expect(within(vashti).getByRole('button', { name: /^20 \/36/ })).toBeVisible();
  },
});

export const ExtraDmRemoved = meta.story({
  name: 'Extra: DM removed the own hero',
  parameters: { scenario: orcTurn },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'removeUnit', unitId: unitIds.vashti });
    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent(t('Toast:dmRemoved', { hero: 'Vashti the Hexer' }));
    await expect(toast.querySelector('.tabler-icon-info-circle')).not.toBeNull();
    await expect(canvas.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
    await expect(canvas.queryByRole('checkbox', { name: ME })).toBeNull();
  },
});

export const ExtraOwnRelease = meta.story({
  name: 'Extra: own release of the last hero opens Heroes',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('Menu:releaseClaim') }));
    await waitFor(() =>
      expect(sentBy(fakeApiOf(loaded))).toEqual([
        expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
      ]),
    );
    await expect(await canvas.findByRole('heading', { name: t('Heroes:title') })).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: ME })).not.toBeChecked();
    await expect(
      canvas.queryByText(anyValue((hero) => t('Toast:dmReleased', { hero }))),
    ).toBeNull();
  },
});

export const ExtraFailedReleaseThenDmRelease = meta.story({
  name: 'Extra: a failed own release does not hide a later DM release',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    api.failNext('version');
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('Menu:releaseClaim') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:combatChanged'));
    await expect(canvas.getByRole('button', { name: ME })).toBeVisible();
    await actAsDm(api, { type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(await canvas.findByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  },
});

export const ExtraNoteSaved = meta.story({
  name: 'Extra: note saved on blur',
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await userEvent.click(
      canvas.getByRole('button', {
        name: (label: string) => label.startsWith(t('NoteField:label')),
      }),
    );
    await userEvent.type(
      await canvas.findByRole('textbox', { name: t('NoteField:label') }),
      ', 2 rounds left',
    );
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
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    await userEvent.click(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }));
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
      expect(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') })).toBeChecked(),
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
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerView');
    await expect(
      await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: t('PlayerHeader:round', { round: 3 }) }),
    ).toBeNull();
  },
});

export const ExtraDeletedOnFirstLoad = meta.story({
  name: 'Extra: a 404 on the first load shows Combat deleted without a title',
  loaders: [firstLoadFails('notFound')],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerView');
    await expect(
      await canvas.findByRole('heading', { level: 1, name: t('MessageScreen:combatDeletedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:combatDeletedBody'))).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const ExtraCantReachServerRetry = meta.story({
  name: 'Extra: Try again after a first load without a response',
  loaders: [offlineLoader],
  play: async ({ canvas, globals, loaded, parameters }) => {
    const t = storyT(globals, 'PlayerView');
    await userEvent.click(await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }));
    await expect(
      await canvas.findByRole('heading', {
        name: playerT(parameters)('PlayerHeader:round', { round: 3 }),
      }),
    ).toBeVisible();
    await expect(fakeApiOf(loaded).calls.filter((call) => call.method === 'play.get')).toHaveLength(
      2,
    );
  },
});

export const ExtraDmLanguage = meta.story({
  tags: ['visual'],
  name: 'Extra: interface in the DM language',
  parameters: {
    scenario: playerScenario(ferryCombat({ status: 'setup' }), { settings: { language: 'de' } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Vorbereitung' })).toBeVisible();
    await expect(canvas.getByText('Warte, bis die Spielleitung den Kampf startet')).toBeVisible();
  },
});
