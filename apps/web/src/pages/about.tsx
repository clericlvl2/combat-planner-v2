import { About, useAccount } from '@combat-planner/ui';
import { SwipeDrawer } from './drawer.tsx';

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
