import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './DesktopAside.module.css';

export function DesktopAside() {
  const { t } = useTranslation('DesktopAside');
  return (
    <aside className={classes.root}>
      <span className={classes.logo} aria-hidden="true">
        <IconSwords size={32} stroke={2} />
      </span>
      <p className={classes.title}>{t('title')}</p>
      <p className={classes.tagline}>{t('tagline')}</p>
    </aside>
  );
}
