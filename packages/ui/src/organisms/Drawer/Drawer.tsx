import { FocusTrap, UnstyledButton } from '@mantine/core';
import { IconBooks, IconInfoCircle, IconSettings, IconSwords, IconUser } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './Drawer.module.css';

export type DrawerSection = 'combats' | 'library' | 'settings' | 'account' | 'about';

export const drawerSections: readonly DrawerSection[] = [
  'combats',
  'library',
  'settings',
  'account',
  'about',
];

const sectionIcons: Record<DrawerSection, Icon> = {
  combats: IconSwords,
  library: IconBooks,
  settings: IconSettings,
  account: IconUser,
  about: IconInfoCircle,
};

export interface DrawerProps {
  sections?: readonly DrawerSection[];
  current: DrawerSection;
  email: string;
  onNavigate: (section: DrawerSection) => void;
  onClose: () => void;
  opened: boolean;
}

export function Drawer({
  sections = drawerSections,
  current,
  email,
  onNavigate,
  onClose,
  opened,
}: DrawerProps) {
  const { t } = useTranslation('Drawer');
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!opened) return;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement ? active : null;
    return () => {
      opener.current?.focus();
    };
  }, [opened]);

  if (!opened) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const handleNavigate = (section: DrawerSection) => {
    onNavigate(section);
    onClose();
  };

  return (
    <FocusTrap active>
      <div className={classes.root} onKeyDown={handleKeyDown}>
        <div className={classes.scrim} data-scrim="" aria-hidden="true" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-autofocus=""
          className={classes.panel}
        >
          <h2 id={titleId} className={classes.title}>
            {t('title')}
          </h2>
          <nav className={classes.nav} aria-label={t('navigation')}>
            {sections.map((section) => {
              const SectionIcon = sectionIcons[section];
              const isCurrent = section === current;
              return (
                <UnstyledButton
                  key={section}
                  component="button"
                  type="button"
                  className={classes.item}
                  aria-current={isCurrent ? 'page' : undefined}
                  data-current={isCurrent || undefined}
                  onClick={() => handleNavigate(section)}
                >
                  <SectionIcon className={classes.icon} size={24} stroke={2} aria-hidden="true" />
                  <span className={classes.label}>{t(section)}</span>
                </UnstyledButton>
              );
            })}
          </nav>
          <span className={classes.email}>{email}</span>
        </div>
      </div>
    </FocusTrap>
  );
}
