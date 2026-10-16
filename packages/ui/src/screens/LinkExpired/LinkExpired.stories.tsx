import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { LinkExpired } from './LinkExpired.tsx';

const meta = preview.meta({
  title: 'Screens/LinkExpired',
  component: LinkExpired,
  parameters: { phoneFrame: true },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'This link no longer works' }),
    ).toBeVisible();
    await expect(
      canvas.getByText('The DM issued a new link. Ask them to share it again.'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const Deutsch = meta.story({
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Dieser Link funktioniert nicht mehr' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const Russian = meta.story({
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Эта ссылка больше не работает' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});
