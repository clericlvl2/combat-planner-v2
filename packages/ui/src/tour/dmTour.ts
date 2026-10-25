import type { CombatStatus } from '@combat-planner/domain';
import { advanced, skippedStage } from './flow.ts';
import type { TourStepDef } from './flow.ts';
import { isStage } from './progress.ts';
import type { TourProgress } from './progress.ts';

export const DM_STAGES = 8;

export type DmStepId =
  | 'create'
  | 'title'
  | 'confirm'
  | 'open'
  | 'addUnit'
  | 'unitName'
  | 'unitSave'
  | 'initiative'
  | 'roll'
  | 'start'
  | 'hp'
  | 'hpApply'
  | 'nextTurn'
  | 'menu'
  | 'share'
  | 'link';

export interface DmListState {
  screen: 'list';
  loaded: boolean;
  calm: boolean;
  formOpen: boolean;
  combatIds: readonly string[];
}

export interface DmCombatState {
  screen: 'combat';
  status: CombatStatus;
  units: number;
  missingInitiative: boolean;
  adding: boolean;
  initiativeOpen: boolean;
  numpadOpen: boolean;
  menuOpen: boolean;
  shareOpen: boolean;
  otherOpen: boolean;
}

export type DmState = DmListState | DmCombatState;

export const DM_STEPS: Record<DmStepId, TourStepDef> = {
  create: { stage: 1, target: "[data-tour='create']", action: 'click' },
  title: { stage: 1, target: "[data-tour='title']", action: 'promote' },
  confirm: { stage: 1, target: "[data-tour='confirm']", action: 'click' },
  open: { stage: 2, target: "[data-tour='open-combat']", action: 'click' },
  addUnit: { stage: 3, target: "[data-tour='add-unit']", action: 'click' },
  unitName: { stage: 3, target: "[data-tour='unit-name']", action: 'promote' },
  unitSave: { stage: 3, target: "[data-tour='unit-save']", action: 'click' },
  initiative: { stage: 4, target: "[data-tour='initiative']", action: 'click' },
  roll: { stage: 4, target: "[data-tour='roll']", action: 'click' },
  start: { stage: 5, target: "[data-tour='turn-bar']", action: 'click' },
  hp: { stage: 6, target: "[data-tour='hp']", action: 'click' },
  hpApply: { stage: 6, target: "[data-tour='hp-apply']", action: 'advance' },
  nextTurn: { stage: 7, target: "[data-tour='turn-bar']", action: 'click' },
  menu: { stage: 8, target: "[data-tour='menu']", action: 'click' },
  share: { stage: 8, target: "[role='menuitem'][data-item='share']", action: 'click' },
  link: { stage: 8, target: "[data-tour='share-qr']", action: 'finish' },
};

export const DM_PROMOTIONS: Partial<Record<DmStepId, DmStepId>> = {
  title: 'confirm',
  unitName: 'unitSave',
};

export function dmSettled(progress: TourProgress, state: DmState): TourProgress {
  if (progress === 'unset') {
    if (state.screen !== 'list' || !state.loaded) return progress;
    return state.combatIds.length === 0 ? { stage: 1, skipped: [] } : 'done';
  }
  if (!isStage(progress) || state.screen !== 'combat') return progress;
  const { stage } = progress;
  if (stage === 2) return dmSettled(advanced(progress, 2, DM_STAGES), state);
  if (stage === 3 && state.units > 0 && !state.adding) {
    return dmSettled(advanced(progress, 3, DM_STAGES), state);
  }
  if (
    stage === 4 &&
    (state.status !== 'setup' || (!state.missingInitiative && !state.initiativeOpen))
  ) {
    return dmSettled(skippedStage(progress, 4, DM_STAGES), state);
  }
  if (stage === 5 && state.status !== 'setup') return advanced(progress, 5, DM_STAGES);
  return progress;
}

function listStep(
  stage: number,
  state: DmListState,
  combatId: string | undefined,
  promoted: boolean,
) {
  if (!state.loaded || !state.calm) return null;
  if (stage === 1) return state.formOpen ? (promoted ? 'confirm' : 'title') : 'create';
  if (stage === 2 && !state.formOpen && combatId !== undefined) {
    return state.combatIds.includes(combatId) ? 'open' : null;
  }
  return null;
}

function combatStep(stage: number, state: DmCombatState, promoted: boolean): DmStepId | null {
  const setup = state.status === 'setup';
  const idle =
    !state.adding &&
    !state.initiativeOpen &&
    !state.numpadOpen &&
    !state.menuOpen &&
    !state.shareOpen &&
    !state.otherOpen;
  switch (stage) {
    case 3:
      if (!setup) return null;
      if (state.adding) return state.otherOpen ? null : promoted ? 'unitSave' : 'unitName';
      return idle ? 'addUnit' : null;
    case 4:
      if (!setup) return null;
      if (state.initiativeOpen) return state.otherOpen ? null : 'roll';
      return idle ? 'initiative' : null;
    case 5:
      return setup && idle ? 'start' : null;
    case 6:
      if (setup) return null;
      if (state.numpadOpen) return state.otherOpen ? null : 'hpApply';
      return idle ? 'hp' : null;
    case 7:
      return !setup && idle ? 'nextTurn' : null;
    case 8:
      if (state.otherOpen) return null;
      if (state.shareOpen) return 'link';
      if (state.menuOpen) return 'share';
      return idle ? 'menu' : null;
    default:
      return null;
  }
}

export function dmStep(
  progress: TourProgress,
  state: DmState,
  promoted: DmStepId | null,
): DmStepId | null {
  if (!isStage(progress)) return null;
  const { stage } = progress;
  if (state.screen === 'list') {
    return listStep(stage, state, progress.combatId, promoted === 'title');
  }
  return combatStep(stage, state, promoted === 'unitName');
}
