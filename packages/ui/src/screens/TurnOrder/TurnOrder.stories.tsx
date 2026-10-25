import preview from '#.storybook/preview';
import type { Action, Combat } from '@combat-planner/domain';
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
  actAsDm,
  ferryCombat,
  playerScenario,
  unitIds,
} from '../PlayerView/PlayerView.scenarios.ts';
import { TurnOrder } from './TurnOrder.tsx';
import { escapeRegExp, storyT } from '../../storybook/storyT.ts';

type Canvas = ReturnType<typeof within>;

function TurnOrderScreen() {
  const { combat, dispatch } = useCombat(COMBAT_ID, { kind: 'player' }, TOKEN);
  const [heroes, setHeroes] = useState(false);
  if (!combat) return null;
  return (
    <>
      <TurnOrder combat={combat} dispatch={dispatch} onHeroes={() => setHeroes(true)} />
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

const crowded = (combat: Combat, initiative: number): Combat => {
  const orc = combat.units.find((unit) => unit.id === unitIds.orc);
  if (!orc) throw new Error('no orc');
  const filler = Array.from({ length: 8 }, (_, index) => ({
    ...orc,
    id: `01JP00000000000000000000F${index}`,
    name: `Orc Raider ${index + 1}`,
    initiative,
    conditions: [],
  }));
  return { ...combat, units: [...combat.units, ...filler] };
};

const listViewport = (canvasElement: HTMLElement): HTMLElement => {
  const viewport = canvasElement.querySelector('[data-scroll-list] .mantine-ScrollArea-viewport');
  if (!(viewport instanceof HTMLElement)) throw new Error('no list viewport');
  return viewport;
};

const expectInView = async (canvasElement: HTMLElement, row: HTMLElement) => {
  const viewport = listViewport(canvasElement);
  await waitFor(async () => {
    const frame = viewport.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    await expect(box.top).toBeGreaterThanOrEqual(frame.top);
    await expect(box.bottom).toBeLessThanOrEqual(frame.bottom);
  });
};

const expandOwn = async (canvas: Canvas) => {
  await userEvent.click(await canvas.findByRole('button', { name: ME }));
  await expect(canvas.getByRole('button', { name: ME })).toHaveAttribute('aria-expanded', 'true');
};

const meta = preview.meta({
  title: 'Screens/TurnOrder',
  component: TurnOrderScreen,
  parameters: {
    phoneFrame: { overlay: true },
    scenario: playerScenario(ferryCombat({ active: 'vashti' })),
  },
});

export const SetupWaitingForDm = meta.story({
  name: 'Setup Waiting For DM',
  tags: ['visual'],
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup' })) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    await expect(await canvas.findByText(t('waiting'))).toBeVisible();
    await expect(canvas.getByText(t('CombatHeader:setup'))).toBeVisible();
    await expect(canvas.getByText('影の射手ゴブリン')).toBeVisible();
  },
});

export const OtherUnitsHidePrivateFields = meta.story({
  tags: ['visual'],
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
    await userEvent.click(canvas.getByRole('button', { name: t('CombatHeader:menu') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('CombatHeader:heroes') }));
    await waitFor(() => expect(canvas.queryByRole('menuitem')).toBeNull());
  },
});

export const NoUnits = meta.story({
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
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
    const sheet = await canvas.findByRole('dialog', { name: ME });
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
    await expect(within(after).getByRole('button', { name: /^15 \/36/ })).toBeVisible();
  },
});

export const PlayerEditsOwnDefenses = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    await expandOwn(canvas);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: t('PlayerRow:defenses') }));
    const sheet = await canvas.findByRole('dialog', {
      name: t('DefenseSheet:title', { name: ME }),
    });
    const md = sheet.querySelector<HTMLElement>('[data-stat="md"]');
    if (!md) throw new Error('md row missing');
    await userEvent.click(within(md).getByRole('button', { name: t('Stepper:decrease') }));
    await userEvent.click(within(md).getByRole('button', { name: t('Stepper:decrease') }));
    await expect(within(md).getByText('13')).toBeVisible();
    await waitFor(() =>
      expect(sentBy(api)).toEqual([
        expect.objectContaining({ type: 'setDefenseMods', unitId: unitIds.vashti, md: -1 }),
        expect.objectContaining({ type: 'setDefenseMods', unitId: unitIds.vashti, md: -2 }),
      ]),
    );
    const line = (await rowOf(canvas, ME)).querySelector<HTMLElement>(
      '[role="group"]:has(> [data-stat])',
    );
    if (!line) throw new Error('defense line missing');
    await waitFor(() =>
      expect(line.querySelector('[data-stat="md"]')).toHaveAttribute('data-mod', 'down'),
    );
    await expect(line).toHaveAccessibleName(
      new RegExp(`${escapeRegExp(t('DefenseLine:md'))}\\s13$`),
    );
  },
});

export const PlayerCannotEditAlly = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const tomas = await rowOf(canvas, 'Brother Tomas of the Silver Lantern Order');
    await userEvent.click(within(tomas).getByText('Brother Tomas of the Silver Lantern Order'));
    await expect(tomas).not.toHaveAttribute('data-expanded');
    await expect(within(tomas).queryByRole('button', { name: t('PlayerRow:defenses') })).toBeNull();
    await expect(within(tomas).getByRole('group', { name: /17/ })).toBeVisible();
    await expandOwn(canvas);
    const vashti = await rowOf(canvas, ME);
    await expect(
      within(vashti).getByRole('button', { name: t('PlayerRow:defenses') }),
    ).toBeVisible();
  },
});

export const SetOwnMaxHp = meta.story({
  name: 'Set Own Max HP',
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(within(vashti).getByRole('button', { name: /^20 \/36/ }));
    const sheet = await canvas.findByRole('dialog', { name: ME });
    await userEvent.click(within(sheet).getByRole('button', { name: '4' }));
    await userEvent.click(within(sheet).getByRole('button', { name: '0' }));
    await userEvent.click(within(sheet).getByRole('button', { name: t('NumpadSheet:setMax') }));
    await waitFor(() =>
      expect(sentBy(api)).toEqual([
        expect.objectContaining({ type: 'setMaxHp', unitId: unitIds.vashti, amount: 40 }),
      ]),
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const after = await rowOf(canvas, ME);
    await expect(within(after).getByRole('button', { name: /^20 \/40/ })).toBeVisible();
  },
});

export const ReleaseClaim = meta.story({
  tags: ['!dev'],
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

export const EditOwnHeroTypeLocked = meta.story({
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
    const maxHp = within(form).getByRole('spinbutton', { name: t('NumberField:maxHp') });
    await expect(maxHp).toBeEnabled();
    await userEvent.clear(maxHp);
    await userEvent.type(maxHp, '40');
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
          maxHp: 40,
        }),
      ]),
    );
    await expect(await canvas.findByRole('button', { name: 'Vashti the Bold' })).toBeVisible();
  },
});

export const FailedDamageRestoresHp = meta.story({
  tags: ['!dev'],
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
    await expect(within(after).getByRole('button', { name: /^20 \/36/ })).toBeVisible();
  },
});

export const InitiativeBonus = meta.story({
  tags: ['!dev'],
  parameters: { scenario: playerScenario(ferryCombat({ status: 'setup' })) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const vashti = await rowOf(canvas, ME);
    await userEvent.click(
      within(vashti).getByRole('button', {
        name: (label: string) => label.endsWith(t('RoleBlock:you')),
      }),
    );
    const sheet = await canvas.findByRole('dialog', { name: t('InitiativeSheet:title') });
    await expect(
      within(sheet).getByRole('button', {
        name: (label: string) => label.startsWith(t('InitiativeSheet:roll', { bonus: '+2' })),
      }),
    ).toBeVisible();
  },
});

export const OwnTurn = meta.story({
  play: async ({ canvas }) => {
    const vashti = await rowOf(canvas, ME);
    await expect(vashti).toHaveAttribute('data-active');
    await expect(within(vashti).getByRole('button', { name: /^20 \/36/ })).toBeVisible();
  },
});

export const OwnRowExpanded = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    await expandOwn(canvas);
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getByText('Hex on Orc Berserker')).toBeVisible();
  },
});

export const YouAreNext = meta.story({
  tags: ['visual'],
  parameters: { scenario: playerScenario(ferryCombat({ active: 'orc' })) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const strip = await canvas.findByRole('button', { name: t('youAreNext') });
    await expect(strip).toBeVisible();
    await expect(strip).toHaveAttribute('data-kind', 'next');
    await expect(strip.getBoundingClientRect().height).toBe(44);
  },
});

export const YourTurn = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const strip = await canvas.findByRole('button', { name: t('yourTurn', { name: ME }) });
    await expect(strip).toHaveAttribute('data-kind', 'turn');
    await expect(canvas.queryByRole('button', { name: t('youAreNext') })).toBeNull();
    const header = canvas.getByRole('banner');
    await waitFor(() =>
      expect(strip.getBoundingClientRect().top).toBeCloseTo(
        Math.max(
          header.getBoundingClientRect().bottom,
          listViewport(canvasElement).getBoundingClientRect().top,
        ),
        0,
      ),
    );
  },
});

export const YourTurnScrollsToHero = meta.story({
  tags: ['!dev'],
  parameters: {
    scenario: playerScenario(crowded(ferryCombat({ active: 'tomas', vashtiInitiative: 1 }), 16)),
  },
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'TurnOrder');
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await expect(vashti.getBoundingClientRect().top).toBeGreaterThan(
      listViewport(canvasElement).getBoundingClientRect().bottom,
    );
    await actAsDm(api, { type: 'nextTurn' });
    const strip = await canvas.findByRole('button', { name: t('yourTurn', { name: ME }) });
    await expectInView(canvasElement, vashti);
    await expect(strip).toBeVisible();
    await expect(strip.getBoundingClientRect().top).toBeCloseTo(
      listViewport(canvasElement).getBoundingClientRect().top,
      0,
    );
  },
});

export const StripTapScrollsToHero = meta.story({
  tags: ['!dev'],
  parameters: {
    scenario: playerScenario(crowded(ferryCombat({ active: 'orc' }), 5)),
  },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'TurnOrder');
    const vashti = await rowOf(canvas, ME);
    const viewport = listViewport(canvasElement);
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
    await waitFor(() =>
      expect(vashti.getBoundingClientRect().bottom).toBeLessThan(
        viewport.getBoundingClientRect().top,
      ),
    );
    await userEvent.click(canvas.getByRole('button', { name: t('youAreNext') }));
    await expectInView(canvasElement, vashti);
  },
});

const hpChangeIn = (row: HTMLElement, part: 'number' | 'badge' | 'ribbon') =>
  row.querySelector<HTMLElement>(`[data-hp-change="${part}"]`);

export const RemoteChangeAnimates = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await expect(hpChangeIn(vashti, 'number')).toBeNull();
    api.deferBroadcasts();
    await actAsDm(api, { type: 'damage', unitId: unitIds.vashti, amount: 3 });
    await waitFor(() => expect(hpChangeIn(vashti, 'number')).toHaveTextContent('−3'));
    await expect(hpChangeIn(vashti, 'badge')).toBeNull();
    await expect(await within(vashti).findByRole('button', { name: /^17 \/36/ })).toBeVisible();
  },
});

export const ReducedMotionBadge = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    const vashti = await rowOf(canvas, ME);
    await actAsDm(api, { type: 'damage', unitId: unitIds.vashti, amount: 3 });
    await waitFor(() => expect(hpChangeIn(vashti, 'badge')).toHaveTextContent('−3'));
    await expect(hpChangeIn(vashti, 'number')).toBeNull();
    await expect(within(vashti).getByRole('button', { name: /^17 \/36/ })).toBeVisible();
    await waitFor(() => expect(hpChangeIn(vashti, 'badge')).toBeNull(), { timeout: 3000 });
  },
});

export const BracketOnPlayerList = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement }) => {
    const bar = canvasElement.querySelector('[data-turn-bracket]');
    if (!(bar instanceof HTMLElement)) throw new Error('The turn bracket is missing');
    const vashti = await rowOf(canvas, ME);
    await expect(vashti).toHaveAttribute('data-active');
    await waitFor(async () => {
      await expect(bar).toBeVisible();
      const box = bar.getBoundingClientRect();
      const card = vashti.getBoundingClientRect();
      await expect(
        Math.abs(box.top + box.height / 2 - (card.top + card.height / 2)),
      ).toBeLessThanOrEqual(1);
      await expect(box.right).toBeLessThan(card.left);
    });
  },
});
