import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { UnexpectedError } from './UnexpectedError.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/UnexpectedError',
  component: UnexpectedError,
  parameters: { phoneFrame: true },
  args: { onReload: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnexpectedError');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('reload') })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    await expect(args.onReload).not.toHaveBeenCalled();
  },
});

export const ActionFires = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'UnexpectedError');
    await userEvent.click(canvas.getByRole('button', { name: t('reload') }));
    await expect(args.onReload).toHaveBeenCalledOnce();
  },
});
