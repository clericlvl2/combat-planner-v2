import preview from '#.storybook/preview';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import { About } from './About.tsx';
import { storyT } from '../../storybook/storyT.ts';

const sourceUrl = 'https://github.com/clericlvl2/combat-planner-v2';

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
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'About');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByText('2.0.0')).toBeVisible();
    await expect(canvas.getByText('13th Age')).toBeVisible();
    await expect(canvas.getByRole('link', { name: `${t('source')} GitHub` })).toHaveAttribute(
      'href',
      sourceUrl,
    );
    await expect(
      [...canvasElement.querySelectorAll('a[href^="http"]')].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual([sourceUrl]);
    await expect(canvas.getByText(t('legal'))).toBeVisible();
  },
});

export const Guest = meta.story({
  parameters: { scenario: scenario({ session: null }) },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'About');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: t('PageHeader:back') })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('PageHeader:openNavigation') })).toBeNull();
  },
});
