import { useEffect, useState } from 'react';
import { layout } from '../layout.ts';

export function useDelayed(active: boolean, ms: number = layout.loadingDelay): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setShown(true), ms);
    return () => {
      clearTimeout(timer);
      setShown(false);
    };
  }, [active, ms]);
  return active && shown;
}
