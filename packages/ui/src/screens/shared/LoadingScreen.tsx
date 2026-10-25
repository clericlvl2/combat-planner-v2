import { useDelayed } from '../../hooks/useDelayed.ts';
import { CardSkeleton } from '../../molecules/CardSkeleton/CardSkeleton.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import classes from './LoadingScreen.module.css';

export interface LoadingScreenProps {
  onBack?: () => void;
}

export function LoadingScreen({ onBack }: LoadingScreenProps) {
  const shown = useDelayed(true);
  if (!shown) return null;
  return (
    <div className={classes.root} aria-busy="true">
      <PageHeader title="" onBack={onBack} />
      <ScrollList className={classes.list} contentClassName={classes.listContent}>
        <CardSkeleton variant="unit" count={5} />
      </ScrollList>
    </div>
  );
}
