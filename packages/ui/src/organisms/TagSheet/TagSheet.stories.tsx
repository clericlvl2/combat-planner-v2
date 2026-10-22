import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { TagSheet } from './TagSheet.tsx';
import type { TagSheetMode, TagSheetTag } from './TagSheet.tsx';
import { anyValue, escapeRegExp, storyT } from '../../storybook/storyT.ts';

interface TagSheetCellProps {
  mode?: TagSheetMode;
  initial?: readonly string[];
  presetName?: string;
  presetCount?: number;
  onChange?: (value: string[]) => void;
  onCreate?: (name: string) => void;
  onDone?: () => void;
  onClose?: () => void;
  withReopen?: boolean;
  hidden?: readonly TagSheetTag[];
  tags?: readonly TagSheetTag[];
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const library: readonly TagSheetTag[] = [
  { id: 'mooks', name: 'Mooks', count: 8 },
  { id: 'ferry', name: 'Ferry', count: 6 },
  { id: 'allies', name: 'Allies', count: 5 },
  { id: 'undead', name: 'Undead', count: 4 },
  { id: 'goblins', name: 'Goblins', count: 3 },
  { id: 'named-npcs', name: 'Named NPCs', count: 3 },
  { id: 'orcs', name: 'Orcs', count: 2 },
  { id: 'bosses', name: 'Bosses', count: 2 },
];

function TagSheetCell({
  mode = 'filter',
  initial = [],
  presetName,
  presetCount,
  onChange,
  onCreate,
  onDone,
  onClose,
  withReopen = false,
  hidden = [],
  tags: initialTags = library,
}: TagSheetCellProps) {
  const [tags, setTags] = useState<readonly TagSheetTag[]>(initialTags);
  const [value, setValue] = useState<string[]>([...initial]);
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      {withReopen ? (
        <button type="button" data-story-fixture="" onClick={() => setOpened(true)}>
          Reopen
        </button>
      ) : null}
      <TagSheet
        opened={opened}
        {...(mode === 'filter' ? { mode, presetCount: presetCount ?? 0 } : { mode })}
        tags={tags}
        value={value}
        presetName={presetName}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        onCreate={(name) => {
          const reused = hidden.find(
            (tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
          );
          const tag = reused ?? { id: name.toLocaleLowerCase(), name };
          setTags([tag, ...tags]);
          setValue([...value, tag.id]);
          onCreate?.(name);
          return reused === undefined;
        }}
        onDone={() => {
          setOpened(false);
          onDone?.();
        }}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/TagSheet',
  component: TagSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onChange: fn(), onCreate: fn(), onDone: fn(), onClose: fn() },
});

const filterArgs = { mode: 'filter' as const };

const assignArgs = {
  mode: 'assign' as const,
  initial: ['orcs', 'ferry'],
  presetName: 'Orc Berserker',
};

export const FilterTagSelected = meta.story({
  tags: ['visual'],
  args: { ...filterArgs, initial: ['orcs'], presetCount: 2 },
});

export const FilterNothingSelected = meta.story({
  args: filterArgs,
});

export const FilterSearchResults = meta.story({
  args: filterArgs,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchTags') }), 'gob');
    const list = canvas.getByRole('group', { name: t('filterTitle') });
    await expect(within(list).getAllByRole('checkbox')).toHaveLength(1);
    await expect(within(list).getByRole('checkbox', { name: /^Goblins/ })).not.toBeChecked();
    await expect(canvas.getByRole('button', { name: t('showAll') })).toBeVisible();
  },
});

export const AssignCurrentTags = meta.story({
  args: assignArgs,
});

export const AssignSearchWithMatches = meta.story({
  tags: ['visual'],
  args: assignArgs,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchOrCreate') }), 'mo');
    await expect(canvas.getByRole('checkbox', { name: /^Mooks/ })).not.toBeChecked();
    await expect(
      canvas.queryByRole('button', {
        name: anyValue(t, 'CheckList:create', 'query'),
      }),
    ).toBeNull();
  },
});

export const FilterNoMatch = meta.story({
  args: filterArgs,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchTags') }), 'elite');
    await expect(canvas.getByText(t('CheckList:noMatch'))).toBeVisible();
    await expect(
      canvas.queryByRole('button', {
        name: anyValue(t, 'CheckList:create', 'query'),
      }),
    ).toBeNull();
  },
});

export const AssignNoMatchOffersCreate = meta.story({
  args: assignArgs,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await expect(
      canvas.getByRole('dialog', { name: t('assignTitle', { name: 'Orc Berserker' }) }),
    ).toBeVisible();
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchOrCreate') }), 'Elite');
    await expect(
      canvas.getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('CheckList:noMatch'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('doneTags', { count: 2 }) })).toBeVisible();
  },
});

export const AssignNewTagCreated = meta.story({
  args: assignArgs,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    const search = canvas.getByRole('searchbox', { name: t('searchOrCreate') });
    await userEvent.type(search, '  Elite ');
    await userEvent.click(
      canvas.getByRole('button', { name: t('CheckList:create', { query: 'Elite' }) }),
    );
    await expect(args.onCreate).toHaveBeenCalledOnce();
    await expect(args.onCreate).toHaveBeenCalledWith('Elite');
    await expect(search).toHaveValue('');
    const elite = canvas.getByRole('checkbox', { name: `Elite ${t('new')}` });
    await expect(elite).toBeChecked();
    await expect(elite.closest('label')).toHaveAttribute('data-new');
    const list = canvas.getByRole('group', { name: t('assignTitle', { name: 'Orc Berserker' }) });
    await expect(within(list).getAllByRole('checkbox')[0]).toBe(elite);
    await expect(canvas.getByRole('button', { name: t('doneTags', { count: 3 }) })).toBeVisible();
  },
});

export const AssignNothingSelected = meta.story({
  args: { ...assignArgs, initial: [] },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await expect(
      canvas.getByRole('dialog', { name: t('assignTitle', { name: 'Orc Berserker' }) }),
    ).toBeVisible();
    for (const checkbox of canvas.getAllByRole('checkbox')) {
      await expect(checkbox).not.toBeChecked();
    }
  },
});

export const LongTagName = meta.story({
  args: {
    ...assignArgs,
    initial: ['long'],
    tags: [{ id: 'long', name: 'Нежить переправы и болот', count: 12 }, ...library],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: /^Нежить переправы и болот/ })).toBeChecked();
  },
});

export const EmptyLibrary = meta.story({
  args: { ...filterArgs, tags: [] },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await expect(canvas.getByRole('dialog', { name: t('filterTitle') })).toBeVisible();
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0);
  },
});

export const ReusedTagNotNew = meta.story({
  tags: ['!dev'],
  args: { ...assignArgs, hidden: [{ id: 'veterans', name: 'Veterans', count: 0 }] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchOrCreate') }), 'VETERANS');
    await userEvent.click(
      canvas.getByRole('button', { name: t('CheckList:create', { query: 'VETERANS' }) }),
    );
    await expect(args.onCreate).toHaveBeenCalledWith('VETERANS');
    const veterans = canvas.getByRole('checkbox', { name: /^Veterans/ });
    await expect(veterans).not.toHaveAccessibleName(new RegExp(escapeRegExp(t('new'))));
    await expect(veterans).toBeChecked();
    await expect(veterans.closest('label')).not.toHaveAttribute('data-new');
  },
});

export const CreateHidesOnCaseInsensitiveMatch = meta.story({
  tags: ['!dev'],
  args: assignArgs,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    const search = canvas.getByRole('searchbox', { name: t('searchOrCreate') });
    await userEvent.type(search, 'ORCS');
    await expect(
      canvas.queryByRole('button', {
        name: anyValue(t, 'CheckList:create', 'query'),
      }),
    ).toBeNull();
    await userEvent.clear(search);
    await userEvent.type(search, 'oRc');
    await expect(canvas.getByRole('checkbox', { name: /^Orcs/ })).toBeChecked();
    await expect(
      canvas.queryByRole('button', {
        name: anyValue(t, 'CheckList:create', 'query'),
      }),
    ).toBeNull();
    await userEvent.clear(search);
    await userEvent.type(search, 'Orcz');
    await expect(
      canvas.getByRole('button', { name: t('CheckList:create', { query: 'Orcz' }) }),
    ).toBeVisible();
    await expect(args.onCreate).not.toHaveBeenCalled();
  },
});

export const TogglingCallsOnChange = meta.story({
  tags: ['!dev'],
  args: assignArgs,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.click(canvas.getByRole('checkbox', { name: /^Mooks/ }));
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs', 'ferry', 'mooks']);
    const ferry = canvas.getByRole('checkbox', { name: /^Ferry/ });
    await userEvent.click(ferry);
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs', 'mooks']);
    await expect(ferry).not.toBeChecked();
    await expect(args.onDone).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: t('doneTags', { count: 2 }) })).toBeVisible();
  },
});

export const DoneCallsOnDone = meta.story({
  tags: ['!dev'],
  args: { ...filterArgs, initial: ['orcs'], presetCount: 2 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('showPresets', { count: 2 }) }));
    await expect(args.onDone).toHaveBeenCalledOnce();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const SearchResetsOnClose = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'the Reopen button is a story fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
  },
  args: { ...filterArgs, withReopen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    await userEvent.type(canvas.getByRole('searchbox', { name: t('searchTags') }), 'gob');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:close') }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Reopen' }));
    const search = await canvas.findByRole('searchbox', { name: t('searchTags') });
    await expect(search).toHaveValue('');
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(8);
  },
});

export const QueryStopsAtNameLimit = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      wordBreaks: 'a tag name of 24 letters without a break point wraps by letter in the 320 list',
    },
  },
  args: assignArgs,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TagSheet');
    const search = canvas.getByRole('searchbox', { name: t('searchOrCreate') });
    await userEvent.type(search, 'x'.repeat(LIMITS.tagName + 6));
    await expect(search).toHaveValue('x'.repeat(LIMITS.tagName));
    await userEvent.click(
      canvas.getByRole('button', {
        name: anyValue(t, 'CheckList:create', 'query'),
      }),
    );
    await expect(args.onCreate).toHaveBeenCalledWith('x'.repeat(LIMITS.tagName));
  },
});
