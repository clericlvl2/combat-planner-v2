import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { CombatDeleted } from './CombatDeleted.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/CombatDeleted',
  component: CombatDeleted,
  parameters: { phoneFrame: true },
  args: { combatTitle: 'Goblin ambush', onHome: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatDeleted');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('title', { title: 'Goblin ambush' }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:combatDeletedBody'))).toBeVisible();
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByRole('button', { name: t('MessageScreen:home') })).toBeVisible();
  },
});

export const LongTitle = meta.story({
  args: { combatTitle: 'The Siege of the Obsidian Tower, Part II' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatDeleted');
    await expect(args.combatTitle).toHaveLength(40);
    const heading = canvas.getByRole('heading', {
      level: 1,
      name: t('title', { title: 'The Siege of the Obsidian Tower, Part II' }),
    });
    await expect(heading).toBeVisible();
    await expect(heading.getBoundingClientRect().height).toBeGreaterThan(30);
    await expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByRole('button', { name: t('MessageScreen:home') })).toBeVisible();
  },
});

export const TitleUnknown = meta.story({
  args: { combatTitle: null },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatDeleted');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('MessageScreen:combatDeletedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:combatDeletedBody'))).toBeVisible();
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByRole('button', { name: t('MessageScreen:home') })).toBeVisible();
  },
});
