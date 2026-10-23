import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CantReachServer } from './CantReachServer.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/CantReachServer',
  component: CantReachServer,
  parameters: { phoneFrame: true },
  args: { onRetry: fn(), onHome: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CantReachServer');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('MessageScreen:offlineTitle') }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    await expect(canvas.getByRole('button', { name: t('MessageScreen:home') })).toHaveAttribute(
      'data-variant',
      'secondary',
    );
    await expect(args.onRetry).not.toHaveBeenCalled();
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});

export const ActionFires = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CantReachServer');
    await userEvent.click(canvas.getByRole('button', { name: t('MessageScreen:tryAgain') }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
});
