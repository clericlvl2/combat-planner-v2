import preview from '#.storybook/preview';
import { isStory, storyNameFromExport, toId } from 'storybook/internal/csf';
import { expect } from 'storybook/test';
import { narrowKnown } from '../narrow-known.ts';

const storyModules = import.meta.glob<Record<string, unknown>>('../../**/*.stories.tsx');

function autoTitleOf(modulePath: string): string {
  const segments = modulePath
    .replace(/^(\.\.\/)+/, '')
    .replace(/\.stories\.tsx$/, '')
    .split('/');
  if (segments.at(-1) === segments.at(-2)) segments.pop();
  return segments.join('/');
}

async function storyIds(): Promise<Set<string>> {
  const modules = await Promise.all(
    Object.entries(storyModules).map(async ([modulePath, load]) => ({
      modulePath,
      storyModule: await load(),
    })),
  );
  return new Set(
    modules.flatMap(({ modulePath, storyModule }) =>
      Object.entries(storyModule).flatMap(([exportName, story]) =>
        isStory(story)
          ? [
              toId(
                story.meta.input.title ?? autoTitleOf(modulePath),
                storyNameFromExport(exportName),
              ),
            ]
          : [],
      ),
    ),
  );
}

const meta = preview.meta({
  title: 'Storybook/NarrowKnown',
  render: () => <p>narrow-known</p>,
});

export const EveryEntryNamesAStory = meta.story({
  tags: ['!dev'],
  play: async () => {
    const ids = await storyIds();
    const stale = narrowKnown
      .filter((entry) => !ids.has(entry.story))
      .map((entry) => `${entry.story} (${entry.check}) matches no story`);
    await expect(stale).toEqual([]);
  },
});
