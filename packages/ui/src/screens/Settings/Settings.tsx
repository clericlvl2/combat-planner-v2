import type { Locale } from '@combat-planner/api/client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAccount } from '../../hooks/useAccount.ts';
import { useSettings } from '../../hooks/useSettings.ts';
import { RadioList } from '../../molecules/RadioList/RadioList.tsx';
import { Drawer } from '../../organisms/Drawer/Drawer.tsx';
import type { DrawerSection } from '../../organisms/Drawer/Drawer.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import { locales } from '../../provider.tsx';
import { ScreenToast } from '../SignIn/SignIn.tsx';
import { localeNames } from './localeNames.ts';
import classes from './Settings.module.css';

export interface PageScreenProps {
  title: string;
  section: DrawerSection;
  children: ReactNode;
}

export function PageScreen({ title, section, children }: PageScreenProps) {
  const navigate = useNavigate();
  const { session } = useAccount();
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className={classes.root}>
      <PageHeader title={title} onMenu={() => setDrawerOpen(true)} />
      <div className={classes.content}>{children}</div>
      <ScreenToast />
      <Drawer
        opened={drawerOpen}
        current={section}
        email={session?.email ?? ''}
        onNavigate={(next) => {
          void navigate(`/${next}`);
        }}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

export interface PageSectionProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function PageSection({ label, note, children }: PageSectionProps) {
  return (
    <section className={classes.section}>
      <h2 className={classes.label}>{label}</h2>
      {children}
      {note ? <p className={classes.note}>{note}</p> : null}
    </section>
  );
}

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
