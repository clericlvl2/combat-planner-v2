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
import { escapeRegExp, storyT } from '../../storybook/storyT.ts';

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
  tags: ['visual'],
  name: 'Setup, waiting for the DM',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup' })) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    await expect(await canvas.findByText(t('waiting'))).toBeVisible();
    await expect(canvas.getByRole('heading', { name: t('Chip:setup') })).toBeVisible();
    await expect(canvas.getByText('影の射手ゴブリン')).toBeVisible();
  },
});

export const HiddenFields = meta.story({
  tags: ['visual'],
  name: 'Active, other rows hide private fields',
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc' })) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const orc = await rowOf(canvas, 'Orc Berserker');
    await expect(orc).toHaveAttribute('data-active');
    await expect(orc.textContent).not.toMatch(/AC|PD|MD|14|40/);
    const tomas = await rowOf(canvas, 'Brother Tomas of the Silver Lantern Order');
    await expect(tomas.textContent).toMatch(new RegExp(`${escapeRegExp(t('DefenseLine:ac'))}.*17`));
    await expect(within(tomas).queryByRole('button', { name: /^24/ })).toBeNull();
    await expect(within(tomas).queryByText('Hex on Orc Berserker')).toBeNull();
    await expect(canvas.queryByText('影の射手ゴブリン')).toBeNull();
    await expect(canvas.getByText('Hex on Orc Berserker')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('PlayerHeader:menu') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('Menu:heroes') }));
    await waitFor(() => expect(canvas.queryByRole('menuitem')).toBeNull());
  },
});

export const NoUnits = meta.story({
  name: 'No units after Clear',
  parameters: {
    scenario: playerScenario({ ...ferryCombat({ status: 'setup' }), units: [] }),
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    await expect(await canvas.findByRole('heading', { name: t('noUnitsTitle') })).toBeVisible();
    await expect(canvas.queryByText(t('waiting'))).toBeNull();
  },
});

export const DamageOwnHero = meta.story({
  name: 'Damage the own hero',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await expect(within(sheet).queryByRole('button', { name: t('NumpadSheet:setMax') })).toBeNull();
    await expect(
      within(sheet).getByRole('button', { name: t('HistoryRow:damage') }),
    ).toBeDisabled();
    await userEvent.click(within(sheet).getByRole('button', { name: '5' }));
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
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
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    const items = await canvas.findAllByRole('menuitem');
    await expect(items.map((item) => item.textContent)).toEqual([t('Menu:releaseClaim')]);
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
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:edit') }));
    const form = await canvas.findByRole('dialog', { name: t('UnitForm:editTitle') });
    await expect(within(form).getByRole('radio', { name: t('UnitForm:hero') })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(within(form).getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
    await expect(
      within(form).getByRole('spinbutton', { name: t('NumberField:maxHp') }),
    ).toBeDisabled();
    const name = within(form).getByRole('textbox', { name: t('UnitForm:name') });
    await userEvent.clear(name);
    await userEvent.type(name, 'Vashti the Bold');
    await userEvent.click(within(form).getByRole('button', { name: t('UnitForm:saveChanges') }));
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
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await userEvent.click(within(sheet).getByRole('button', { name: '5' }));
    api.failNext('version');
    await userEvent.click(within(sheet).getByRole('button', { name: t('HistoryRow:damage') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:combatChanged'));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const after = await rowOf(canvas, ME);
    await expect(after).not.toHaveAttribute('data-flash');
    await expect(within(after).getByRole('button', { name: /^20 \/36/ })).toBeVisible();
  },
});

export const ExtraInitiativeBonus = meta.story({
  name: 'The initiative popover shows the hero bonus',
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup' })) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(
      within(vashti).getByRole('button', {
        name: (label: string) => label.endsWith(t('RoleBlock:you')),
      }),
    );
    const popover = await canvas.findByRole('dialog', { name: t('InitiativePopover:title') });
    await expect(
      within(popover).getByRole('button', {
        name: (label: string) => label.startsWith(t('InitiativePopover:roll', { bonus: '+2' })),
      }),
    ).toBeVisible();
  },
});
