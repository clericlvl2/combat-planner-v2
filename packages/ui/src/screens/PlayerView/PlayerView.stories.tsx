import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import type { ApiErrorCode } from '@combat-planner/api/client';
import type { Action } from '@combat-planner/domain';
import type { Loader } from '@storybook/react-vite';
import { focusManager } from '@tanstack/react-query';
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { FakeApiClient } from '../../api/FakeApiClient.ts';
import type { Scenario } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import {
  ALEX,
  COMBAT_ID,
  COMBAT_TITLE,
  JONAS,
  ME,
  MIKA,
  TOKEN,
  actAsDm,
  claimAs,
  ferryCombat,
  playerScenario,
  releaseAs,
  unitIds,
} from './PlayerView.scenarios.ts';
import { TURN_VIBRATION_MS } from './ownTurn.ts';
import { PlayerView } from './PlayerView.tsx';
import { localeNames } from '../Settings/localeNames.ts';
import { storyLocale } from '../../storybook/withLocale.tsx';
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
  api.play.subscribe = (token, onDocument, onEnd) =>
    subscribe(token, onDocument, (event) => {
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

const openLeave = async (canvas: Canvas, t: TFunction) => {
  await userEvent.click(await canvas.findByRole('button', { name: t('CombatHeader:menu') }));
  await userEvent.click(await canvas.findByRole('menuitem', { name: t('CombatHeader:leave') }));
  return canvas.findByRole('alertdialog', { name: t('Dialog:leaveTitle') });
};

const meta = preview.meta({
  title: 'Screens/PlayerView',
  component: PlayerView,
  args: { combatId: COMBAT_ID, token: TOKEN, onHome: fn() },
  parameters: { phoneFrame: { overlay: true }, scenario: ownTurn },
});

export const HeroList = meta.story({
  tags: ['visual'],
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

export const TourJoin = meta.story({
  tags: ['visual'],
  parameters: { scenario: joinScenario, tour: { player: 'unset' } },
  play: async ({ canvas, parameters }) => {
    const t = storyT({ locale: parameters.scenario?.settings.language }, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('playerNameTitle') });
    await expect(within(tooltip).getByText(t('counter', { current: 1, total: 6 }))).toBeVisible();
    await typeName(canvas, playerT(parameters));
    await expect(await canvas.findByRole('dialog', { name: t('playerHeroTitle') })).toBeVisible();
  },
});

export const TourTurnStrip = meta.story({
  tags: ['visual'],
  parameters: { scenario: ownTurn, tour: { player: 'done', turn: 'unset' } },
  play: async ({ canvas, parameters }) => {
    const t = storyT({ locale: parameters.scenario?.settings.language }, 'Tour');
    const tooltip = await canvas.findByRole('dialog', { name: t('playerTurnTitle') });
    await expect(within(tooltip).queryByRole('button', { name: t('skip') })).toBeNull();
    await expect(within(tooltip).queryByText(/\d/)).toBeNull();
    await userEvent.click(within(tooltip).getByRole('button', { name: t('gotIt') }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const WaitingForDm = meta.story({
  name: 'Waiting For DM',
  tags: ['visual'],
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

export const OwnHeroWithoutInitiative = meta.story({
  tags: ['visual'],
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

export const InitiativeSheet = meta.story({
  parameters: { scenario: setupScenario },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(
      within(vashti).getByRole('button', {
        name: (label: string) => label.endsWith(t('RoleBlock:you')),
      }),
    );
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await expect(
      within(sheet).getByRole('button', {
        name: anyValue(t, 'InitiativeSheet:roll', 'bonus'),
      }),
    ).toBeVisible();
  },
});

export const RollDispatched = meta.story({
  tags: ['!dev'],
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
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await userEvent.click(
      within(sheet).getByRole('button', {
        name: anyValue(t, 'InitiativeSheet:roll', 'bonus'),
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

export const OwnTurn = meta.story({
  tags: ['visual'],
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    await expect(vashti).toHaveAttribute('data-active');
    await expect(within(vashti).getByRole('button', { name: /^20 \/36/ })).toBeEnabled();
  },
});

export const OwnTurnVibrates = meta.story({
  tags: ['!dev'],
  parameters: { scenario: orcTurn },
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await rowOf(canvas, ME);
    const spy = spyOn(navigator, 'vibrate').mockReturnValue(true);
    try {
      await actAsDm(api, { type: 'nextTurn' });
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
      await expect(spy).toHaveBeenLastCalledWith(TURN_VIBRATION_MS);
      const gets = () => api.calls.filter((call) => call.method === 'play.get').length;
      const before = gets();
      refocus();
      await waitFor(() => expect(gets()).toBeGreaterThan(before));
      await expect(spy).toHaveBeenCalledTimes(1);
      for (const unitId of [unitIds.aldric, unitIds.orc, unitIds.tomas]) {
        await actAsDm(api, { type: 'setDisabled', unitId, disabled: true });
      }
      await actAsDm(api, { type: 'nextTurn' });
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
      await expect(spy).toHaveBeenLastCalledWith(TURN_VIBRATION_MS);
    } finally {
      spy.mockRestore();
    }
  },
});

export const DamageNumpad = meta.story({
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const sheet = await openNumpad(canvas);
    await expect(
      within(sheet).getByRole('button', { name: t('NumpadSheet:setMax') }),
    ).toBeDisabled();
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    await expect(within(sheet).getByRole('button', { name: t('HistoryRow:damage') })).toBeEnabled();
    await expect(sentBy(fakeApiOf(loaded))).toEqual([]);
  },
});

export const DamageDispatched = meta.story({
  tags: ['!dev'],
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
  },
});

export const OwnChangeShowsOnce = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '3' }));
    api.holdNextReply();
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await waitFor(() => expect(sentBy(api)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 100));
    const vashti = await rowOf(canvas, ME);
    await expect(within(vashti).getByRole('button', { name: /^17 \/36/ })).toBeVisible();
    api.releaseReplies();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(within(vashti).getByRole('button', { name: /^17 \/36/ })).toBeVisible();
  },
});

export const OwnRowExpanded = meta.story({
  tags: ['visual'],
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await expect(canvas.getByRole('button', { name: t('PlayerRow:conditions') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: t('CardActions:more') })).toHaveLength(1);
  },
});

export const ConditionSheet = meta.story({
  tags: ['visual'],
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

export const EditingNote = meta.story({
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

export const MenuOpen = meta.story({
  parameters: { scenario: orcTurn },
  play: async ({ canvas, parameters }) => {
    const t = playerT(parameters);
    await userEvent.click(await canvas.findByRole('button', { name: t('CombatHeader:menu') }));
    const items = await canvas.findAllByRole('menuitem');
    await expect(items.map((item) => item.textContent)).toEqual([
      t('CombatHeader:heroes'),
      `${t('CombatHeader:language')}${localeNames[storyLocale({ locale: parameters.scenario?.settings.language })]}`,
      t('CombatHeader:leave'),
    ]);
  },
});

export const MenuSwitchesLanguage = meta.story({
  tags: ['!dev'],
  parameters: {
    scenario: playerScenario(ferryCombat({ status: 'setup' }), { settings: { language: 'de' } }),
  },
  play: async ({ canvas }) => {
    const de = storyT({ locale: 'de' }, 'CombatHeader');
    const en = storyT({ locale: 'en' }, 'CombatHeader');
    await expect(await canvas.findByText(de('setup'))).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: de('menu') }));
    await userEvent.click(
      await canvas.findByRole('menuitem', { name: new RegExp(de('language')) }),
    );
    await userEvent.click(await canvas.findByRole('radio', { name: localeNames.en }));
    await expect(await canvas.findByText(en('setup'))).toBeVisible();
    await expect(canvas.queryByText(de('setup'))).toBeNull();
  },
});

export const LeaveConfirmation = meta.story({
  tags: ['visual'],
  parameters: { scenario: orcTurn },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const dialog = await openLeave(canvas, t);
    await expect(within(dialog).getByText(t('Dialog:leaveBody'))).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: t('Dialog:leave') })).toBeVisible();
    await expect(fakeApiOf(loaded).calls.filter((call) => call.method === 'play.leave')).toEqual(
      [],
    );
  },
});

export const LeaveGoesHome = meta.story({
  tags: ['!dev'],
  parameters: { scenario: orcTurn },
  play: async ({ args, canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const dialog = await openLeave(canvas, t);
    await userEvent.click(within(dialog).getByRole('button', { name: t('Dialog:leave') }));
    await waitFor(() => expect(args.onHome).toHaveBeenCalledOnce());
    await expect(fakeApiOf(loaded).calls.filter((call) => call.method === 'play.leave')).toEqual([
      { method: 'play.leave', args: [COMBAT_ID, MIKA] },
    ]);
    await expect(
      fakeApiOf(loaded).play.dispatch(TOKEN, {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAZ',
        version: 0,
        type: 'releaseUnit',
        unitId: unitIds.vashti,
      }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  },
});

export const LeaveFailureStays = meta.story({
  tags: ['!dev'],
  parameters: { scenario: orcTurn },
  play: async ({ args, canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const dialog = await openLeave(canvas, t);
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(within(dialog).getByRole('button', { name: t('Dialog:leave') }));
    await expect(await canvas.findByText(t('Toast:serverUnreachableNothingChanged'))).toBeVisible();
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});

export const MenuOpensHeroPicker = meta.story({
  tags: ['!dev'],
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc', ilse: true })) },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await userEvent.click(await canvas.findByRole('button', { name: t('CombatHeader:menu') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('CombatHeader:heroes') }));
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
    await expect(
      canvas.queryByText(t('Toast:playerClaimed', { name: 'Mika', hero: 'Ilse the Bold' })),
    ).toBeNull();
    await expect(canvas.getByRole('button', { name: t('Sheet:done') })).toBeEnabled();
  },
});

export const HeroTakenByAnotherPlayer = meta.story({
  parameters: { scenario: joinScenario },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    await typeName(canvas, t);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    await expect(canvas.getByRole('button', { name: t('Heroes:join') })).toBeEnabled();
    await claimAs(api, ALEX, 'Alex', unitIds.vashti);
    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent(t('Toast:playerClaimed', { name: 'Alex', hero: ME }));
    const bar = canvas.getByRole('button', { name: t('Heroes:join') }).parentElement!;
    await expect(
      Math.round(bar.getBoundingClientRect().top - toast.getBoundingClientRect().bottom),
    ).toBe(12);
    const vashti = canvas.getByRole('checkbox', { name: ME });
    await expect(vashti).toBeDisabled();
    await expect(vashti).not.toBeChecked();
    await expect(canvas.getByText(t('Heroes:playing', { name: 'Alex' }))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Heroes:join') })).toBeDisabled();
    await expect(sentBy(api)).toEqual([]);
  },
});

export const OtherPlayerClaimsQueued = meta.story({
  tags: ['!dev'],
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc', ilse: true })) },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    await rowOf(canvas, ME);
    await claimAs(api, JONAS, 'Jonas', unitIds.ilse);
    await expect(
      await canvas.findByText(t('Toast:playerClaimed', { name: 'Jonas', hero: 'Ilse the Bold' })),
    ).toBeVisible();
    await releaseAs(api, JONAS, unitIds.aldric);
    const released = t('Toast:playerReleased', { name: 'Jonas', hero: 'Ser Aldric' });
    await expect(canvas.queryByText(released)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: t('Toast:dismiss') }));
    await expect(await canvas.findByText(released)).toBeVisible();
  },
});

export const CombatStartAnnounced = meta.story({
  tags: ['!dev'],
  parameters: { scenario: setupScenario },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await rowOf(canvas, ME);
    await actAsDm(fakeApiOf(loaded), { type: 'start', rolls: { [unitIds.vashti]: 10 } });
    await expect(await canvas.findByText(t('Toast:combatStarted'))).toBeVisible();
  },
});

export const RequestFailed = meta.story({
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

export const OwnRelease = meta.story({
  tags: ['!dev'],
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
    await expect(canvas.queryByText(anyValue(t, 'Toast:dmReleased', 'hero'))).toBeNull();
  },
});

export const FailedReleaseThenDmRelease = meta.story({
  name: 'Failed Release Then DM Release',
  tags: ['!dev'],
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

export const NoteSaved = meta.story({
  tags: ['!dev'],
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

export const ConditionToggled = meta.story({
  tags: ['!dev'],
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

export const QuickConditionTapsBothApply = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    api.holdNextExchange();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }));
    await userEvent.click(within(sheet).getByRole('checkbox', { name: t('Chip:stunned') }));
    api.releaseReplies();
    const toggles = () => sentBy(api).filter((action) => action.type === 'toggleCondition');
    await waitFor(() => expect(toggles()).toHaveLength(2));
    const [first, second] = toggles();
    await expect(second?.version).toBe((first?.version ?? 0) + 1);
    await waitFor(() =>
      expect(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') })).toBeChecked(),
    );
    await waitFor(() =>
      expect(within(sheet).getByRole('checkbox', { name: t('Chip:stunned') })).toBeChecked(),
    );
    await expect(canvas.queryByText(t('Toast:combatChanged'))).toBeNull();
  },
});

export const QuickHeroSwapBothApply = meta.story({
  tags: ['!dev'],
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc', ilse: true })) },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    await userEvent.click(await canvas.findByRole('button', { name: t('CombatHeader:menu') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('CombatHeader:heroes') }));
    const me = await canvas.findByRole('checkbox', { name: ME });
    api.holdNextExchange();
    await userEvent.click(me);
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    api.releaseReplies();
    await waitFor(() => expect(sentBy(api)).toHaveLength(2));
    const [released, claimed] = sentBy(api);
    await expect(released).toMatchObject({ type: 'releaseUnit', unitId: unitIds.vashti });
    await expect(claimed).toMatchObject({ type: 'claimUnit', unitId: unitIds.ilse });
    await expect(claimed?.version).toBe((released?.version ?? 0) + 1);
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked(),
    );
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: ME })).not.toBeChecked());
    await expect(canvas.queryByText(t('Toast:combatChanged'))).toBeNull();
  },
});

export const DeletedBeforeEnd = meta.story({
  tags: ['!dev'],
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

export const CantReachServer = meta.story({
  tags: ['!dev'],
  loaders: [offlineLoader],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerView');
    await expect(
      await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await expect(canvas.queryByRole('heading', { level: 1, name: COMBAT_TITLE })).toBeNull();
  },
});

export const FullCombatAsksToRetry = meta.story({
  tags: ['!dev'],
  loaders: [firstLoadFails('limit')],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerView');
    await expect(
      await canvas.findByRole('heading', { name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') })).toBeVisible();
  },
});

export const DeletedOnFirstLoad = meta.story({
  tags: ['!dev'],
  loaders: [firstLoadFails('notFound')],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerView');
    await expect(
      await canvas.findByRole('heading', { level: 1, name: t('MessageScreen:combatDeletedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:combatDeletedBody'))).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('MessageScreen:home') }));
    await expect(args.onHome).toHaveBeenCalledOnce();
  },
});

export const CantReachServerRetry = meta.story({
  tags: ['!dev'],
  loaders: [offlineLoader],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'PlayerView');
    await userEvent.click(await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }));
    await expect(
      await canvas.findByRole('heading', { level: 1, name: COMBAT_TITLE }),
    ).toBeVisible();
    await expect(fakeApiOf(loaded).calls.filter((call) => call.method === 'play.get')).toHaveLength(
      2,
    );
  },
});

export const DroppedRetry = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, parameters, loaded }) => {
    const t = playerT(parameters);
    const api = fakeApiOf(loaded);
    const calls = (method: string) => api.calls.filter((call) => call.method === method);
    await expect(
      await canvas.findByRole('heading', { level: 1, name: COMBAT_TITLE }),
    ).toBeVisible();
    await waitFor(() => expect(calls('play.subscribe')).toHaveLength(1));
    api.dropPlayers(COMBAT_ID);
    await userEvent.click(await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }));
    await expect(
      await canvas.findByRole('heading', { level: 1, name: COMBAT_TITLE }),
    ).toBeVisible();
    await expect(calls('play.get')).toHaveLength(2);
    await expect(calls('play.subscribe')).toHaveLength(2);
  },
});

export const DmLanguage = meta.story({
  name: 'DM Language',
  tags: ['!dev'],
  parameters: {
    scenario: playerScenario(ferryCombat({ status: 'setup' }), { settings: { language: 'de' } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Vorbereitung')).toBeVisible();
    await expect(canvas.getByText('Warte, bis die Spielleitung den Kampf startet')).toBeVisible();
  },
});

const loadingLoader: Loader = ({ parameters }) => {
  const api = new FakeApiClient({ scenario: parameters.scenario as Scenario, delay: 0 });
  api.play.get = () => new Promise(() => undefined);
  api.play.subscribe = () => () => {};
  return { api };
};

export const Loading = meta.story({
  tags: ['visual'],
  loaders: [loadingLoader],
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-card-skeleton]')?.children).toHaveLength(5),
    );
    await expect(canvasElement.querySelector('[data-unit-role]')).toBeNull();
  },
});

export const HpChangeShowsAtOnce = meta.story({
  name: 'HP Change Shows At Once',
  tags: ['!dev'],
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '7' }));
    fakeApiOf(loaded).holdNext();
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    const vashti = await rowOf(canvas, ME);
    await expect(await within(vashti).findByRole('button', { name: /^13 \/36/ })).toBeVisible();
  },
});

export const SetMaxWaits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const sheet = await openNumpad(canvas);
    await userEvent.click(within(sheet).getByRole('button', { name: '4' }));
    await userEvent.click(within(sheet).getByRole('button', { name: '0' }));
    fakeApiOf(loaded).holdNext();
    const setMax = within(sheet).getByRole('button', { name: t('NumpadSheet:setMax') });
    await userEvent.click(setMax);
    const busy = setMax;
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
  },
});

export const ConditionWaits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerRow:conditions') }));
    const sheet = await canvas.findByRole('dialog', { name: t('PlayerRow:conditions') });
    fakeApiOf(loaded).holdNext();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: t('Chip:weakened') }));
    const busy = within(sheet).getByRole('button', { name: t('ConditionPicker:done') });
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
  },
});

export const ReleaseWaits = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await expandOwn(canvas);
    const more = canvas.getByRole('button', { name: t('CardActions:more') });
    await userEvent.click(more);
    fakeApiOf(loaded).holdNext();
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('Menu:releaseClaim') }));
    const busy = more;
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
  },
});

export const LeaveWaits = meta.story({
  tags: ['!dev'],
  parameters: { scenario: orcTurn },
  play: async ({ args, canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    const dialog = await openLeave(canvas, t);
    fakeApiOf(loaded).holdNext();
    const confirm = within(dialog).getByRole('button', { name: t('Dialog:leave') });
    await userEvent.click(confirm);
    const busy = confirm;
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});

export const JoinWaits = meta.story({
  tags: ['!dev'],
  parameters: { scenario: joinScenario },
  play: async ({ canvas, loaded, parameters }) => {
    const t = playerT(parameters);
    await typeName(canvas, t);
    await userEvent.click(canvas.getByRole('checkbox', { name: ME }));
    fakeApiOf(loaded).holdNext();
    const join = canvas.getByRole('button', { name: t('Heroes:join') });
    await userEvent.click(join);
    const busy = join;
    await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
    await expect(busy).toBeDisabled();
  },
});
