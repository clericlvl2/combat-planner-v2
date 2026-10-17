import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAccount } from '../../hooks/useAccount.ts';
import { Drawer } from '../../organisms/Drawer/Drawer.tsx';
import type { DrawerSection } from '../../organisms/Drawer/Drawer.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import classes from './PageScreen.module.css';
import { ScreenToast } from './ScreenToast.tsx';

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
