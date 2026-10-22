import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { DesktopAside } from './DesktopAside.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Organisms/DesktopAside',
  component: DesktopAside,
  parameters: { phoneFrame: false },
  decorators: [
    (Story) => (
      <div style={{ padding: 32, background: 'var(--cp-color-soft)' }}>
        <Story />
      </div>
    ),
  ],
});

export const Default = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'DesktopAside');
    await expect(canvas.getByRole('complementary')).toBeVisible();
    await expect(canvas.getByText(t('title'))).toBeVisible();
    await expect(canvas.getByText(t('tagline'))).toBeVisible();
  },
});
