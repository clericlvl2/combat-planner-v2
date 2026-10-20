import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import type { ApiErrorCode } from '@combat-planner/api/client';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useApi } from '../../api/ApiProvider.tsx';
import { FakeApiClient } from '../../api/FakeApiClient.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { Library, PRESET_SORT_KEY } from './Library.tsx';
import {
  emptyLibraryScenario,
  fromCombatScenario,
  fullLibraryScenario,
  libraryPresets,
  libraryScenario,
  savedFromCombat,
  tagIdOf,
} from './Library.scenarios.ts';
import { anyValue, escapeRegExp, storyT } from '../../storybook/storyT.ts';
import { storyLocale } from '../../storybook/withLocale.tsx';

type Canvas = ReturnType<typeof within>;

const berserker = libraryPresets[0]!;

const shaman = libraryPresets[1]!;

const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

function SeedToast({ name }: { name: string }) {
  const { show } = useToasts();
  const { t } = useTranslation('Toast');
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    show({ message: t('presetAdded', { name }) });
  }, [show, t, name]);
  return null;
}

function FailFirstCall({ code, children }: { code: ApiErrorCode; children: ReactNode }) {
  const api = useApi();
  useState(() => {
    if (api instanceof FakeApiClient) api.failNext(code);
    return code;
  });
  return children;
}

const toggleOf = (t: TFunction, name: string) => t('PresetCard:toggle', { name });

const namesOf = (canvas: Canvas, t: TFunction): string[] => {
  const [before = '', after = ''] = toggleOf(t, '\n').split('\n');
  return canvas
    .queryAllByRole('button', { name: anyValue(t, 'PresetCard:toggle', 'name') })
    .map((button: HTMLElement) => {
      const label = button.getAttribute('aria-label') ?? '';
      return label.slice(before.length, label.length - after.length);
    });
};

const showPresets = (t: TFunction) => (label: string) =>
  anyValue(t, 'TagSheet:showPresets', 'count').test(label);

const ready = async (canvas: Canvas, t: TFunction) => {
  await canvas.findByRole('button', { name: toggleOf(t, berserker.name) });
};

const callsOf = (loaded: Record<string, unknown>, method: string) =>
  fakeApiOf(loaded).calls.filter((call) => call.method === method);

const expand = async (canvas: Canvas, name: string, t: TFunction) => {
  await userEvent.click(await canvas.findByRole('button', { name: toggleOf(t, name) }));
};

const openSheet = async (canvas: Canvas, opener: HTMLElement, name: string | RegExp) => {
  await userEvent.click(opener);
  const sheet = await canvas.findByRole('dialog', { name });
  await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'));
  await waitFor(() => expect(document.activeElement).toBe(sheet));
  return sheet;
};

const openFilter = async (canvas: Canvas, t: TFunction) => {
  await ready(canvas, t);
  return openSheet(
    canvas,
    canvas.getByRole('button', {
      name: (label: string) => label.startsWith(t('PageHeader:tags')),
    }),
    t('TagSheet:filterTitle'),
  );
};

const applyFilter = async (canvas: Canvas, tags: readonly string[], t: TFunction) => {
  const sheet = await openFilter(canvas, t);
  for (const tag of tags) {
    await userEvent.click(
      within(sheet).getByRole('checkbox', { name: new RegExp(`^${escapeRegExp(tag)}`) }),
    );
  }
  await userEvent.click(within(sheet).getByRole('button', { name: showPresets(t) }));
  await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
};

const openCreate = async (canvas: Canvas, t: TFunction) => {
  await ready(canvas, t);
  return openSheet(
    canvas,
    canvas.getByRole('button', { name: t('BottomBar:newPreset') }),
    t('BottomBar:newPreset'),
  );
};

const setStepper = async (canvas: Canvas, label: string, value: string) => {
  const field = canvas.getByRole('spinbutton', { name: label });
  await userEvent.clear(field);
  await userEvent.type(field, value);
  await userEvent.tab();
};

const fillCreate = async (canvas: Canvas, t: TFunction) => {
  const name = canvas.getByRole('textbox', { name: t('UnitForm:name') });
  await userEvent.click(name);
  await userEvent.type(name, 'Orc Warchief');
  await setStepper(canvas, t('NumberField:maxHp'), '72');
  await setStepper(canvas, t('UnitForm:ac'), '20');
  await setStepper(canvas, t('UnitForm:pd'), '18');
  await setStepper(canvas, t('UnitForm:md'), '14');
  const tags = await openSheet(
    canvas,
    canvas.getByRole('button', { name: t('Chip:addTag') }),
    anyValue(t, 'TagSheet:assignTitle', 'name'),
  );
  await userEvent.click(within(tags).getByRole('checkbox', { name: /^Orcs/ }));
  await userEvent.click(within(tags).getByRole('checkbox', { name: /^Bosses/ }));
  await userEvent.click(
    within(tags).getByRole('button', { name: t('TagSheet:doneTags', { count: 2 }) }),
  );
  await waitFor(() =>
    expect(
      canvas.queryByRole('dialog', {
        name: anyValue(t, 'TagSheet:assignTitle', 'name'),
      }),
    ).toBeNull(),
  );
  name.focus();
};

const openEdit = async (canvas: Canvas, t: TFunction) => {
  await expand(canvas, berserker.name, t);
  return openSheet(
    canvas,
    canvas.getByRole('button', { name: t('CardActions:edit') }),
    t('PresetFormSheet:editPreset'),
  );
};

const openTagSheet = async (canvas: Canvas, t: TFunction) => {
  await openEdit(canvas, t);
  return openSheet(
    canvas,
    canvas.getByRole('button', { name: t('Chip:addTag') }),
    t('TagSheet:assignTitle', { name: 'Orc Berserker' }),
  );
};

const openMenu = async (canvas: Canvas, t: TFunction) => {
  await expand(canvas, berserker.name, t);
  await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
  await expect(canvas.getByRole('menuitem', { name: t('Menu:duplicate') })).toBeVisible();
};

const meta = preview.meta({
  title: 'Screens/Library',
  component: Library,
  decorators: [withRouter],
  render: () => (
    <>
      <Library />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: { overlay: true },
    scenario: libraryScenario,
    reactRouter: reactRouterParameters({
      location: { path: '/library' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
  beforeEach: () => {
    localStorage.removeItem(PRESET_SORT_KEY);
    return () => localStorage.removeItem(PRESET_SORT_KEY);
  },
});

export const LBF11 = meta.story({
  tags: ['visual'],
  name: 'LB-F1.1 List',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    await expect(namesOf(canvas, t)).toEqual(libraryPresets.map((preset) => preset.name));
    await expect(canvas.getByRole('button', { name: t('sort') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('tags') })).toBeVisible();
    await expect(canvas.getByText('Orcs · Ferry')).toBeVisible();
    await expect(callsOf(loaded, 'presets.list')).not.toHaveLength(0);
    const chevron = canvas.getByRole('button', { name: toggleOf(t, shaman.name) });
    chevron.focus();
    await expect(chevron).toHaveFocus();
  },
});

export const LBF12 = meta.story({
  tags: ['visual'],
  name: 'LB-F1.2 Card expanded',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await expand(canvas, shaman.name, t);
    await expect(canvas.getByRole('button', { name: toggleOf(t, shaman.name) })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:more') })).toBeVisible();
  },
});

export const LBF13 = meta.story({
  tags: ['visual'],
  name: 'LB-F1.3 Filter sheet',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openFilter(canvas, t);
    const names = within(sheet)
      .getAllByRole('checkbox')
      .map((box: HTMLElement) => box.closest('label')?.textContent ?? '');
    await expect(names).toHaveLength(8);
    await expect(names.some((name: string) => name.startsWith('Veterans'))).toBe(false);
    await expect(within(sheet).getByRole('button', { name: t('TagSheet:showAll') })).toBeVisible();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /^Orcs/ }));
    await expect(within(sheet).getByRole('checkbox', { name: /^Orcs/ })).toBeChecked();
    await expect(
      within(sheet).getByRole('button', { name: t('TagSheet:showPresets', { count: 2 }) }),
    ).toBeVisible();
  },
});

export const LBF14 = meta.story({
  name: 'LB-F1.4 Filter: Orcs',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await applyFilter(canvas, ['Orcs'], t);
    await expect(namesOf(canvas, t)).toEqual([berserker.name, shaman.name]);
    await expect(
      canvas.getByRole('button', {
        name: (label: string) => label.startsWith(t('PageHeader:tags')),
      }),
    ).toHaveTextContent('1');
    await expect(
      canvas.getByRole('button', { name: t('PageHeader:removeFilter', { name: 'Orcs' }) }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('PageHeader:clear') })).toBeVisible();
  },
});

export const LBF15 = meta.story({
  name: 'LB-F1.5 Search “archer” + Goblins',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await applyFilter(canvas, ['Goblins'], t);
    await expect(namesOf(canvas, t)).toEqual(['Goblin Archer', '影の射手ゴブリン']);
    await userEvent.type(canvas.getByRole('searchbox', { name: t('search') }), 'archer');
    await expect(namesOf(canvas, t)).toEqual(['Goblin Archer']);
    await expect(
      canvas.getByRole('button', { name: t('PageHeader:removeFilter', { name: 'Goblins' }) }),
    ).toBeVisible();
  },
});

export const LBF16 = meta.story({
  tags: ['visual'],
  name: 'LB-F1.6 Nothing found',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    await userEvent.type(canvas.getByRole('searchbox', { name: t('search') }), 'dragon');
    await expect(canvas.getByRole('heading', { name: t('UnitForm:nothingFound') })).toBeVisible();
    await expect(canvas.getByText(t('noResultsBody', { query: 'dragon' }))).toBeVisible();
    await expect(namesOf(canvas, t)).toHaveLength(0);
  },
});

export const LBF17 = meta.story({
  tags: ['visual'],
  name: 'LB-F1.7 Library is empty',
  parameters: { scenario: emptyLibraryScenario },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await expect(await canvas.findByRole('heading', { name: t('emptyTitle') })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('sort') })).toBeNull();
    await expect(
      canvas.queryByRole('button', {
        name: anyValue(t, 'TagSheet:assignTitle', 'name'),
      }),
    ).toBeNull();
    const create = canvas.getByRole('button', { name: t('BottomBar:newPreset') });
    await expect(create).toBeEnabled();
    create.focus();
    await expect(create).toHaveFocus();
  },
});

export const LBF21 = meta.story({
  name: 'LB-F2.1 Sort sheet',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    await openSheet(
      canvas,
      canvas.getByRole('button', { name: t('sort') }),
      t('SortSheet:sortPresets'),
    );
    await expect(canvas.getByRole('radio', { name: t('Radio:newestFirst') })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: t('SortSheet:byType') })).not.toBeChecked();
  },
});

export const LBF22 = meta.story({
  name: 'LB-F2.2 A–Z: button filled',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    await userEvent.click(canvas.getByRole('button', { name: t('sort') }));
    await userEvent.click(await canvas.findByRole('radio', { name: t('RadioList:alphabetical') }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('RadioList:alphabetical') })).toBeVisible();
    await expect(localStorage.getItem(PRESET_SORT_KEY)).toBe('alphabetical');
    await expect(namesOf(canvas, t)).toEqual(
      libraryPresets
        .map((preset) => preset.name)
        .toSorted((a, b) => a.localeCompare(b, storyLocale(globals))),
    );
  },
});

export const LBF31 = meta.story({
  name: 'LB-F3.1 Tap New preset',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    const create = canvas.getByRole('button', { name: t('BottomBar:newPreset') });
    await expect(create).toBeEnabled();
    create.focus();
    await expect(create).toHaveFocus();
  },
});

export const LBF32 = meta.story({
  name: 'LB-F3.2 Empty form',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    const name = canvas.getByRole('textbox', { name: t('UnitForm:name') });
    await expect(name).toHaveValue('');
    await expect(canvas.getByRole('radio', { name: t('UnitForm:enemy') })).toBeChecked();
    await expect(canvas.getByRole('spinbutton', { name: t('NumberField:maxHp') })).toHaveValue(
      '10',
    );
    await expect(name).toHaveAttribute(
      'placeholder',
      t('PresetFormSheet:namePlaceholder', { role: t('PresetFormSheet:enemy') }),
    );
    await expect(canvas.getByRole('button', { name: t('Sheet:create') })).toBeEnabled();
    name.focus();
    await expect(name).toHaveFocus();
  },
});

export const LBF33 = meta.story({
  name: 'LB-F3.3 No name: created as "Enemy 1"',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    await userEvent.click(canvas.getByRole('textbox', { name: t('UnitForm:name') }));
    await userEvent.tab();
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    const created = callsOf(loaded, 'presets.create');
    await expect(created).toHaveLength(1);
    const [input] = created[0]!.args as [{ id: string }];
    await expect(input).toEqual({
      id: input.id,
      name: t('PresetFormSheet:namePlaceholder', { role: t('PresetFormSheet:enemy') }),
      role: 'enemy',
      maxHp: 10,
      ac: 10,
      pd: 10,
      md: 10,
      initiativeBonus: 0,
      tags: [],
    });
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:presetAdded', {
        name: t('PresetFormSheet:namePlaceholder', { role: t('PresetFormSheet:enemy') }),
      }),
    );
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const LBF34 = meta.story({
  name: 'LB-F3.4 Form filled',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    await fillCreate(canvas, t);
    await expect(canvas.getByText('12/40')).toBeVisible();
    await expect(canvas.getByRole('spinbutton', { name: t('NumberField:maxHp') })).toHaveValue(
      '72',
    );
    await expect(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Orcs' }) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Bosses' }) }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('Sheet:create') })).toBeEnabled();
  },
});

export const LBF35 = meta.story({
  name: 'LB-F3.5 Preset created',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    await fillCreate(canvas, t);
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    const created = callsOf(loaded, 'presets.create');
    await expect(created).toHaveLength(1);
    const [input] = created[0]!.args as [{ id: string }];
    await expect(input).toEqual({
      id: input.id,
      name: 'Orc Warchief',
      role: 'enemy',
      maxHp: 72,
      ac: 20,
      pd: 18,
      md: 14,
      initiativeBonus: 0,
      tags: [tagIdOf('Orcs'), tagIdOf('Bosses')],
    });
    await expect(input.id).toMatch(ulidPattern);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:presetAdded', { name: 'Orc Warchief' }),
    );
    await waitFor(() => expect(namesOf(canvas, t)[0]).toBe('Orc Warchief'));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const LBF41 = meta.story({
  name: 'LB-F4.1 Tap Edit',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await expand(canvas, berserker.name, t);
    const edit = canvas.getByRole('button', { name: t('CardActions:edit') });
    await expect(edit).toBeEnabled();
    edit.focus();
    await expect(edit).toHaveFocus();
  },
});

export const LBF42 = meta.story({
  name: 'LB-F4.2 Form: tap Add tag',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await openEdit(canvas, t);
    await expect(canvas.getByRole('textbox', { name: t('UnitForm:name') })).toHaveValue(
      berserker.name,
    );
    await expect(canvas.getByRole('spinbutton', { name: t('NumberField:maxHp') })).toHaveValue(
      '40',
    );
    await expect(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Orcs' }) }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Ferry' }) }),
    ).toBeVisible();
    const add = canvas.getByRole('button', { name: t('Chip:addTag') });
    add.focus();
    await expect(add).toHaveFocus();
  },
});

export const LBF43 = meta.story({
  name: 'LB-F4.3 Tag sheet over the form',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await expect(within(sheet).getByRole('checkbox', { name: /^Orcs/ })).toBeChecked();
    await expect(within(sheet).getByRole('checkbox', { name: /^Ferry/ })).toBeChecked();
    await expect(within(sheet).getByRole('checkbox', { name: /^Mooks/ })).not.toBeChecked();
    await expect(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 2 }) }),
    ).toBeVisible();
  },
});

export const LBF44 = meta.story({
  name: 'LB-F4.4 No such tag: Create',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'Elite');
    await expect(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    ).toBeVisible();
    await expect(within(sheet).getByText(t('CheckList:noMatch'))).toBeVisible();
    await expect(callsOf(loaded, 'tags.create')).toHaveLength(0);
  },
});

export const LBF45 = meta.story({
  name: 'LB-F4.5 Created and checked',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'Elite');
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    );
    const created = callsOf(loaded, 'tags.create');
    await expect(created).toHaveLength(1);
    const [input] = created[0]!.args as [{ id: string; name: string }];
    await expect(input.name).toBe('Elite');
    await expect(input.id).toMatch(ulidPattern);
    await expect(within(sheet).getByRole('checkbox', { name: /^Elite/ })).toBeChecked();
    await expect(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 3 }) }),
    ).toBeVisible();
  },
});

export const LBF46 = meta.story({
  name: 'LB-F4.6 Form with the new tag',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'Elite');
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    );
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 3 }) }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole('dialog', {
          name: anyValue(t, 'TagSheet:assignTitle', 'name'),
        }),
      ).toBeNull(),
    );
    await expect(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Elite' }) }),
    ).toBeVisible();
    await expect(callsOf(loaded, 'presets.update')).toHaveLength(0);
  },
});

export const LBF47 = meta.story({
  name: 'LB-F4.7 Typing “mo”',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'mo');
    await expect(within(sheet).getAllByRole('checkbox')).toHaveLength(1);
    await expect(within(sheet).getByRole('checkbox', { name: /^Mooks/ })).not.toBeChecked();
    await expect(
      within(sheet).queryByRole('button', {
        name: anyValue(t, 'CheckList:create', 'query'),
      }),
    ).toBeNull();
  },
});

export const LBF51 = meta.story({
  name: 'LB-F5.1 ⋯ → Duplicate',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await openMenu(canvas, t);
    await expect(canvas.getByRole('menuitem', { name: t('Button:delete') })).toBeVisible();
  },
});

export const LBF52 = meta.story({
  name: 'LB-F5.2 Copy below the original',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Menu:duplicate') }));
    const copies = callsOf(loaded, 'presets.duplicate');
    await expect(copies).toHaveLength(1);
    const [source, copyId] = copies[0]!.args as [string, string];
    await expect(source).toBe(berserker.id);
    await expect(copyId).toMatch(ulidPattern);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:presetDuplicated', { name: 'Orc Berserker 2' }),
    );
    await waitFor(() => expect(namesOf(canvas, t)[0]).toBe('Orc Berserker 2'));
    const copy = canvas.getAllByRole('article')[0]!;
    await expect(within(copy).getByText('Orcs · Ferry')).toBeVisible();
  },
});

export const LBF53 = meta.story({
  name: 'LB-F5.3 ⋯ → Delete',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await openMenu(canvas, t);
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: t('Button:delete') })).toHaveFocus();
  },
});

export const LBF54 = meta.story({
  name: 'LB-F5.4 Confirmation',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Button:delete') }));
    const dialog = await canvas.findByRole('alertdialog', {
      name: t('Dialog:deletePresetTitle', { name: 'Orc Berserker' }),
    });
    await expect(dialog).toHaveAccessibleDescription(t('Dialog:deletePresetBody'));
    await expect(callsOf(loaded, 'presets.remove')).toHaveLength(0);
  },
});

export const LBF55 = meta.story({
  name: 'LB-F5.5 Preset deleted',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Button:delete') }));
    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t('Button:delete') }));
    const removed = callsOf(loaded, 'presets.remove');
    await expect(removed).toHaveLength(1);
    await expect(removed[0]!.args).toEqual([berserker.id]);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:deleted', { title: 'Orc Berserker' }),
    );
    await waitFor(() => expect(namesOf(canvas, t)).not.toContain(berserker.name));
  },
});

export const LBF61 = meta.story({
  name: 'LB-F6.1 New preset from combat',
  parameters: { scenario: fromCombatScenario },
  render: () => (
    <>
      <Library />
      <SeedToast name={savedFromCombat.name} />
      <LocationProbe />
    </>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await expand(canvas, savedFromCombat.name, t);
    await expect(namesOf(canvas, t)[0]).toBe(savedFromCombat.name);
    const card = canvas.getAllByRole('article')[0]!;
    await expect(within(card).getByText(t('PresetCard:noTags'))).toBeVisible();
    await expect(within(card).getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      t('Toast:presetAdded', { name: 'Orc Berserker' }),
    );
  },
});

export const ExtraEditSaved = meta.story({
  name: 'Edit saved with the new tag',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'Elite');
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    );
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 3 }) }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole('dialog', {
          name: anyValue(t, 'TagSheet:assignTitle', 'name'),
        }),
      ).toBeNull(),
    );
    await userEvent.click(canvas.getByRole('button', { name: t('Button:save') }));
    const [tag] = callsOf(loaded, 'tags.create')[0]!.args as [{ id: string }];
    const updates = callsOf(loaded, 'presets.update');
    await expect(updates).toHaveLength(1);
    await expect(updates[0]!.args).toEqual([
      berserker.id,
      {
        name: berserker.name,
        role: berserker.role,
        maxHp: berserker.maxHp,
        ac: berserker.ac,
        pd: berserker.pd,
        md: berserker.md,
        initiativeBonus: berserker.initiativeBonus,
        tags: [...berserker.tags, tag.id],
      },
    ]);
    await waitFor(() => expect(canvas.getByText('Orcs · Ferry · Elite')).toBeVisible());
  },
});

export const ExtraTagReused = meta.story({
  name: 'Create reuses an existing tag, ignoring case',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    const sheet = await openTagSheet(canvas, t);
    await userEvent.type(within(sheet).getByRole('searchbox'), 'VETERANS');
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('CheckList:create', { query: 'VETERANS' }) }),
    );
    await expect(callsOf(loaded, 'tags.create')).toHaveLength(0);
    await expect(within(sheet).getByRole('checkbox', { name: /^Veterans/ })).toBeChecked();
    await userEvent.click(
      within(sheet).getByRole('button', { name: t('TagSheet:doneTags', { count: 3 }) }),
    );
    await expect(
      await canvas.findByRole('button', {
        name: t('PresetFormSheet:removeTag', { name: 'Veterans' }),
      }),
    ).toBeVisible();
  },
});

export const ExtraSeveralTags = meta.story({
  name: 'Several tags match any of them',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await applyFilter(canvas, ['Orcs', 'Undead'], t);
    await expect(namesOf(canvas, t)).toEqual([berserker.name, shaman.name, 'Skeletal Ferryman']);
    await expect(
      canvas.getByRole('button', {
        name: (label: string) => label.startsWith(t('PageHeader:tags')),
      }),
    ).toHaveTextContent('2');
  },
});

export const ExtraRemoveFilter = meta.story({
  name: 'Remove a filter chip, then Clear',
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await applyFilter(canvas, ['Orcs', 'Undead'], t);
    await userEvent.click(
      canvas.getByRole('button', { name: t('PageHeader:removeFilter', { name: 'Undead' }) }),
    );
    await expect(namesOf(canvas, t)).toEqual([berserker.name, shaman.name]);
    await userEvent.click(canvas.getByRole('button', { name: t('PageHeader:clear') }));
    await expect(namesOf(canvas, t)).toHaveLength(libraryPresets.length);
    await expect(
      canvas.queryByRole('button', {
        name: anyValue(t, 'PageHeader:removeFilter', 'name'),
      }),
    ).toBeNull();
  },
});

export const ExtraSortRemembered = meta.story({
  name: 'Sort remembered after a remount',
  beforeEach: () => {
    localStorage.setItem(PRESET_SORT_KEY, 'byType');
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    await expect(canvas.getByRole('button', { name: t('SortSheet:byType') })).toBeVisible();
    const collate = (names: string[]) =>
      names.toSorted((a, b) => a.localeCompare(b, storyLocale(globals)));
    await expect(namesOf(canvas, t)).toEqual([
      ...collate([
        'Goblin Archer',
        'Orc Berserker',
        'Orc Shaman',
        'Skeletal Ferryman',
        '影の射手ゴブリン',
      ]),
      ...collate([
        'Brother Tomas of the Silver Lantern Order',
        'Капитан стражи переправы Святослав Огнев',
      ]),
    ]);
  },
});

export const ExtraLimitReached = meta.story({
  name: 'Limit reached',
  parameters: { scenario: fullLibraryScenario },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await canvas.findByRole('button', { name: toggleOf(t, 'Goblin 1') });
    const create = canvas.getByRole('button', { name: t('BottomBar:newPreset') });
    await expect(create).toBeDisabled();
    await expect(create).toHaveAccessibleDescription(t('limitReached'));
    await userEvent.click(create, { pointerEventsCheck: 0 });
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(callsOf(loaded, 'presets.create')).toHaveLength(0);
  },
});

export const ExtraDeleteCancelled = meta.story({
  name: 'Delete cancelled',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openMenu(canvas, t);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('Button:delete') }));
    const dialog = await canvas.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t('Button:cancel') }));
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await expect(callsOf(loaded, 'presets.remove')).toHaveLength(0);
    await expect(namesOf(canvas, t)).toContain(berserker.name);
  },
});

export const ExtraDrawer = meta.story({
  name: 'Drawer: Combats',
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Library');
    await ready(canvas, t);
    await userEvent.click(canvas.getByRole('button', { name: t('IconButton:openNavigation') }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await expect(within(drawer).getByRole('button', { name: t('title') })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await userEvent.click(within(drawer).getByRole('button', { name: t('CombatList:title') }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const ExtraRussian = meta.story({
  tags: ['visual'],
  name: 'Russian: list',
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Библиотека' })).toBeVisible();
    await expect(await canvas.findByText('Капитан стражи переправы Святослав Огнев')).toBeVisible();
  },
});

export const ExtraFirstLoadFails = meta.story({
  name: 'A failed first load shows Can’t reach the server with Try again',
  render: () => (
    <FailFirstCall code="network">
      <Library />
      <LocationProbe />
    </FailFirstCall>
  ),
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await userEvent.click(await canvas.findByRole('button', { name: t('MessageScreen:tryAgain') }));
    await ready(canvas, t);
    await expect(callsOf(loaded, 'presets.list')).toHaveLength(2);
  },
});

export const ExtraSignedOut = meta.story({
  name: 'An unauthorized first load goes to sign-in',
  render: () => (
    <FailFirstCall code="unauthorized">
      <Library />
      <LocationProbe />
    </FailFirstCall>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/auth/sign-in'));
  },
});

export const ExtraCreateRetry = meta.story({
  name: 'Create is disabled in flight; Retry creates once with the same id',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    await fillCreate(canvas, t);
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await expect(await canvas.findByRole('button', { name: t('Sheet:create') })).toBeDisabled();
    await userEvent.click(await canvas.findByRole('button', { name: t('Toast:retry') }));
    await waitFor(() =>
      expect(canvas.queryByRole('dialog', { name: t('BottomBar:newPreset') })).toBeNull(),
    );
    const created = callsOf(loaded, 'presets.create');
    await expect(created).toHaveLength(2);
    const [first] = created[0]!.args as [{ id: string }];
    const [second] = created[1]!.args as [{ id: string }];
    await expect(second.id).toBe(first.id);
    const toast = await canvas.findByRole('status');
    await expect(toast).toHaveTextContent(t('Toast:presetAdded', { name: 'Orc Warchief' }));
    await expect(toast.querySelector('.tabler-icon-check')).not.toBeNull();
  },
});

const createEliteTag = async (canvas: Canvas, t: TFunction) => {
  const name = canvas.getByRole('textbox', { name: t('UnitForm:name') });
  await userEvent.click(name);
  await userEvent.type(name, 'Orc Warchief');
  const tags = await openSheet(
    canvas,
    canvas.getByRole('button', { name: t('Chip:addTag') }),
    anyValue(t, 'TagSheet:assignTitle', 'name'),
  );
  await userEvent.type(within(tags).getByRole('searchbox'), 'Elite');
  await userEvent.click(
    within(tags).getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
  );
  await userEvent.click(
    within(tags).getByRole('button', { name: t('TagSheet:doneTags', { count: 1 }) }),
  );
  await waitFor(() =>
    expect(
      canvas.queryByRole('dialog', {
        name: anyValue(t, 'TagSheet:assignTitle', 'name'),
      }),
    ).toBeNull(),
  );
};

export const ExtraTagCreateAwaited = meta.story({
  name: 'Save waits for the new tag; a failed tag shows an error and keeps the form',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    fakeApiOf(loaded).failNext('invalid');
    await createEliteTag(canvas, t);
    await expect(await canvas.findByText(t('Library:tagFailed', { name: 'Elite' }))).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await expect(callsOf(loaded, 'presets.create')).toHaveLength(0);
    await expect(canvas.getByRole('dialog', { name: t('BottomBar:newPreset') })).toBeVisible();
  },
});

export const ExtraTagRetryThenSave = meta.story({
  name: 'Save after a tag Retry sends the preset with the created tag',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    fakeApiOf(loaded).failNext('network');
    await createEliteTag(canvas, t);
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await expect(callsOf(loaded, 'presets.create')).toHaveLength(0);
    await userEvent.click(await canvas.findByRole('button', { name: t('Toast:retry') }));
    await waitFor(() => expect(callsOf(loaded, 'presets.create')).toHaveLength(1));
    const [tag] = callsOf(loaded, 'tags.create').at(-1)!.args as [{ id: string }];
    const [preset] = callsOf(loaded, 'presets.create')[0]!.args as [{ tags: string[] }];
    await expect(preset.tags).toEqual([tag.id]);
  },
});

export const ExtraFailedTagSave = meta.story({
  name: 'Save after a dismissed tag Retry shows the error and is not stuck',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await openCreate(canvas, t);
    fakeApiOf(loaded).failNext('network');
    await createEliteTag(canvas, t);
    await userEvent.click(
      within(await canvas.findByRole('status')).getByRole('button', { name: t('Toast:dismiss') }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: t('Toast:retry') })).toBeNull(),
    );
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await expect(await canvas.findByText(t('Library:tagFailed', { name: 'Elite' }))).toBeVisible();
    await expect(callsOf(loaded, 'presets.create')).toHaveLength(0);
    await userEvent.click(
      canvas.getByRole('button', { name: t('PresetFormSheet:removeTag', { name: 'Elite' }) }),
    );
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await waitFor(() => expect(callsOf(loaded, 'presets.create')).toHaveLength(1));
    const [preset] = callsOf(loaded, 'presets.create')[0]!.args as [{ tags: string[] }];
    await expect(preset.tags).toEqual([]);
    await expect(
      await canvas.findByText(t('Toast:presetAdded', { name: 'Orc Warchief' })),
    ).toBeVisible();
  },
});

export const ExtraFailedTagListedLater = meta.story({
  name: 'A failed tag that the tag list shows later no longer blocks Save',
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    const api = fakeApiOf(loaded);
    await openCreate(canvas, t);
    api.failNext('invalid');
    await createEliteTag(canvas, t);
    await expect(await canvas.findByText(t('Library:tagFailed', { name: 'Elite' }))).toBeVisible();
    const [elite] = callsOf(loaded, 'tags.create').at(-1)!.args as [{ id: string; name: string }];
    await api.tags.create(elite);
    const tags = await openSheet(
      canvas,
      canvas.getByRole('button', { name: t('Chip:addTag') }),
      anyValue(t, 'TagSheet:assignTitle', 'name'),
    );
    await userEvent.type(within(tags).getByRole('searchbox'), 'Champion');
    await userEvent.click(
      within(tags).getByRole('button', { name: t('CheckList:create', { query: 'Champion' }) }),
    );
    await userEvent.click(
      within(tags).getByRole('button', {
        name: (label: string) => label.startsWith(t('TagSheet:done')),
      }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole('dialog', {
          name: anyValue(t, 'TagSheet:assignTitle', 'name'),
        }),
      ).toBeNull(),
    );
    await waitFor(() => expect(callsOf(loaded, 'tags.create')).toHaveLength(3));
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:create') }));
    await waitFor(() => expect(callsOf(loaded, 'presets.create')).toHaveLength(1));
    const [champion] = callsOf(loaded, 'tags.create').at(-1)!.args as [{ id: string }];
    const [preset] = callsOf(loaded, 'presets.create')[0]!.args as [{ tags: string[] }];
    await expect(preset.tags).toEqual([elite.id, champion.id]);
    await expect(
      await canvas.findByText(t('Toast:presetAdded', { name: 'Orc Warchief' })),
    ).toBeVisible();
  },
});

export const ExtraDuplicateAtLimit = meta.story({
  name: 'Duplicate is disabled at the preset limit',
  parameters: { scenario: fullLibraryScenario },
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Library');
    await expand(canvas, 'Goblin 1', t);
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    const duplicate = await canvas.findByRole('menuitem', { name: t('Menu:duplicate') });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(callsOf(loaded, 'presets.duplicate')).toHaveLength(0);
  },
});
