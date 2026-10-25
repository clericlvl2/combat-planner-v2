import preview from '#.storybook/preview';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent, waitFor } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { Settings } from './Settings.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { localeNames, storyLocale } from '../../storybook/withLocale.tsx';

const session = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  displayName: 'Ferry DM',
  language: 'en' as const,
};

const englishScenario = scenario({ session });

const meta = preview.meta({
  title: 'Screens/Settings',
  component: Settings,
  decorators: [withRouter],
  parameters: {
    phoneFrame: { overlay: true },
    scenario: englishScenario,
    reactRouter: reactRouterParameters({
      location: { path: '/settings' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Settings');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    const current = storyLocale(globals);
    await expect(canvas.getByRole('radio', { name: localeNames[current] })).toBeChecked();
    await expect(canvas.getAllByRole('radio')).toHaveLength(6);
    await expect(
      canvas.getByRole('radio', { name: localeNames[current === 'ja' ? 'en' : 'ja'] }),
    ).not.toBeChecked();
  },
});

export const CheckedFromSettings = meta.story({
  tags: ['!dev'],
  parameters: { scenario: scenario({ session, settings: { language: 'de' } }) },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('radio', { name: 'Deutsch' })).toBeChecked());
    await expect(canvas.getByRole('radio', { name: 'English' })).not.toBeChecked();
  },
});

export const SavingFailed = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Settings');
    await waitFor(() => expect(canvas.getByRole('radio', { name: localeNames.en })).toBeChecked());
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(canvas.getByRole('radio', { name: localeNames.de }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      t('Toast:serverUnreachableNothingChanged'),
    );
    await expect(canvas.getByRole('button', { name: t('Toast:retry') })).toBeVisible();
  },
});

export const SwitchesLanguage = meta.story({
  tags: ['!dev'],
  globals: { locale: 'ru' },
  parameters: { scenario: scenario({ session, settings: { language: 'ru' } }) },
  play: async ({ canvas, globals, loaded }) => {
    const english = storyT({ ...globals, locale: 'en' }, 'Settings');
    await waitFor(() =>
      expect(fakeApiOf(loaded).calls.map((call) => call.method)).toContain('settings.get'),
    );
    await expect(canvas.getByRole('radio', { name: localeNames.ru })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: localeNames.en }));
    await expect(
      await canvas.findByRole('heading', { level: 1, name: english('title') }),
    ).toBeVisible();
    await expect(canvas.getByRole('radio', { name: localeNames.en })).toBeChecked();
    await expect(canvas.getByText(english('languageNote'))).toBeVisible();
    const updates = fakeApiOf(loaded).calls.filter((call) => call.method === 'settings.update');
    await expect(updates.map((call) => call.args)).toEqual([[{ language: 'en' }]]);
  },
});
