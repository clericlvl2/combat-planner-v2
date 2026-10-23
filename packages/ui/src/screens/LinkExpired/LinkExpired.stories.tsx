import preview from '#.storybook/preview';
import { expect, fn } from 'storybook/test';
import { LinkExpired } from './LinkExpired.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/LinkExpired',
  component: LinkExpired,
  parameters: { phoneFrame: true },
  args: { onHome: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'LinkExpired');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('MessageScreen:linkRevokedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:linkRevokedBody'))).toBeVisible();
    const buttons = canvas.getAllByRole('button');
    await expect(buttons).toHaveLength(1);
    await expect(buttons[0]).toHaveAccessibleName(t('MessageScreen:home'));
    await expect(buttons[0]).toHaveAttribute('data-variant', 'secondary');
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});
