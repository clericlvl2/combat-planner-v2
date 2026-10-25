import { Drawer as MantineDrawer, UnstyledButton, useProps } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconBooks, IconInfoCircle, IconSettings, IconSwords, IconUser } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { layout } from '../../layout.ts';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { useMotion } from '../../provider.tsx';
import { iconSizes } from '../../theme.ts';
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

const transition = {
  transition: 'slide-right',
  duration: layout.drawerEnterMs,
  exitDuration: layout.drawerExitMs,
  timingFunction: layout.sheetEasing,
} as const;

const instant = { duration: 0 } as const;

const attributes = { inner: { 'data-drawer': '' } };

export function Drawer(props: DrawerProps) {
  const { sections, current, email, onNavigate, onClose, opened, lockScroll, trapFocus } = useProps(
    'CpDrawer',
    defaultProps,
    props,
  );
  const { t } = useTranslation('Drawer');
  const motion = useMotion();
  const reduced = useReducedMotion();

  const attachPanel = useCallback(
    (panel: HTMLElement | null) => {
      if (!panel || !trapFocus) return;
      const timer = setTimeout(() => panel.focus({ preventScroll: true }));
      return () => clearTimeout(timer);
    },
    [trapFocus],
  );

  const handleNavigate = (section: DrawerSection) => {
    onNavigate(section);
    onClose();
  };

  return (
    <MantineDrawer.Root
      opened={opened}
      onClose={onClose}
      position="left"
      withinPortal={false}
      lockScroll={lockScroll}
      trapFocus={trapFocus}
      returnFocus
      closeOnEscape
      transitionProps={motion === 'off' || reduced ? instant : transition}
      classNames={{
        overlay: classes.scrim,
        inner: classes.inner,
        content: classes.panel,
        title: classes.title,
      }}
      attributes={attributes}
    >
      <MantineDrawer.Overlay data-scrim="" aria-hidden="true" />
      <MantineDrawer.Content ref={attachPanel}>
        <ScrollList className={classes.scroll} contentClassName={classes.content}>
          <MantineDrawer.Title data-autofocus="">{t('title')}</MantineDrawer.Title>
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
                  <SectionIcon
                    className={classes.icon}
                    size={iconSizes.L}
                    stroke={2}
                    aria-hidden="true"
                  />
                  <span className={classes.label}>{t(section)}</span>
                </UnstyledButton>
              );
            })}
          </nav>
          <span className={classes.email}>{email}</span>
        </ScrollList>
      </MantineDrawer.Content>
    </MantineDrawer.Root>
  );
}
