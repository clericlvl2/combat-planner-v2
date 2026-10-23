import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CombatNotFound } from './CombatNotFound.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/Errors/CombatNotFound',
  component: CombatNotFound,
  parameters: { phoneFrame: true },
  args: { onHome: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    const buttons = canvas.getAllByRole('button');
    await expect(buttons).toHaveLength(1);
    await expect(buttons[0]).toHaveAccessibleName(t('MessageScreen:home'));
    await expect(buttons[0]).toHaveAttribute('data-variant', 'primary');
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});

export const ActionFires = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await userEvent.click(canvas.getByRole('button', { name: t('MessageScreen:home') }));
    await expect(args.onHome).toHaveBeenCalledOnce();
  },
});
