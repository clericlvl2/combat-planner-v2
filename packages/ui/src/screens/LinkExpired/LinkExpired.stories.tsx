import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { LinkExpired } from './LinkExpired.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Screens/LinkExpired',
  component: LinkExpired,
  parameters: { phoneFrame: true },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'LinkExpired');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('MessageScreen:linkRevokedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('MessageScreen:linkRevokedBody'))).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});
