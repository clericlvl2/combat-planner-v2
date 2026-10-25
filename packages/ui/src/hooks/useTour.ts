import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { TourView } from '../organisms/Tour/Tour.tsx';
import { useTourStore } from '../provider.tsx';
import { DM_PROMOTIONS, DM_STAGES, DM_STEPS, dmSettled, dmStep } from '../tour/dmTour.ts';
import type { DmState, DmStepId } from '../tour/dmTour.ts';
import { advanced, counterOf, sameProgress } from '../tour/flow.ts';
import type { TourCounter, TourStepDef } from '../tour/flow.ts';
import {
  PLAYER_STAGES,
  PLAYER_STEPS,
  playerPending,
  playerSettled,
  playerStep,
} from '../tour/playerTour.ts';
import type { PlayerState, PlayerStepId } from '../tour/playerTour.ts';
import { isStage } from '../tour/progress.ts';
import type { TourProgress, TourRole } from '../tour/progress.ts';

export interface TourControl {
  view: TourView | null;
  progress: TourProgress;
  complete: (stage: number, combatId?: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

export function useTourProgress(
  role: TourRole,
): readonly [TourProgress, (next: TourProgress) => void] {
  const store = useTourStore();
  const progress = useSyncExternalStore(store.subscribe, () => store.get(role));
  const set = useCallback((next: TourProgress) => store.set(role, next), [store, role]);
  return [progress, set];
}

function useSettled(
  stored: TourProgress,
  settled: TourProgress,
  set: (next: TourProgress) => void,
) {
  useEffect(() => {
    if (!sameProgress(stored, settled)) set(settled);
  }, [stored, settled, set]);
}

interface ViewInput {
  id: string;
  def: TourStepDef;
  counter: TourCounter | null;
  body?: string;
  finishLabel: 'done' | 'gotIt';
  skippable: boolean;
  t: TFunction<'Tour'>;
}

const viewOf = ({ id, def, counter, body, finishLabel, skippable, t }: ViewInput): TourView => ({
  key: id,
  target: def.target,
  press: def.press,
  action: def.action,
  title: t(`${id}Title`),
  body: t(body ?? `${id}Body`),
  counter,
  nextLabel: def.action === 'finish' ? t(finishLabel) : t('next'),
  skippable,
});

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useDmTour(state: DmState | null): TourControl {
  const { t } = useTranslation('Tour');
  const [stored, setStored] = useTourProgress('dm');
  const [promoted, setPromoted] = useState<DmStepId | null>(null);
  const progress = state ? dmSettled(stored, state) : stored;
  useSettled(stored, progress, setStored);
  const id = state ? dmStep(progress, state, promoted) : null;
  const latest = useLatest({ progress, id });

  useEffect(() => {
    if (promoted !== null && id !== promoted && id !== DM_PROMOTIONS[promoted]) setPromoted(null);
  }, [id, promoted]);

  const complete = useCallback(
    (stage: number, combatId?: string) => {
      const next = advanced(latest.current.progress, stage, DM_STAGES);
      if (next === latest.current.progress) return;
      setStored(isStage(next) && combatId !== undefined ? { ...next, combatId } : next);
    },
    [latest, setStored],
  );

  const onNext = useCallback(() => {
    const current = latest.current.id;
    if (current === null) return;
    const def = DM_STEPS[current];
    if (def.action === 'promote') setPromoted(current);
    else if (def.action === 'advance') complete(def.stage);
    else if (def.action === 'finish') setStored('done');
  }, [latest, complete, setStored]);

  const onSkip = useCallback(() => setStored('done'), [setStored]);

  const view =
    id === null
      ? null
      : viewOf({
          id,
          def: DM_STEPS[id],
          counter: counterOf(progress, DM_STAGES),
          finishLabel: 'done',
          skippable: true,
          t,
        });

  return { view, progress, complete, onNext, onSkip };
}

export function usePlayerTour(state: PlayerState | null): TourControl {
  const { t } = useTranslation('Tour');
  const [stored, setStored] = useTourProgress('player');
  const [turn, setTurn] = useTourProgress('turn');
  const progress = state ? playerSettled(stored, state) : stored;
  useSettled(stored, progress, setStored);
  const id: PlayerStepId | null = state ? playerStep(progress, turn, state) : null;
  const latest = useLatest({ progress, id });
  const ringedStrip = useRef(false);
  const stripShown = state?.screen === 'turnOrder' && state.stripShown;

  useEffect(() => {
    if (id === 'playerTurn') ringedStrip.current = true;
    else if (ringedStrip.current && !stripShown) {
      ringedStrip.current = false;
      if (turn === 'unset') setTurn('done');
    }
  }, [id, stripShown, turn, setTurn]);

  const complete = useCallback(
    (stage: number) => {
      const next = advanced(latest.current.progress, stage, PLAYER_STAGES);
      if (next !== latest.current.progress) setStored(next);
    },
    [latest, setStored],
  );

  const onNext = useCallback(() => {
    const current = latest.current.id;
    if (current === null) return;
    const def = PLAYER_STEPS[current];
    if (current === 'playerTurn') setTurn('done');
    else if (def.action === 'advance') complete(def.stage);
    else if (def.action === 'finish') setStored('done');
  }, [latest, complete, setStored, setTurn]);

  const onSkip = useCallback(() => {
    setStored('done');
    setTurn('done');
  }, [setStored, setTurn]);

  const view =
    id === null || state === null
      ? null
      : viewOf({
          id,
          def: PLAYER_STEPS[id],
          counter:
            id === 'playerTurn'
              ? null
              : counterOf(progress, PLAYER_STAGES, playerPending(progress, state)),
          body:
            id === 'playerIntro' && state.screen === 'turnOrder' && state.status !== 'setup'
              ? 'playerIntroActiveBody'
              : undefined,
          finishLabel: 'gotIt',
          skippable: id !== 'playerTurn',
          t,
        });

  return { view, progress, complete, onNext, onSkip };
}
