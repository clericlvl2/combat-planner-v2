import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CombatNotFound } from './CombatNotFound.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/CombatNotFound',
  component: CombatNotFound,
  parameters: { phoneFrame: true },
  args: { onGoToCombats: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('goToCombats') })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    await expect(args.onGoToCombats).not.toHaveBeenCalled();
  },
});

export const ActionFires = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatNotFound');
    await userEvent.click(canvas.getByRole('button', { name: t('goToCombats') }));
    await expect(args.onGoToCombats).toHaveBeenCalledOnce();
  },
});
