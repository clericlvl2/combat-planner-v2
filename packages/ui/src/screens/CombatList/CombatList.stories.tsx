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
import { anyValue, storyT } from '../../storybook/storyT.ts';
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

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

const detailsOf = (t: TFunction, title: string) => t('CombatCard:details', { title });

const titlesOf = (canvas: Canvas, t: TFunction): string[] => {
  const [before = '', after = ''] = detailsOf(t, '\n').split('\n');
  return canvas
    .getAllByRole('button', { name: anyValue((title) => detailsOf(t, title)) })
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

const defaultTitle = (t: TFunction, globals: Record<string, unknown>) =>
  t('CombatFormSheet:defaultTitle', {
    date: new Intl.DateTimeFormat(storyLocale(globals), { day: 'numeric', month: 'short' }).format(
      storyNow,
    ),
  });

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
  tags: ['visual'],
  name: 'CL-F1.1 List, Newest first',
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

export const CLF12 = meta.story({
  tags: ['visual'],
  name: 'CL-F1.2 Card expanded',
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

export const CLF13 = meta.story({
  tags: ['visual'],
  name: 'CL-F1.3 Sort sheet',
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

export const CLF14 = meta.story({
  name: 'CL-F1.4 Last played: button filled',
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

export const CLF15 = meta.story({
  name: 'CL-F1.5 Search “ferry”',
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

export const CLF16 = meta.story({
  tags: ['visual'],
  name: 'CL-F1.6 Nothing found',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.type(canvas.getByRole('searchbox'), 'dragon');
    await expect(canvas.getByRole('heading', { name: t('UnitForm:nothingFound') })).toBeVisible();
    await expect(
      canvas.getByText(t('EmptyState:noResultsBody', { query: 'dragon' })),
    ).toBeVisible();
    await expect(
      canvas.queryAllByRole('button', { name: anyValue((title) => detailsOf(t, title)) }),
    ).toHaveLength(0);
  },
});

export const CLF17 = meta.story({
  tags: ['visual'],
  name: 'CL-F1.7 No combats yet',
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

export const CLF21 = meta.story({
  name: 'CL-F2.1 Tap New combat',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    const create = canvas.getByRole('button', { name: t('Button:newCombat') });
    await expect(create).toBeEnabled();
    create.focus();
    await expect(create).toHaveFocus();
  },
});

export const CLF22 = meta.story({
  name: 'CL-F2.2 Empty form',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await openCreate(canvas, t);
    await expect(canvas.getByRole('textbox', { name: t('CombatFormSheet:title') })).toHaveValue('');
    await expect(canvas.getByRole('button', { name: t('Swatch:grey') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('textbox', { name: t('CombatFormSheet:title') })).toHaveAttribute(
      'placeholder',
      defaultTitle(t, globals),
    );
    await expect(canvas.getByRole('button', { name: t('Sheet:create') })).toBeEnabled();
  },
});

export const CLF23 = meta.story({
  name: 'CL-F2.3 No title: created as "Combat Oct 15"',
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await openCreate(canvas, t);
    await userEvent.click(canvas.getByRole('textbox', { name: t('CombatFormSheet:title') }));
    await userEvent.tab();
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    const created = fakeApiOf(loaded).calls.filter((call) => call.method === 'combats.create');
    await expect(created).toHaveLength(1);
    const [input] = created[0]!.args as [{ id: string }];
    await expect(input).toEqual({
      id: input.id,
      title: defaultTitle(t, globals),
      description: '',
      color: 7,
    });
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${input.id}`));
  },
});

export const CLF24 = meta.story({
  name: 'CL-F2.4 Form filled',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await openCreate(canvas, t);
    await fillCreate(canvas, t);
    await expect(canvas.getByText('17/80')).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Swatch:blue') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('Sheet:create') })).toBeEnabled();
  },
});

export const CLF25 = meta.story({
  name: 'CL-F2.5 Combat created',
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
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${input.id}`));
    await waitFor(() => expect(titlesOf(canvas, t)[0]).toBe('Siege of Greyhold'));
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const CLF31 = meta.story({
  name: 'CL-F3.1 Tap Edit',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await expand(canvas, ambush.title, t);
    const edit = canvas.getByRole('button', { name: t('CardActions:edit') });
    await expect(edit).toBeEnabled();
    edit.focus();
    await expect(edit).toHaveFocus();
  },
});

export const CLF32 = meta.story({
  name: 'CL-F3.2 Edit form',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await openEdit(canvas, t);
    await expect(canvas.getByRole('textbox', { name: t('CombatFormSheet:title') })).toHaveValue(
      ambush.title,
    );
    await expect(
      canvas.getByRole('textbox', { name: t('CombatFormSheet:description') }),
    ).toHaveValue(ambush.description);
    await expect(canvas.getByRole('button', { name: t('Swatch:red') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('Button:save') })).toBeEnabled();
  },
});

export const CLF33 = meta.story({
  name: 'CL-F3.3 Card updated',
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

export const CLF41 = meta.story({
  name: 'CL-F4.1 ⋯ → Duplicate',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await expect(canvas.getByRole('menuitem', { name: t('Button:delete') })).toBeVisible();
  },
});

export const CLF42 = meta.story({
  name: 'CL-F4.2 Copy created',
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

export const CLF51 = meta.story({
  name: 'CL-F5.1 ⋯ → Delete',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: t('Button:delete') })).toHaveFocus();
  },
});

export const CLF52 = meta.story({
  name: 'CL-F5.2 Confirmation',
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

export const CLF53 = meta.story({
  name: 'CL-F5.3 Combat deleted',
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

export const CLF61 = meta.story({
  name: 'CL-F6.1 Tap the burger',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    const burger = canvas.getByRole('button', { name: t('IconButton:openNavigation') });
    await expect(burger).toBeEnabled();
    burger.focus();
    await expect(burger).toHaveFocus();
  },
});

export const CLF62 = meta.story({
  name: 'CL-F6.2 Drawer open',
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

export const ExtraSortRemembered = meta.story({
  name: 'Sort remembered after a remount',
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

export const ExtraAlphabetical = meta.story({
  name: 'Sort A–Z',
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

export const ExtraLimitReached = meta.story({
  name: 'Limit reached',
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

export const ExtraOpenCombat = meta.story({
  name: 'Tap a card opens the combat',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatList');
    await userEvent.click(
      await canvas.findByRole('button', {
        name: (label: string) =>
          label.startsWith('The Drowned Chapel') && label !== detailsOf(t, 'The Drowned Chapel'),
      }),
    );
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${listCombats[1]!.id}`));
  },
});

export const ExtraDrawerLibrary = meta.story({
  name: 'Drawer: Library',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'CombatList');
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
    await userEvent.click(canvas.getByRole('button', { name: t('IconButton:openNavigation') }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await userEvent.click(within(drawer).getByRole('button', { name: t('Library:title') }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/library'));
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraDeleteCancelled = meta.story({
  name: 'Delete cancelled',
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

export const ExtraRussian = meta.story({
  tags: ['visual'],
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
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'CombatList');
    await userEvent.click(await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }));
    await canvas.findByRole('button', { name: detailsOf(t, ambush.title) });
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
    await waitFor(() => expect(locationOf(canvasElement)).toBe(`/combats/${first.id}`));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraDuplicateAtLimit = meta.story({
  name: 'Duplicate is disabled at the combat limit',
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

export const ExtraKindIcons = meta.story({
  name: 'Toast icons follow the toast kind',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatList');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Menu:duplicate') }));
    const toast = await canvas.findByRole('status');
    await expect(toast.querySelector('.tabler-icon-check')).not.toBeNull();
  },
});
