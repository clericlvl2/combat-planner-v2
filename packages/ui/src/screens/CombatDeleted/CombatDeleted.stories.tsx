import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { CombatDeleted } from './CombatDeleted.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/CombatDeleted',
  component: CombatDeleted,
  parameters: { phoneFrame: true },
  args: { combatTitle: 'Goblin ambush' },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatDeleted');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('title', { title: 'Goblin ambush' }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:combatDeletedBody'))).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const Deutsch = meta.story({
  tags: ['visual'],
  globals: { locale: 'de' },
  args: { combatTitle: 'Hinterhalt der Goblins' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Hinterhalt der Goblins wurde gelöscht' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const Russian = meta.story({
  tags: ['visual'],
  globals: { locale: 'ru' },
  args: { combatTitle: 'Засада гоблинов' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Бой «Засада гоблинов» удалён' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const Japanese = meta.story({
  tags: ['visual'],
  globals: { locale: 'ja' },
  args: { combatTitle: 'ゴブリンの待ち伏せ' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'ゴブリンの待ち伏せは削除されました' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const ExtraLongTitle = meta.story({
  name: 'Long title wraps',
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
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});
