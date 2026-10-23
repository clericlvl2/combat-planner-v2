import type { LinkToken } from '@combat-planner/api/client';
import type { CombatId } from '@combat-planner/domain';
import {
  About,
  CombatScreen,
  Drawer,
  LinkExpired,
  NotFound,
  PlayerView,
  UnexpectedError,
  useAccount,
} from '@combat-planner/ui';
import { useEffect, useState } from 'react';
import { Outlet, useLoaderData, useLocation, useNavigate, useRouteError } from 'react-router';
import { watchEdgeSwipe } from './edgeSwipe.ts';
import { sectionOf } from './sections.ts';
import { swipeAllowed } from './swipeGuard.ts';

export interface CombatRouteData {
  combatId: CombatId;
}

export interface PlayerRouteData {
  combatId: CombatId;
  token: LinkToken | null;
}

export function CombatPage() {
  const { combatId } = useLoaderData<CombatRouteData>();
  return <CombatScreen key={combatId} combatId={combatId} />;
}

export function PlayerPage() {
  const { combatId, token } = useLoaderData<PlayerRouteData>();
  const navigate = useNavigate();
  const goHome = () => void navigate('/');
  if (token === null) return <LinkExpired onHome={goHome} />;
  return (
    <PlayerView key={`${combatId}:${token}`} combatId={combatId} token={token} onHome={goHome} />
  );
}

function SwipeDrawer() {
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

export function DmPages() {
  return (
    <>
      <Outlet />
      <SwipeDrawer />
    </>
  );
}

export interface AboutPageProps {
  version: string;
  sourceUrl: string;
}

export function AboutPage({ version, sourceUrl }: AboutPageProps) {
  const { session } = useAccount();
  return (
    <>
      <About version={version} sourceUrl={sourceUrl} />
      {session ? <SwipeDrawer /> : null}
    </>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return <NotFound onHome={() => void navigate('/')} />;
}

export interface RouteErrorProps {
  onShow: () => void;
  onReport: (error: unknown) => void;
}

export function RouteError({ onShow, onReport }: RouteErrorProps) {
  const navigate = useNavigate();
  const error = useRouteError();
  useEffect(() => onShow(), [onShow]);
  useEffect(() => onReport(error), [onReport, error]);
  return (
    <UnexpectedError onReload={() => window.location.reload()} onHome={() => void navigate('/')} />
  );
}
