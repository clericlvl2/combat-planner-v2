import preview from '#.storybook/preview';
import type { Action } from '@combat-planner/domain';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import type { FakeApiClient } from '../../api/FakeApiClient.ts';
import { useCombat } from '../../hooks/useCombat.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import {
  ALEX,
  COMBAT_ID,
  JONAS,
  MIKA,
  TOKEN,
  actAsDm,
  claimAs,
  ferryCombat,
  playerScenario,
  unitIds,
} from '../PlayerView/PlayerView.scenarios.ts';
import { Heroes } from './Heroes.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface HeroesScreenProps {
  playerId: string;
}

function HeroesScreen({ playerId }: HeroesScreenProps) {
  const { combat, dispatch } = useCombat(COMBAT_ID, { kind: 'player', playerId }, TOKEN);
  const [done, setDone] = useState(false);
  if (!combat) return null;
  return (
    <>
      <Heroes
        combat={combat}
        playerId={playerId}
        dispatch={dispatch}
        onDone={() => setDone(true)}
      />
      {done ? <span hidden data-done="" /> : null}
    </>
  );
}

const sentBy = (api: FakeApiClient, playerId: string): Action[] =>
  api.calls
    .filter((call) => call.method === 'play.dispatch' && call.args[1] === playerId)
    .map((call) => call.args[2] as Action);

const firstVisit = playerScenario(ferryCombat({ status: 'setup', joined: false, ilse: true }));

const longHeroName = 'Ильза Отважная, дочь стражника переправы';

const meta = preview.meta({
  title: 'Screens/Heroes',
  component: HeroesScreen,
  args: { playerId: MIKA },
  parameters: { phoneFrame: { overlay: true }, scenario: firstVisit },
});

export const FirstVisit = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Heroes');
    const join = await canvas.findByRole('button', { name: t('join') });
    await expect(join).toBeDisabled();
    await expect(canvas.getByText(t('hint'))).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Ser Aldric' })).toBeDisabled();
    await expect(canvas.getByText(t('playing', { name: 'Jonas' }))).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' })).toBeEnabled();
    await expect(canvas.queryByRole('button', { name: t('CombatHeader:menu') })).toBeNull();
  },
});

export const NameLeftEmpty = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Heroes');
    const name = await canvas.findByRole('textbox', { name: t('nameLabel') });
    await userEvent.click(name);
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await expect(canvas.getByText(t('nameError'))).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked();
    await expect(canvas.getByRole('button', { name: t('join') })).toBeDisabled();
  },
});

export const PickAndJoin = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    await userEvent.type(await canvas.findByRole('textbox', { name: t('nameLabel') }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await expect(sentBy(api, MIKA)).toEqual([]);
    const join = canvas.getByRole('button', { name: t('join') });
    await expect(join).toBeEnabled();
    await userEvent.click(join);
    await waitFor(() =>
      expect(sentBy(api, MIKA)).toEqual([
        expect.objectContaining({
          type: 'claimUnit',
          unitId: unitIds.ilse,
          displayName: 'Mika',
        }),
      ]),
    );
    await waitFor(() => expect(canvasElement.querySelector('[data-done]')).not.toBeNull());
  },
});

export const HeroTakenByAnotherPlayer = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    await userEvent.type(await canvas.findByRole('textbox', { name: t('nameLabel') }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' }));
    await expect(canvas.getByRole('button', { name: t('join') })).toBeEnabled();
    await claimAs(api, ALEX, 'Alex', unitIds.vashti);
    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent(t('Toast:heroTaken', { hero: 'Vashti the Hexer' }));
    const bar = canvas.getByRole('button', { name: t('join') }).parentElement!;
    await expect(
      Math.round(bar.getBoundingClientRect().top - toast.getBoundingClientRect().bottom),
    ).toBe(12);
    const vashti = canvas.getByRole('checkbox', { name: 'Vashti the Hexer' });
    await expect(vashti).toBeDisabled();
    await expect(vashti).not.toBeChecked();
    await expect(canvas.getByText(t('playing', { name: 'Alex' }))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('join') })).toBeDisabled();
    await expect(sentBy(api, MIKA)).toEqual([]);
  },
});

export const ReturningPlayer = meta.story({
  tags: ['visual'],
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup', ilse: true })) },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    const vashti = await canvas.findByRole('checkbox', { name: 'Vashti the Hexer' });
    await expect(vashti).toBeChecked();
    await expect(canvas.getByRole('textbox', { name: t('nameLabel') })).toHaveValue('Mika');
    await expect(canvas.getByRole('button', { name: t('done') })).toBeEnabled();
    await userEvent.click(vashti);
    await waitFor(() => expect(vashti).not.toBeChecked());
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked(),
    );
    await expect(sentBy(api, MIKA)).toEqual([
      expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.ilse, displayName: 'Mika' }),
    ]);
    await expect(canvas.getByRole('button', { name: t('done') })).toBeEnabled();
  },
});

export const JoinFailed = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    await userEvent.type(await canvas.findByRole('textbox', { name: t('nameLabel') }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' }));
    api.failNext('version');
    await userEvent.click(canvas.getByRole('button', { name: t('join') }));
    await expect(await canvas.findByRole('status')).toBeVisible();
    await expect(sentBy(api, MIKA)).toEqual([
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.vashti }),
    ]);
    await expect(canvasElement.querySelector('[data-done]')).toBeNull();
    await expect(canvas.getByRole('button', { name: t('join') })).toBeVisible();
  },
});

export const JoinClaimsOnReturnedVersion = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    const dispatch = api.play.dispatch.bind(api.play);
    api.play.dispatch = async (token, playerId, action) => {
      const result = await dispatch(token, playerId, action);
      if (action.type === 'claimUnit' && action.unitId === unitIds.vashti) {
        await actAsDm(api, { type: 'editNote', unitId: unitIds.orc, note: 'Ярость' });
        return { version: result.version + 1 };
      }
      return result;
    };
    await userEvent.type(await canvas.findByRole('textbox', { name: t('nameLabel') }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' }));
    await userEvent.click(canvas.getByRole('button', { name: t('join') }));
    await waitFor(() => expect(canvasElement.querySelector('[data-done]')).not.toBeNull());
    const [first, second] = sentBy(api, MIKA);
    await expect(second).toEqual(
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.ilse }),
    );
    await expect(second!.version).toBe(first!.version + 2);
  },
});

export const ReturningRename = meta.story({
  tags: ['!dev'],
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup', ilse: true })) },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    const name = await canvas.findByRole('textbox', { name: t('nameLabel') });
    await waitFor(() => expect(name).toHaveValue('Mika'));
    await userEvent.clear(name);
    await userEvent.type(name, 'Мика');
    await userEvent.click(canvas.getByRole('button', { name: t('done') }));
    await waitFor(() => expect(canvasElement.querySelector('[data-done]')).not.toBeNull());
    const sent = sentBy(api, MIKA);
    await expect(sent).toHaveLength(1);
    await expect(sent[0]).toMatchObject({
      type: 'claimUnit',
      unitId: unitIds.vashti,
      displayName: 'Мика',
    });
    await expect(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' })).toBeChecked();
    const { combat } = await api.play.get(TOKEN, MIKA);
    await expect(combat.players[MIKA]).toBe('Мика');
    await expect(combat.units.find((unit) => unit.id === unitIds.vashti)?.claimedBy).toBe(MIKA);
  },
});

export const HeroPickedReadyToJoin = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Heroes');
    await userEvent.type(await canvas.findByRole('textbox', { name: t('nameLabel') }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked();
    await expect(canvas.getByRole('button', { name: t('join') })).toBeEnabled();
    await expect(canvas.queryByText(t('hint'))).toBeNull();
  },
});

export const EveryHeroTaken = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Heroes');
    const api = fakeApiOf(loaded);
    await canvas.findByRole('textbox', { name: t('nameLabel') });
    await claimAs(api, ALEX, 'Alex', unitIds.vashti);
    await claimAs(api, JONAS, 'Jonas', unitIds.ilse);
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeDisabled(),
    );
    for (const hero of ['Ser Aldric', 'Vashti the Hexer', 'Ilse the Bold']) {
      await expect(canvas.getByRole('checkbox', { name: hero })).toBeDisabled();
    }
    await expect(canvas.queryByText(t('free'))).toBeNull();
    await expect(canvas.getByRole('button', { name: t('join') })).toBeDisabled();
  },
});

export const LongHeroName = meta.story({
  parameters: {
    scenario: playerScenario(
      ferryCombat({ status: 'setup', joined: false, ilse: true, names: { ilse: longHeroName } }),
    ),
  },
  play: async ({ canvas }) => {
    await expect(longHeroName).toHaveLength(40);
    const hero = await canvas.findByRole('checkbox', { name: longHeroName });
    await expect(hero).toBeEnabled();
    await expect(hero.scrollWidth).toBeLessThanOrEqual(hero.clientWidth);
  },
});
