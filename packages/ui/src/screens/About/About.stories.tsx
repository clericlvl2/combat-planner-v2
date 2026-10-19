import preview from '#.storybook/preview';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent } from 'storybook/test';
import { About } from './About.tsx';

const sourceUrl = 'https://github.com/combat-planner/combat-planner';

const meta = preview.meta({
  title: 'Screens/About',
  component: About,
  decorators: [withRouter],
  args: { version: '2.0.0', sourceUrl },
  parameters: {
    phoneFrame: { overlay: true },
    reactRouter: reactRouterParameters({
      location: { path: '/about' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
    await expect(canvas.getByText('2.0.0')).toBeVisible();
    await expect(canvas.getByText('13th Age')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Source GitHub' })).toHaveAttribute(
      'href',
      sourceUrl,
    );
    await expect(canvas.queryByText('Donate')).not.toBeInTheDocument();
    await expect(
      canvas.getByText(/Fire Opal Media Inc\., 13th Age Community Use Policy/),
    ).toBeVisible();
  },
});

export const Russian = meta.story({
  globals: { locale: 'ru' },
  args: { version: '2.1.0-beta.3' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'О приложении' })).toBeVisible();
    await expect(canvas.getByText('2.1.0-beta.3')).toBeVisible();
    await expect(
      canvas.getByText(/13th Age is a trademark of Fire Opal Media Inc\./),
    ).toBeVisible();
  },
});

export const German = meta.story({
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Info' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Quellcode GitHub' })).toBeVisible();
    await expect(canvas.getByText('Version')).toBeVisible();
  },
});

export const KeyboardLinks = meta.story({
  play: async ({ canvas }) => {
    const source = canvas.getByRole('link', { name: 'Source GitHub' });
    source.focus();
    await expect(source).toHaveFocus();
    await userEvent.tab();
    await expect(source).not.toHaveFocus();
  },
});
