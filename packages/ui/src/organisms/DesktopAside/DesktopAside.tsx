import { useTranslation } from 'react-i18next';
import { Logo } from '../../atoms/Logo/Logo.tsx';
import classes from './DesktopAside.module.css';

export function DesktopAside() {
  const { t } = useTranslation('DesktopAside');
  return (
    <aside className={classes.root}>
      <span className={classes.logo} aria-hidden="true">
        <Logo size={32} />
      </span>
      <p className={classes.title}>{t('title')}</p>
      <p className={classes.tagline}>{t('tagline')}</p>
    </aside>
  );
}
