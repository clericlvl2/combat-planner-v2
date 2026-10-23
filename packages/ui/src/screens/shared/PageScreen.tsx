import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAccount } from '../../hooks/useAccount.ts';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { Drawer } from '../../organisms/Drawer/Drawer.tsx';
import type { DrawerSection } from '../../organisms/Drawer/Drawer.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import classes from './PageScreen.module.css';
import { ScreenToast } from './ScreenToast.tsx';

export interface PageScreenProps {
  title: string;
  section: DrawerSection;
  openToGuests?: boolean;
  signedOutPath?: string;
  children: ReactNode;
}

export function PageScreen({
  title,
  section,
  openToGuests = false,
  signedOutPath = '/auth/sign-in',
  children,
}: PageScreenProps) {
  const navigate = useNavigate();
  const { session } = useAccount();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const signedOut = session === null;
  const guest = signedOut && openToGuests;

  useEffect(() => {
    if (signedOut && !openToGuests) void navigate(signedOutPath);
  }, [signedOut, openToGuests, signedOutPath, navigate]);

  return (
    <div className={classes.root}>
      {guest ? (
        <PageHeader title={title} onBack={() => void navigate('/')} />
      ) : (
        <PageHeader title={title} onMenu={() => setDrawerOpen(true)} />
      )}
      <ScrollList className={classes.content} contentClassName={classes.inner}>
        {children}
      </ScrollList>
      <ScreenToast />
      {guest ? null : (
        <Drawer
          opened={drawerOpen}
          current={section}
          email={session?.email ?? ''}
          onNavigate={(next) => {
            void navigate(`/${next}`);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
