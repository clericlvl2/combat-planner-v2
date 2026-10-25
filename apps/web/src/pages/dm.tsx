import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { SwipeDrawer } from './drawer.tsx';

export { Account, CombatList, Library, Settings } from '@combat-planner/ui';

export function DmPages() {
  useEffect(() => {
    import('./combat.tsx').catch(() => undefined);
  }, []);
  return (
    <>
      <Outlet />
      <SwipeDrawer />
    </>
  );
}
