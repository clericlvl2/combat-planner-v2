import preview from '#.storybook/preview';
import type { Action } from '@combat-planner/domain';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { FakeApiClient } from '../../api/FakeApiClient.ts';
import { useCombat } from '../../hooks/useCombat.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import {
  COMBAT_ID,
  ME,
  MIKA,
  TOKEN,
  ferryCombat,
  playerScenario,
  unitIds,
} from '../PlayerView/PlayerView.scenarios.ts';
import { TurnOrder } from './TurnOrder.tsx';

type Canvas = ReturnType<typeof within>;

interface TurnOrderScreenProps {
  playerId: string;
}

function TurnOrderScreen({ playerId }: TurnOrderScreenProps) {
  const { combat, dispatch } = useCombat(COMBAT_ID, { kind: 'player', playerId }, TOKEN);
  const [heroes, setHeroes] = useState(false);
  if (!combat) return null;
  return (
    <>
      <TurnOrder
        combat={combat}
        playerId={playerId}
        dispatch={dispatch}
        onHeroes={() => setHeroes(true)}
      />
      {heroes ? <span hidden data-heroes="" /> : null}
    </>
  );
}

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

const expandOwn = async (canvas: Canvas) => {
  await userEvent.click(await canvas.findByRole('button', { name: ME }));
  await expect(canvas.getByRole('button', { name: ME })).toHaveAttribute('aria-expanded', 'true');
};

const meta = preview.meta({
  title: 'Screens/TurnOrder',
  component: TurnOrderScreen,
  args: { playerId: MIKA },
  parameters: {
    phoneFrame: { overlay: true },
    scenario: playerScenario(ferryCombat({ active: 'vashti' })),
  },
});

export const SetupWaiting = meta.story({
  name: 'Setup, waiting for the DM',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup' })) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Waiting for the DM to start the combat')).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Setup' })).toBeVisible();
    await expect(canvas.getByText('影の射手ゴブリン')).toBeVisible();
  },
});

export const HiddenFields = meta.story({
  name: 'Active, other rows hide private fields',
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc' })) },
  play: async ({ canvas }) => {
    const orc = await rowOf(canvas, 'Orc Berserker');
    await expect(orc).toHaveAttribute('data-active');
    await expect(orc.textContent).not.toMatch(/AC|PD|MD|14|40/);
    const tomas = await rowOf(canvas, 'Brother Tomas of the Silver Lantern Order');
    await expect(tomas.textContent).toMatch(/AC.*17/);
    await expect(within(tomas).queryByRole('button', { name: /^24/ })).toBeNull();
    await expect(within(tomas).queryByText('Hex on Orc Berserker')).toBeNull();
    await expect(canvas.queryByText('影の射手ゴブリン')).toBeNull();
    await expect(canvas.getByText('Hex on Orc Berserker')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Menu' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Heroes' }));
    await waitFor(() => expect(canvas.queryByRole('menuitem')).toBeNull());
  },
});

export const NoUnits = meta.story({
  name: 'No units after Clear',
  parameters: {
    scenario: playerScenario({ ...ferryCombat({ status: 'setup' }), units: [] }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'No units yet' })).toBeVisible();
    await expect(canvas.queryByText('Waiting for the DM to start the combat')).toBeNull();
  },
});

export const DamageOwnHero = meta.story({
  name: 'Damage the own hero',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await expect(within(sheet).queryByRole('button', { name: 'Set Max' })).toBeNull();
    await expect(within(sheet).getByRole('button', { name: 'Damage' })).toBeDisabled();
    await userEvent.click(within(sheet).getByRole('button', { name: '5' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await waitFor(() =>
      expect(sentBy(api)).toEqual([
        expect.objectContaining({ type: 'damage', unitId: unitIds.vashti, amount: 5 }),
      ]),
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const after = await rowOf(canvas, ME);
    await expect(after).toHaveAttribute('data-flash');
    await expect(within(after).getByRole('button', { name: /^15 \/36/ })).toBeVisible();
  },
});

export const ReleaseClaim = meta.story({
  name: 'Release claim from the own row',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    const items = await canvas.findAllByRole('menuitem');
    await expect(items.map((item) => item.textContent)).toEqual(['Release claim']);
    await userEvent.click(items[0]!);
    await waitFor(() =>
      expect(sentBy(api)).toEqual([
        expect.objectContaining({ type: 'releaseUnit', unitId: unitIds.vashti }),
      ]),
    );
    await waitFor(() => expect(canvas.queryByRole('button', { name: ME })).toBeNull());
  },
});

export const EditOwnHero = meta.story({
  name: 'Edit the own hero, type locked',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    const form = await canvas.findByRole('dialog', { name: 'Edit unit' });
    await expect(within(form).getByRole('radio', { name: 'Hero' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(within(form).getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
    await expect(within(form).getByRole('spinbutton', { name: 'Max HP' })).toBeDisabled();
    const name = within(form).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Vashti the Bold');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(sentBy(api)).toEqual([
        expect.objectContaining({
          type: 'editUnit',
          unitId: unitIds.vashti,
          name: 'Vashti the Bold',
          role: 'hero',
          maxHp: 36,
        }),
      ]),
    );
    await expect(await canvas.findByRole('button', { name: 'Vashti the Bold' })).toBeVisible();
  },
});

export const ExtraFailedDamageNoFlash = meta.story({
  name: 'A rejected Damage does not flash the row',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await userEvent.click(within(sheet).getByRole('button', { name: '5' }));
    api.failNext('version');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Damage' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'The combat changed. Try again.',
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const after = await rowOf(canvas, ME);
    await expect(after).not.toHaveAttribute('data-flash');
    await expect(within(after).getByRole('button', { name: /^20 \/36/ })).toBeVisible();
  },
});

export const ExtraInitiativeBonus = meta.story({
  name: 'The initiative popover shows the hero bonus',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup' })) },
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /You$/ }));
    const popover = await canvas.findByRole('dialog', { name: 'Initiative' });
    await expect(within(popover).getByRole('button', { name: /^Roll d20 \+2/ })).toBeVisible();
  },
});
