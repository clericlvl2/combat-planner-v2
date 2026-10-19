import preview from '#.storybook/preview';
import type { ApiErrorCode } from '@combat-planner/api/client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useApi } from '../../api/ApiProvider.tsx';
import { FakeApiClient } from '../../api/FakeApiClient.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { COMBAT_SORT_KEY, CombatList } from './CombatList.tsx';
import {
  fullScenario,
  listCombats,
  listScenario,
  noCombatsScenario,
  storyNow,
} from './CombatList.scenarios.ts';

type Canvas = ReturnType<typeof within>;

const ambush = listCombats[0]!;

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

function FailFirstCall({ code, children }: { code: ApiErrorCode; children: ReactNode }) {
  const api = useApi();
  useState(() => {
    if (api instanceof FakeApiClient) api.failNext(code);
    return code;
  });
  return children;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

const detailsPrefix = 'Details for ';

const titlesOf = (canvas: Canvas): string[] =>
  canvas
    .getAllByRole('button', { name: /^Details for / })
    .map((button: HTMLElement) =>
      (button.getAttribute('aria-label') ?? '').slice(detailsPrefix.length),
    );

const expand = async (canvas: Canvas, title: string) => {
  await userEvent.click(await canvas.findByRole('button', { name: `${detailsPrefix}${title}` }));
};

const openMenu = async (canvas: Canvas) => {
  await expand(canvas, ambush.title);
  await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
  await expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
};

const openSheet = async (canvas: Canvas, opener: HTMLElement, name: string) => {
  await userEvent.click(opener);
  const sheet = await canvas.findByRole('dialog', { name });
  await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
  await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'));
  return sheet;
};

const openCreate = async (canvas: Canvas) => {
  await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
  return openSheet(canvas, canvas.getByRole('button', { name: 'New combat' }), 'New combat');
};

const fillCreate = async (canvas: Canvas) => {
  const title = canvas.getByRole('textbox', { name: 'Title' });
  await userEvent.click(title);
  await userEvent.type(title, 'Siege of Greyhold');
  await userEvent.click(canvas.getByRole('button', { name: 'Blue' }));
};

const openEdit = async (canvas: Canvas) => {
  await expand(canvas, ambush.title);
  return openSheet(canvas, canvas.getByRole('button', { name: 'Edit' }), 'Edit combat');
};

const meta = preview.meta({
  title: 'Screens/CombatList',
  component: CombatList,
  decorators: [withRouter],
  args: { now: storyNow },
  render: (args) => (
    <>
      <CombatList {...args} />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: { overlay: true },
    scenario: listScenario,
    reactRouter: reactRouterParameters({
      location: { path: '/combats' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
  beforeEach: () => {
    localStorage.removeItem(COMBAT_SORT_KEY);
    return () => localStorage.removeItem(COMBAT_SORT_KEY);
  },
});

export const CLF11 = meta.story({
  name: 'CL-F1.1 List, Newest first',
  play: async ({ canvas, loaded }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await expect(titlesOf(canvas)).toEqual(listCombats.map((combat) => combat.title));
    await expect(canvas.getByRole('button', { name: 'Sort' })).toBeVisible();
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).toContain('combats.list');
    const chevron = canvas.getByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    chevron.focus();
    await expect(chevron).toHaveFocus();
  },
});

export const CLF12 = meta.story({
  name: 'CL-F1.2 Card expanded',
  play: async ({ canvas }) => {
    await expand(canvas, ambush.title);
    await expect(canvas.getByText(ambush.description)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: `${detailsPrefix}${ambush.title}` }),
    ).toHaveAttribute('aria-expanded', 'true');
  },
});

export const CLF13 = meta.story({
  name: 'CL-F1.3 Sort sheet',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    const sheet = await openSheet(
      canvas,
      canvas.getByRole('button', { name: 'Sort' }),
      'Sort combats',
    );
    await waitFor(() => expect(sheet).toBeVisible());
    await expect(canvas.getByRole('radio', { name: 'Newest first' })).toBeChecked();
  },
});

export const CLF14 = meta.story({
  name: 'CL-F1.4 Last played: button filled',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    await userEvent.click(await canvas.findByRole('radio', { name: 'Last played' }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(canvas.getByRole('button', { name: 'Last played' })).toBeVisible();
    await expect(localStorage.getItem(COMBAT_SORT_KEY)).toBe('lastPlayed');
    await expect(titlesOf(canvas)).toEqual([
      'Lich King’s Antechamber',
      'Ambush at the Ferry',
      'The Drowned Chapel',
      '黒水の渡し守',
      'Капитан стражи переправы: засада у моста',
      'Bandits on the Old Road',
    ]);
    await expect(canvas.getByText('Round 7 · 11 units · Today')).toBeVisible();
    await expect(canvas.getByText('Round 3 · 6 units · Yesterday')).toBeVisible();
    await expect(canvas.getAllByText('0 units · Never played')).toHaveLength(1);
  },
});

export const CLF15 = meta.story({
  name: 'CL-F1.5 Search “ferry”',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await userEvent.type(canvas.getByRole('searchbox'), 'ferry');
    await expect(titlesOf(canvas)).toEqual([
      'Ambush at the Ferry',
      'Капитан стражи переправы: засада у моста',
      '黒水の渡し守',
    ]);
  },
});

export const CLF16 = meta.story({
  name: 'CL-F1.6 Nothing found',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await userEvent.type(canvas.getByRole('searchbox'), 'dragon');
    await expect(canvas.getByRole('heading', { name: 'Nothing found' })).toBeVisible();
    await expect(canvas.getByText('No combat matches “dragon”.')).toBeVisible();
    await expect(canvas.queryAllByRole('button', { name: /^Details for / })).toHaveLength(0);
  },
});

export const CLF17 = meta.story({
  name: 'CL-F1.7 No combats yet',
  parameters: { scenario: noCombatsScenario },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'No combats yet' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Sort' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'New combat' })).toBeEnabled();
  },
});

export const CLF21 = meta.story({
  name: 'CL-F2.1 Tap New combat',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    const create = canvas.getByRole('button', { name: 'New combat' });
    await expect(create).toBeEnabled();
    create.focus();
    await expect(create).toHaveFocus();
  },
});

export const CLF22 = meta.story({
  name: 'CL-F2.2 Empty form',
  play: async ({ canvas }) => {
    await openCreate(canvas);
    await expect(canvas.getByRole('textbox', { name: 'Title' })).toHaveValue('');
    await expect(canvas.getByRole('button', { name: 'Grey' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled();
  },
});

export const CLF23 = meta.story({
  name: 'CL-F2.3 Error: no title',
  play: async ({ canvas, loaded }) => {
    await openCreate(canvas);
    await userEvent.click(canvas.getByRole('textbox', { name: 'Title' }));
    await userEvent.tab();
    await expect(canvas.getByText('Enter a title')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }), {
      pointerEventsCheck: 0,
    });
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.create'),
    ).toHaveLength(0);
  },
});

export const CLF24 = meta.story({
  name: 'CL-F2.4 Form filled',
  play: async ({ canvas }) => {
    await openCreate(canvas);
    await fillCreate(canvas);
    await expect(canvas.getByText('17/80')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Blue' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Create' })).toBeEnabled();
  },
});

export const CLF25 = meta.story({
  name: 'CL-F2.5 Combat created',
  play: async ({ canvas, canvasElement, loaded }) => {
    await openCreate(canvas);
    await fillCreate(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    const created = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.create');
    await expect(created).toHaveLength(1);
    const [input] = created[0]!.args as [{ id: string }];
    await expect(input).toEqual({
      id: input.id,
      title: 'Siege of Greyhold',
      description: '',
      color: 5,
    });
    await expect(input.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${input.id}`));
    await waitFor(() => expect(titlesOf(canvas)[0]).toBe('Siege of Greyhold'));
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const CLF31 = meta.story({
  name: 'CL-F3.1 Tap Edit',
  play: async ({ canvas }) => {
    await expand(canvas, ambush.title);
    const edit = canvas.getByRole('button', { name: 'Edit' });
    await expect(edit).toBeEnabled();
    edit.focus();
    await expect(edit).toHaveFocus();
  },
});

export const CLF32 = meta.story({
  name: 'CL-F3.2 Edit form',
  play: async ({ canvas }) => {
    await openEdit(canvas);
    await expect(canvas.getByRole('textbox', { name: 'Title' })).toHaveValue(ambush.title);
    await expect(canvas.getByRole('textbox', { name: 'Description' })).toHaveValue(
      ambush.description,
    );
    await expect(canvas.getByRole('button', { name: 'Red' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeEnabled();
  },
});

export const CLF33 = meta.story({
  name: 'CL-F3.3 Card updated',
  play: async ({ canvas, loaded }) => {
    await openEdit(canvas);
    const title = canvas.getByRole('textbox', { name: 'Title' });
    await userEvent.click(title);
    await userEvent.type(title, ', part 2');
    await userEvent.click(canvas.getByRole('button', { name: 'Ochre' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    const updates = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.update');
    await expect(updates).toHaveLength(1);
    await expect(updates[0]!.args).toEqual([
      ambush.id,
      { title: 'Ambush at the Ferry, part 2', description: ambush.description, color: 2 },
    ]);
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(titlesOf(canvas)[0]).toBe('Ambush at the Ferry, part 2'));
  },
});

export const CLF41 = meta.story({
  name: 'CL-F4.1 ⋯ → Duplicate',
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  },
});

export const CLF42 = meta.story({
  name: 'CL-F4.2 Copy created',
  play: async ({ canvas, loaded }) => {
    await openMenu(canvas);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Duplicate' }));
    const copies = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.duplicate');
    await expect(copies).toHaveLength(1);
    const [source, copyId] = copies[0]!.args as [string, string];
    await expect(source).toBe(ambush.id);
    await expect(copyId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Ambush at the Ferry (copy) created',
    );
    await waitFor(() => expect(titlesOf(canvas)[0]).toBe('Ambush at the Ferry (copy)'));
  },
});

export const CLF51 = meta.story({
  name: 'CL-F5.1 ⋯ → Delete',
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  },
});

export const CLF52 = meta.story({
  name: 'CL-F5.2 Confirmation',
  play: async ({ canvas, loaded }) => {
    await openMenu(canvas);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Delete' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete Ambush at the Ferry?' });
    await expect(dialog).toHaveAccessibleDescription(
      'The combat, its 6 units and the player link are deleted. This can’t be undone.',
    );
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.remove'),
    ).toHaveLength(0);
  },
});

export const CLF53 = meta.story({
  name: 'CL-F5.3 Combat deleted',
  play: async ({ canvas, loaded }) => {
    await openMenu(canvas);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Delete' }));
    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    const removed = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.remove');
    await expect(removed).toHaveLength(1);
    await expect(removed[0]!.args).toEqual([ambush.id]);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Ambush at the Ferry deleted',
    );
    await waitFor(() => expect(titlesOf(canvas)).not.toContain(ambush.title));
  },
});

export const CLF61 = meta.story({
  name: 'CL-F6.1 Tap the burger',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    const burger = canvas.getByRole('button', { name: 'Open navigation' });
    await expect(burger).toBeEnabled();
    burger.focus();
    await expect(burger).toHaveFocus();
  },
});

export const CLF62 = meta.story({
  name: 'CL-F6.2 Drawer open',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await userEvent.click(canvas.getByRole('button', { name: 'Open navigation' }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await expect(within(drawer).getByRole('button', { name: 'Combats' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(within(drawer).getByText('dm@ferry.games')).toBeVisible();
  },
});

export const ExtraSortRemembered = meta.story({
  name: 'Sort remembered after a remount',
  beforeEach: () => {
    localStorage.setItem(COMBAT_SORT_KEY, 'lastPlayed');
  },
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await expect(canvas.getByRole('button', { name: 'Last played' })).toBeVisible();
    await expect(titlesOf(canvas)[0]).toBe('Lich King’s Antechamber');
  },
});

export const ExtraAlphabetical = meta.story({
  name: 'Sort A–Z',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    await userEvent.click(await canvas.findByRole('radio', { name: 'A–Z' }));
    await expect(canvas.getByRole('button', { name: 'A–Z' })).toBeVisible();
    await expect(localStorage.getItem(COMBAT_SORT_KEY)).toBe('alphabetical');
    await expect(titlesOf(canvas)).toEqual(
      listCombats.map((combat) => combat.title).toSorted((a, b) => a.localeCompare(b, 'en')),
    );
  },
});

export const ExtraLimitReached = meta.story({
  name: 'Limit reached',
  parameters: { scenario: fullScenario },
  play: async ({ canvas, loaded }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}Encounter 1` });
    const create = canvas.getByRole('button', { name: 'New combat' });
    await expect(create).toBeDisabled();
    await expect(create).toHaveAccessibleDescription('Combat limit reached');
    await userEvent.click(create, { pointerEventsCheck: 0 });
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.create'),
    ).toHaveLength(0);
  },
});

export const ExtraOpenCombat = meta.story({
  name: 'Tap a card opens the combat',
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^The Drowned Chapel/ }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${listCombats[1]!.id}`));
  },
});

export const ExtraDrawerLibrary = meta.story({
  name: 'Drawer: Library',
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await userEvent.click(canvas.getByRole('button', { name: 'Open navigation' }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await userEvent.click(within(drawer).getByRole('button', { name: 'Library' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/library'));
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraDeleteCancelled = meta.story({
  name: 'Delete cancelled',
  play: async ({ canvas, loaded }) => {
    await openMenu(canvas);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Delete' }));
    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.remove'),
    ).toHaveLength(0);
    await expect(titlesOf(canvas)).toContain(ambush.title);
  },
});

export const ExtraRussian = meta.story({
  name: 'Russian: list',
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Бои' })).toBeVisible();
    await expect(await canvas.findByText('Капитан стражи переправы: засада у моста')).toBeVisible();
  },
});

export const ExtraFirstLoadFails = meta.story({
  name: 'A failed first load shows Can’t reach the server with Try again',
  render: (args) => (
    <FailFirstCall code="network">
      <CombatList {...args} />
      <LocationProbe />
    </FailFirstCall>
  ),
  play: async ({ canvas, loaded }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Try again' }));
    await canvas.findByRole('button', { name: `${detailsPrefix}${ambush.title}` });
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.list'),
    ).toHaveLength(2);
  },
});

export const ExtraSignedOut = meta.story({
  name: 'An unauthorized first load goes to sign-in',
  render: (args) => (
    <FailFirstCall code="unauthorized">
      <CombatList {...args} />
      <LocationProbe />
    </FailFirstCall>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/auth/sign-in'));
  },
});

export const ExtraCreateRetry = meta.story({
  name: 'Create is disabled in flight; Retry creates once with the same id and opens the combat',
  play: async ({ canvas, canvasElement, loaded }) => {
    const api = fakeApiOf(loaded);
    await openCreate(canvas);
    await fillCreate(canvas);
    api.failNext('network');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByRole('button', { name: 'Create' })).toBeDisabled();
    await userEvent.click(await canvas.findByRole('button', { name: 'Retry' }));
    const created = api.calls.filter((call) => call.method === 'combats.create');
    await expect(created).toHaveLength(2);
    const [first] = created[0]!.args as [{ id: string }];
    const [second] = created[1]!.args as [{ id: string }];
    await expect(second.id).toBe(first.id);
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${first.id}`));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraDuplicateAtLimit = meta.story({
  name: 'Duplicate is disabled at the combat limit',
  parameters: { scenario: fullScenario },
  play: async ({ canvas, loaded }) => {
    await expand(canvas, 'Encounter 1');
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    const duplicate = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.duplicate'),
    ).toHaveLength(0);
  },
});

export const ExtraKindIcons = meta.story({
  name: 'Toast icons follow the toast kind',
  play: async ({ canvas }) => {
    await openMenu(canvas);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Duplicate' }));
    const toast = await canvas.findByRole('status');
    await expect(toast.querySelector('.tabler-icon-check')).not.toBeNull();
  },
});
