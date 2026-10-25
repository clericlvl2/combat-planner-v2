import preview from '#.storybook/preview';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, waitFor } from 'storybook/test';
import { layout } from '../../layout.ts';
import { scenario } from '../../api/scenarios.ts';
import { storyT } from '../../storybook/storyT.ts';
import { storyLocale } from '../../storybook/withLocale.tsx';
import { localeNames } from '../Settings/localeNames.ts';
import { Landing } from './Landing.tsx';

const sourceUrl = 'https://github.com/clericlvl2/combat-planner-v2';

const focusableSelector = 'a[href], button, input, select, textarea, [tabindex]';

const meta = preview.meta({
  title: 'Screens/Landing',
  component: Landing,
  decorators: [withRouter],
  args: { sourceUrl },
  parameters: {
    phoneFrame: true,
    scenario: scenario({ session: null }),
    reactRouter: reactRouterParameters({
      location: { path: '/' },
      routing: { path: '*', useStoryElement: true },
    }),
    geometry: {
      overflow: {
        reason: 'the decorative table clips its tilted, scaled-down phones',
        except: '[data-landing-stage], [data-landing-stage] *',
      },
    },
  },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Landing');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByText(t('tagline'))).toBeVisible();
    await expect(canvas.getByRole('link', { name: t('signUp') })).toHaveAttribute(
      'href',
      '/auth/sign-up',
    );
    await expect(canvas.getByRole('link', { name: t('signIn') })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    );
    await expect(canvas.getByText(t('players'))).toBeVisible();
    await expect(canvas.getByRole('link', { name: t('about') })).toHaveAttribute('href', '/about');
    await expect(canvas.getByRole('link', { name: t('source') })).toHaveAttribute(
      'href',
      sourceUrl,
    );
    await expect(canvas.getByText(t('About:legal'))).toBeVisible();
    await expect(
      canvas.getByRole('button', {
        name: t('LanguageSheet:current', { name: localeNames[storyLocale(globals)] }),
      }),
    ).toBeVisible();
  },
});

export const StageHiddenFromAssistiveTech = meta.story({
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    const stage = canvasElement.querySelector('[data-landing-stage]');
    await expect(stage).toHaveAttribute('aria-hidden', 'true');
    await expect(stage?.querySelectorAll(focusableSelector)).toHaveLength(0);
    await expect(stage?.querySelectorAll('[data-phone]')).toHaveLength(3);
  },
});

export const FollowsLargeFrame = meta.story({
  tags: ['!dev'],
  globals: { frame: 'large' },
  play: async ({ canvasElement }) => {
    const { width, height } = layout.viewports.large;
    const frame = canvasElement.querySelector('[data-phone-frame]');
    await expect(frame?.getBoundingClientRect().width).toBe(width);
    await waitFor(() => expect([window.innerWidth, window.innerHeight]).toEqual([width, height]));
  },
});

const phoneBezel = 12;

async function expectSceneInsideScreen(canvasElement: HTMLElement) {
  const root = canvasElement.querySelector<HTMLElement>('[data-landing]');
  const screen = (root as HTMLElement).getBoundingClientRect();
  const table = canvasElement.querySelector<HTMLElement>('[data-landing-stage] > div');
  const phones = [...canvasElement.querySelectorAll<HTMLElement>('[data-phone]')];
  await expect(phones).toHaveLength(3);
  for (const part of [table as HTMLElement, ...phones]) {
    const box = part.getBoundingClientRect();
    const bezel = phoneBezel * Number(part.style.getPropertyValue('--landing-k') || 0);
    await expect(box.left - bezel).toBeGreaterThanOrEqual(screen.left);
    await expect(box.right + bezel).toBeLessThanOrEqual(screen.right);
  }
}

export const SceneInsideTheScreen = meta.story({
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    await expect(window.innerWidth).toBe(layout.viewports.narrow.width);
    await expectSceneInsideScreen(canvasElement);
  },
});

export const SceneInsideTheLargeFrame = meta.story({
  tags: ['!dev'],
  globals: { frame: 'large' },
  play: async ({ canvasElement }) => {
    const { width } = layout.viewports.large;
    await waitFor(() => expect(window.innerWidth).toBe(width));
    await expectSceneInsideScreen(canvasElement);
  },
});

export const SceneInsideTheDesktopFrame = meta.story({
  tags: ['!dev'],
  globals: { frame: 'desktop' },
  play: async ({ canvasElement }) => {
    const { width } = layout.viewports.desktop;
    await waitFor(() => expect(window.innerWidth).toBe(width));
    await expectSceneInsideScreen(canvasElement);
  },
});
