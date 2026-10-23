import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
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
import { anyValue, collapsedSpace, storyT } from '../../storybook/storyT.ts';
import { storyLocale } from '../../storybook/withLocale.tsx';

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

function HoldFirstCall({ children }: { children: ReactNode }) {
  const api = useApi();
  useState(() => {
    if (api instanceof FakeApiClient) api.holdNext();
    return true;
  });
  return children;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

const detailsOf = (t: TFunction, title: string) => t('CombatCard:details', { title });

const titlesOf = (canvas: Canvas, t: TFunction): string[] => {
  const [before = '', after = ''] = detailsOf(t, '\n').split('\n');
  return canvas
    .getAllByRole('button', { name: anyValue(t, 'CombatCard:details', 'title') })
    .map((button: HTMLElement) => {
      const label = button.getAttribute('aria-label') ?? '';
      return label.slice(before.length, label.length - after.length);
    });
};

const expand = async (canvas: Canvas, title: string, t: TFunction) => {
  await userEvent.click(await canvas.findByRole('button', { name: detailsOf(t, title) }));
};

const openMenu = async (canvas: Canvas, t: TFunction) => {
  await expand(canvas, ambush.title, t);
  await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
  await expect(canvas.getByRole('menuitem', { name: t('Menu:duplicate') })).toBeVisible();
};

const openSheet = async (canvas: Canvas, opener: HTMLElement, name: string) => {
  await userEvent.click(opener);
  const sheet = await canvas.findByRole('dialog', { name });
  await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
  await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'));
  return sheet;
};

const openCreate = async (canvas: Canvas, t: TFunction) => {
  await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
  return openSheet(
    canvas,
    canvas.getByRole('button', { name: t('Button:newCombat') }),
    t('Button:newCombat'),
  );
};

const fillCreate = async (canvas: Canvas, t: TFunction) => {
  const title = canvas.getByRole('textbox', { name: t('CombatFormSheet:title') });
  await userEvent.click(title);
  await userEvent.type(title, 'Siege of Greyhold');
  await userEvent.click(canvas.getByRole('button', { name: t('Swatch:blue') }));
};

const openEdit = async (canvas: Canvas, t: TFunction) => {
  await expand(canvas, ambush.title, t);
  return openSheet(
    canvas,
    canvas.getByRole('button', { name: t('CardActions:edit') }),
    t('Sheet:editCombat'),
  );
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

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await expect(titlesOf(canvas, t)).toEqual(listCombats.map((combat) => combat.title));
    await expect(canvas.getByRole('button', { name: t('sort') })).toBeVisible();
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).toContain('combats.list');
    const chevron = canvas.getByRole('button', { name: detailsOf(t, ambush.title) });
    chevron.focus();
    await expect(chevron).toHaveFocus();
  },
});

export const CardExpanded = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await expand(canvas, ambush.title, t);
    await expect(canvas.getByText(ambush.description)).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: detailsOf(t, ambush.title) })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
});

export const SortSheetOpen = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    const sheet = await openSheet(
      canvas,
      canvas.getByRole('button', { name: t('sort') }),
      t('Sheet:sortCombats'),
    );
    await waitFor(() => expect(sheet).toBeVisible());
    await expect(canvas.getByRole('radio', { name: t('Radio:newestFirst') })).toBeChecked();
  },
});

export const SortedByLastPlayed = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.click(canvas.getByRole('button', { name: t('sort') }));
    await userEvent.click(await canvas.findByRole('radio', { name: t('Radio:lastPlayed') }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('Radio:lastPlayed') })).toBeVisible();
    await expect(localStorage.getItem(COMBAT_SORT_KEY)).toBe('lastPlayed');
    await expect(titlesOf(canvas, t)).toEqual([
      'Lich King’s Antechamber',
      'Ambush at the Ferry',
      'The Drowned Chapel',
      '黒水の渡し守',
      'Капитан стражи переправы: засада у моста',
      'Bandits on the Old Road',
    ]);
    await expect(
      canvas.getByText(
        `${t('CombatCard:round', { round: 7 })} · ${t('CombatCard:units', { count: 11 })} · ${t('CombatCard:today')}`,
      ),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        `${t('CombatCard:round', { round: 3 })} · ${t('CombatCard:units', { count: 6 })} · ${t('CombatCard:yesterday')}`,
      ),
    ).toBeVisible();
    await expect(
      canvas.getAllByText(
        `${t('CombatCard:units', { count: 0 })} · ${t('CombatCard:neverPlayed')}`,
      ),
    ).toHaveLength(1);
  },
});

export const SearchResults = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.type(canvas.getByRole('searchbox'), 'ferry');
    await expect(titlesOf(canvas, t)).toEqual([
      'Ambush at the Ferry',
      'Капитан стражи переправы: засада у моста',
      '黒水の渡し守',
    ]);
  },
});

export const NothingFound = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.type(canvas.getByRole('searchbox'), 'dragon');
    await expect(canvas.getByRole('heading', { name: t('UnitForm:nothingFound') })).toBeVisible();
    await expect(
      canvas.getByText(collapsedSpace(t('EmptyState:noResultsBody', { query: 'dragon' }))),
    ).toBeVisible();
    await expect(
      canvas.queryAllByRole('button', { name: anyValue(t, 'CombatCard:details', 'title') }),
    ).toHaveLength(0);
  },
});

export const NoCombatsYet = meta.story({
  tags: ['visual'],
  parameters: { scenario: noCombatsScenario },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await expect(
      await canvas.findByRole('heading', { name: t('EmptyState:noCombatsTitle') }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('sort') })).toBeNull();
    await expect(canvas.getByRole('button', { name: t('Button:newCombat') })).toBeEnabled();
  },
});

export const CreateSendsPayload = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openCreate(canvas, t);
    await fillCreate(canvas, t);
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
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
    await waitFor(() => expect(titlesOf(canvas, t)[0]).toBe('Siege of Greyhold'));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(locationOf(canvasElement)).toBe('/combats');
  },
});

export const EditSavedToCard = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openEdit(canvas, t);
    const title = canvas.getByRole('textbox', { name: t('CombatFormSheet:title') });
    await userEvent.click(title);
    await userEvent.type(title, ', part 2');
    await userEvent.click(canvas.getByRole('button', { name: t('Swatch:ochre') }));
    await userEvent.click(canvas.getByRole('button', { name: t('Button:save') }));
    const updates = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.update');
    await expect(updates).toHaveLength(1);
    await expect(updates[0]!.args).toEqual([
      ambush.id,
      { title: 'Ambush at the Ferry, part 2', description: ambush.description, color: 2 },
    ]);
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(titlesOf(canvas, t)[0]).toBe('Ambush at the Ferry, part 2'));
  },
});

export const DuplicateToast = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Menu:duplicate') }));
    const copies = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.duplicate');
    await expect(copies).toHaveLength(1);
    const [source, copyId] = copies[0]!.args as [string, string];
    await expect(source).toBe(ambush.id);
    await expect(copyId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:duplicated', { title: 'Ambush at the Ferry' }),
    );
    await waitFor(() => expect(titlesOf(canvas, t)[0]).toBe('Ambush at the Ferry (copy)'));
  },
});

export const DeleteConfirmation = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Button:delete') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:deleteCombatTitle', { name: 'Ambush at the Ferry' }),
    });
    await expect(dialog).toHaveAccessibleDescription(t('Dialog:deleteCombatBody', { count: 6 }));
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.remove'),
    ).toHaveLength(0);
  },
});

export const DeleteToast = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Button:delete') }));
    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t('Button:delete') }));
    const removed = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.remove');
    await expect(removed).toHaveLength(1);
    await expect(removed[0]!.args).toEqual([ambush.id]);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:deleted', { title: 'Ambush at the Ferry' }),
    );
    await waitFor(() => expect(titlesOf(canvas, t)).not.toContain(ambush.title));
  },
});

export const NavigationDrawerOpen = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.click(canvas.getByRole('button', { name: t('IconButton:openNavigation') }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await expect(within(drawer).getByRole('button', { name: t('title') })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(within(drawer).getByText('dm@ferry.games')).toBeVisible();
  },
});

export const SortRemembered = meta.story({
  tags: ['!dev'],
  beforeEach: () => {
    localStorage.setItem(COMBAT_SORT_KEY, 'lastPlayed');
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await expect(canvas.getByRole('button', { name: t('Radio:lastPlayed') })).toBeVisible();
    await expect(titlesOf(canvas, t)[0]).toBe('Lich King’s Antechamber');
  },
});

export const Alphabetical = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.click(canvas.getByRole('button', { name: t('sort') }));
    await userEvent.click(await canvas.findByRole('radio', { name: t('RadioList:alphabetical') }));
    await expect(canvas.getByRole('button', { name: t('RadioList:alphabetical') })).toBeVisible();
    await expect(localStorage.getItem(COMBAT_SORT_KEY)).toBe('alphabetical');
    await expect(titlesOf(canvas, t)).toEqual(
      listCombats
        .map((combat) => combat.title)
        .toSorted((a, b) => a.localeCompare(b, storyLocale(globals))),
    );
  },
});

export const CombatLimitReached = meta.story({
  parameters: { scenario: fullScenario },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, 'Encounter 1') });
    const create = canvas.getByRole('button', { name: t('Button:newCombat') });
    await expect(create).toBeDisabled();
    await expect(create).toHaveAccessibleDescription(t('BottomBar:combatLimitReached'));
    await userEvent.click(create, { pointerEventsCheck: 0 });
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.create'),
    ).toHaveLength(0);
  },
});

export const DeleteCancelled = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Button:delete') }));
    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t('Button:cancel') }));
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.remove'),
    ).toHaveLength(0);
    await expect(titlesOf(canvas, t)).toContain(ambush.title);
  },
});

export const CantReachServer = meta.story({
  render: (args) => (
    <FailFirstCall code="network">
      <CombatList {...args} />
      <LocationProbe />
    </FailFirstCall>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await expect(
      await canvas.findByRole('heading', { level: 1, name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') })).toBeVisible();
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
  },
});

export const TryAgainReloads = meta.story({
  tags: ['!dev'],
  render: (args) => (
    <FailFirstCall code="network">
      <CombatList {...args} />
      <LocationProbe />
    </FailFirstCall>
  ),
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await userEvent.click(await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }));
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.list'),
    ).toHaveLength(2);
  },
});

export const CreateRetry = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    const api = fakeApiOf(loaded);
    await openCreate(canvas, t);
    await fillCreate(canvas, t);
    api.failNext('network');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await expect(await canvas.findByRole('button', { name: t('Sheet:create') })).toBeDisabled();
    await userEvent.click(await canvas.findByRole('button', { name: t('Toast:retry') }));
    const created = api.calls.filter((call) => call.method === 'combats.create');
    await expect(created).toHaveLength(2);
    const [first] = created[0]!.args as [{ id: string }];
    const [second] = created[1]!.args as [{ id: string }];
    await expect(second.id).toBe(first.id);
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(locationOf(canvasElement)).toBe('/combats');
  },
});

export const DuplicateAtLimit = meta.story({
  tags: ['!dev'],
  parameters: { scenario: fullScenario },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await expand(canvas, 'Encounter 1', t);
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    const duplicate = await canvas.findByRole('menuitem', { name: t('Menu:duplicate') });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.duplicate'),
    ).toHaveLength(0);
  },
});

export const Loading = meta.story({
  render: (args) => (
    <HoldFirstCall>
      <CombatList {...args} />
      <LocationProbe />
    </HoldFirstCall>
  ),
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await waitFor(() =>
      expect(fakeApiOf(loaded).calls.map((call) => call.method)).toContain('combats.list'),
    );
    await expect(canvas.getByRole('button', { name: t('Button:newCombat') })).toBeDisabled();
    await expect(
      canvas.queryByRole('button', { name: anyValue(t, 'CombatCard:details', 'title') }),
    ).toBeNull();
    await expect(canvas.queryByText(t('EmptyState:noCombatsTitle'))).toBeNull();
    await expect(canvas.queryByRole('button', { name: t('sort') })).toBeNull();
  },
});
