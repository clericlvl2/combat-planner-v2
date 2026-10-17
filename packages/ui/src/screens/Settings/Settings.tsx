import type { Locale } from '@combat-planner/api/client';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings.ts';
import { RadioList } from '../../molecules/RadioList/RadioList.tsx';
import { locales } from '../../provider.tsx';
import { PageScreen } from '../shared/PageScreen.tsx';
import { PageSection } from '../shared/PageSection.tsx';
import { localeNames } from './localeNames.ts';
import classes from './Settings.module.css';

const options = locales.map((locale) => ({ value: locale, label: localeNames[locale] }));

const localeOf = (language: string): Locale =>
  locales.find((locale) => locale === language) ?? 'en';

export function Settings() {
  const { t, i18n } = useTranslation('Settings');
  const { update } = useSettings();

  const choose = (language: Locale) => {
    update({ language }).catch(() => {});
  };

  return (
    <PageScreen title={t('title')} section="settings">
      <PageSection label={t('language')} note={t('languageNote')}>
        <div className={classes.card}>
          <RadioList
            aria-label={t('language')}
            options={options}
            value={localeOf(i18n.language)}
            onChange={choose}
          />
        </div>
      </PageSection>
    </PageScreen>
  );
}
