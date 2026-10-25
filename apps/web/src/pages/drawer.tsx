import { Drawer, useAccount } from '@combat-planner/ui';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { watchEdgeSwipe } from '../edgeSwipe.ts';
import { sectionOf } from '../sections.ts';
import { swipeAllowed } from '../swipeGuard.ts';

export function SwipeDrawer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session } = useAccount();
  const [opened, setOpened] = useState(false);

  useEffect(
    () =>
      watchEdgeSwipe(document, {
        onSwipe: () => setOpened(true),
        canStart: () => swipeAllowed(document),
        edgeLeft: () => document.getElementById('root')?.getBoundingClientRect().left ?? 0,
      }),
    [],
  );

  return (
    <Drawer
      opened={opened}
      current={sectionOf(pathname)}
      email={session?.email ?? ''}
      onNavigate={(section) => void navigate(`/${section}`)}
      onClose={() => setOpened(false)}
    />
  );
}
