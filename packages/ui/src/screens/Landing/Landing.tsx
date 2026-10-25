import { IconBrandGithub, IconInfoCircle, IconLanguage } from '@tabler/icons-react';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../atoms/Button/Button.tsx';
import { Logo } from '../../atoms/Logo/Logo.tsx';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { localeNames } from '../Settings/localeNames.ts';
import { LanguageSheet } from '../shared/LanguageSheet.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './Landing.module.css';
import { LandingTable } from './LandingTable.tsx';
import type { LandingSize } from './LandingTable.tsx';

export interface LandingProps {
  sourceUrl: string;
}

const phoneSize: LandingSize = { width: 384, height: 832 };

function useSize(element: HTMLElement | null): LandingSize {
  const [size, setSize] = useState<LandingSize>(phoneSize);
  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const next = { width, height };
      setSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return size;
}

export function Landing({ sourceUrl }: LandingProps) {
  const { t } = useTranslation(['Landing', 'LanguageSheet', 'About']);
  const { locale } = useLocaleChoice();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const size = useSize(root);
  const languageName = localeNames[locale];

  return (
    <div ref={setRoot} className={classes.root} data-landing="">
      <div className={classes.main}>
        <div className={classes.copy}>
          <div className={classes.brand}>
            <span className={classes.logo} aria-hidden="true">
              <Logo size={24} />
            </span>
            <span className={classes.name}>{t('Landing:name')}</span>
            <Button
              className={classes.language}
              variant="ghost"
              size="S"
              icon={IconLanguage}
              aria-label={t('LanguageSheet:current', { name: languageName })}
              aria-haspopup="dialog"
              onClick={() => setLanguageOpen(true)}
            >
              {languageName}
            </Button>
          </div>
          <h1 className={classes.title}>{t('Landing:title')}</h1>
          <p className={classes.tagline}>{t('Landing:tagline')}</p>
          <div className={classes.actions}>
            <Button variant="primary" fullWidth to="/auth/sign-up">
              {t('Landing:signUp')}
            </Button>
            <Button variant="secondary" fullWidth to="/auth/sign-in">
              {t('Landing:signIn')}
            </Button>
          </div>
          <p className={classes.players}>{t('Landing:players')}</p>
        </div>
        <LandingTable size={size} scroller={root} />
      </div>
      <footer className={classes.footer}>
        <div className={classes.links}>
          <Link className={classes.link} to="/about">
            <IconInfoCircle size={iconSizes.S} stroke={2} aria-hidden="true" />
            {t('Landing:about')}
          </Link>
          <a className={classes.link} href={sourceUrl} target="_blank" rel="noopener noreferrer">
            <IconBrandGithub size={iconSizes.S} stroke={2} aria-hidden="true" />
            {t('Landing:source')}
          </a>
        </div>
        <p className={classes.legal}>{t('About:legal')}</p>
      </footer>
      <div className={classes.overlays}>
        <LanguageSheet opened={languageOpen} onClose={() => setLanguageOpen(false)} />
      </div>
    </div>
  );
}
