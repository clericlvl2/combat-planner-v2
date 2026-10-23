import { IconLanguage } from '@tabler/icons-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../atoms/Button/Button.tsx';
import { Logo } from '../../atoms/Logo/Logo.tsx';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { localeNames } from '../Settings/localeNames.ts';
import classes from './AuthScreen.module.css';
import { LanguageSheet } from './LanguageSheet.tsx';
import { ScreenToast } from './ScreenToast.tsx';

export interface AuthScreenProps {
  title: string;
  subtitle: string;
  switchText: string;
  switchLabel: string;
  switchTo: string;
  children: ReactNode;
}

export function AuthScreen({
  title,
  subtitle,
  switchText,
  switchLabel,
  switchTo,
  children,
}: AuthScreenProps) {
  const { t } = useTranslation('LanguageSheet');
  const { locale } = useLocaleChoice();
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageName = localeNames[locale];

  return (
    <div className={classes.root}>
      <div className={classes.body}>
        <div className={classes.heading}>
          <div className={classes.brand}>
            <span className={classes.logo} aria-hidden="true">
              <Logo size={24} />
            </span>
            <h1 className={classes.title}>{title}</h1>
          </div>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        {children}
        <p className={classes.switch}>
          {switchText}{' '}
          <Link className={classes.link} to={switchTo}>
            {switchLabel}
          </Link>
        </p>
        <Button
          className={classes.language}
          variant="ghost"
          size="S"
          icon={IconLanguage}
          aria-label={t('current', { name: languageName })}
          aria-haspopup="dialog"
          onClick={() => setLanguageOpen(true)}
        >
          {languageName}
        </Button>
      </div>
      <LanguageSheet opened={languageOpen} onClose={() => setLanguageOpen(false)} />
      <ScreenToast />
    </div>
  );
}
