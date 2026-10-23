import preview from '#.storybook/preview';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect } from 'storybook/test';
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
