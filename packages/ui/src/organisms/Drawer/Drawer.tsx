import {
  FocusTrap,
  FocusTrapInitialFocus,
  RemoveScroll,
  UnstyledButton,
  useProps,
} from '@mantine/core';
import { IconBooks, IconInfoCircle, IconSettings, IconSwords, IconUser } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
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
  lockScroll?: boolean;
  trapFocus?: boolean;
}

const defaultProps = {
  sections: drawerSections,
  lockScroll: true,
  trapFocus: true,
} satisfies Partial<DrawerProps>;

export function Drawer(props: DrawerProps) {
  const { sections, current, email, onNavigate, onClose, opened, lockScroll, trapFocus } = useProps(
    'CpDrawer',
    defaultProps,
    props,
  );
  const { t } = useTranslation('Drawer');
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!opened) return;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement ? active : null;
    return () => {
      opener.current?.focus();
    };
  }, [opened]);

  useEffect(() => {
    if (!opened || !trapFocus) return;
    const timer = setTimeout(() => panelRef.current?.focus({ preventScroll: true }));
    return () => clearTimeout(timer);
  }, [opened, trapFocus]);

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
    <RemoveScroll enabled={lockScroll}>
      <div className={classes.root}>
        <div className={classes.scrim} data-scrim="" aria-hidden="true" onClick={onClose} />
        <FocusTrap active={trapFocus} innerRef={panelRef}>
          <ScrollList
            role="dialog"
            data-drawer=""
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={classes.panel}
            contentClassName={classes.content}
            onKeyDown={handleKeyDown}
          >
            <FocusTrapInitialFocus />
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
          </ScrollList>
        </FocusTrap>
      </div>
    </RemoveScroll>
  );
}
