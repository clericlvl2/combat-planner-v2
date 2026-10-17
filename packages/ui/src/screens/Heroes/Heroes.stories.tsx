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
  MIKA,
  TOKEN,
  actAsDm,
  claimAs,
  ferryCombat,
  playerScenario,
  unitIds,
} from '../PlayerView/PlayerView.scenarios.ts';
import { Heroes } from './Heroes.tsx';

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

const meta = preview.meta({
  title: 'Screens/Heroes',
  component: HeroesScreen,
  args: { playerId: MIKA },
  parameters: { phoneFrame: { overlay: true }, scenario: firstVisit },
});

export const FirstVisit = meta.story({
  name: 'First visit',
  play: async ({ canvas }) => {
    const join = await canvas.findByRole('button', { name: 'Join' });
    await expect(join).toBeDisabled();
    await expect(canvas.getByText('Enter your name and pick a hero')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Ser Aldric' })).toBeDisabled();
    await expect(canvas.getByText('Jonas is playing')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' })).toBeEnabled();
    await expect(canvas.queryByRole('button', { name: 'Menu' })).toBeNull();
  },
});

export const NameRequired = meta.story({
  name: 'Name left empty',
  play: async ({ canvas }) => {
    const name = await canvas.findByRole('textbox', { name: 'Your name' });
    await userEvent.click(name);
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await expect(canvas.getByText('Enter your name')).toBeVisible();
    await expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeDisabled();
  },
});

export const PickAndJoin = meta.story({
  name: 'Pick a hero and join',
  play: async ({ canvas, canvasElement, loaded }) => {
    const api = fakeApiOf(loaded);
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Your name' }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await expect(sentBy(api, MIKA)).toEqual([]);
    const join = canvas.getByRole('button', { name: 'Join' });
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

export const TakenWhileOpen = meta.story({
  name: 'Chosen hero taken by another player',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Your name' }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' }));
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeEnabled();
    await claimAs(api, ALEX, 'Alex', unitIds.vashti);
    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent('Vashti the Hexer was just taken');
    const bar = canvas.getByRole('button', { name: 'Join' }).parentElement!;
    await expect(
      Math.round(bar.getBoundingClientRect().top - toast.getBoundingClientRect().bottom),
    ).toBe(12);
    const vashti = canvas.getByRole('checkbox', { name: 'Vashti the Hexer' });
    await expect(vashti).toBeDisabled();
    await expect(vashti).not.toBeChecked();
    await expect(canvas.getByText('Alex is playing')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeDisabled();
    await expect(sentBy(api, MIKA)).toEqual([]);
  },
});

export const Returning = meta.story({
  name: 'Returning player changes heroes',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup', ilse: true })) },
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    const vashti = await canvas.findByRole('checkbox', { name: 'Vashti the Hexer' });
    await expect(vashti).toBeChecked();
    await expect(canvas.getByRole('textbox', { name: 'Your name' })).toHaveValue('Mika');
    await expect(canvas.getByRole('button', { name: 'Done' })).toBeEnabled();
    await userEvent.click(vashti);
    await waitFor(() => expect(vashti).not.toBeChecked());
    canvas.getByRole('checkbox', { name: 'Ilse the Bold' }).focus();
    await userEvent.keyboard(' ');
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Ilse the Bold' })).toBeChecked(),
    );
    await expect(sentBy(api, MIKA)).toEqual([
      expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.ilse, displayName: 'Mika' }),
    ]);
    await expect(canvas.getByRole('button', { name: 'Done' })).toBeEnabled();
  },
});

export const ExtraJoinFails = meta.story({
  name: 'Join stays on Heroes when a claim fails',
  play: async ({ canvas, canvasElement, loaded }) => {
    const api = fakeApiOf(loaded);
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Your name' }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' }));
    api.failNext('version');
    await userEvent.click(canvas.getByRole('button', { name: 'Join' }));
    await expect(await canvas.findByRole('status')).toBeVisible();
    await expect(sentBy(api, MIKA)).toEqual([
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.vashti }),
    ]);
    await expect(canvasElement.querySelector('[data-done]')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeVisible();
  },
});

export const ExtraJoinClaimsOnReturnedVersion = meta.story({
  name: 'Join claims each hero on the version the previous claim returned',
  play: async ({ canvas, canvasElement, loaded }) => {
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
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Your name' }), 'Mika');
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Ilse the Bold' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Vashti the Hexer' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Join' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-done]')).not.toBeNull());
    const [first, second] = sentBy(api, MIKA);
    await expect(second).toEqual(
      expect.objectContaining({ type: 'claimUnit', unitId: unitIds.ilse }),
    );
    await expect(second!.version).toBe(first!.version + 2);
  },
});

export const ExtraReturningRename = meta.story({
  name: 'Returning player renames and taps Done',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup', ilse: true })) },
  play: async ({ canvas, canvasElement, loaded }) => {
    const api = fakeApiOf(loaded);
    const name = await canvas.findByRole('textbox', { name: 'Your name' });
    await waitFor(() => expect(name).toHaveValue('Mika'));
    await userEvent.clear(name);
    await userEvent.type(name, 'Мика');
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }));
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
