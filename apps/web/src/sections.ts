import type { Drawer } from '@combat-planner/ui';
import type { ComponentProps } from 'react';

export type DrawerSection = ComponentProps<typeof Drawer>['current'];

const sections: readonly DrawerSection[] = ['combats', 'library', 'settings', 'account', 'about'];

export function sectionOf(pathname: string): DrawerSection {
  const first = pathname.split('/')[1];
  return sections.find((section) => section === first) ?? 'combats';
}
