import type { CombatStatus } from '@combat-planner/domain';
import { HP_STEP_TARGET, advanced, skippedStage } from './flow.ts';
import type { TourStepDef } from './flow.ts';
import { isStage } from './progress.ts';
import type { TourProgress } from './progress.ts';

export const PLAYER_STAGES = 6;

export type PlayerStepId =
  | 'playerName'
  | 'playerHero'
  | 'playerJoin'
  | 'playerIntro'
  | 'playerInitiative'
  | 'playerRoll'
  | 'playerHp'
  | 'playerHpApply'
  | 'playerExpand'
  | 'playerMenu'
  | 'playerTurn';

export interface PlayerHeroesState {
  screen: 'heroes';
  holdsHero: boolean;
  nameFilled: boolean;
  picked: boolean;
  freeHero: boolean;
  calm: boolean;
}

export interface PlayerTurnOrderState {
  screen: 'turnOrder';
  holdsHero: boolean;
  status: CombatStatus;
  heroInitiative: boolean;
  expanded: boolean;
  initiativeOpen: boolean;
  numpadOpen: boolean;
  otherOpen: boolean;
  stripShown: boolean;
}

export type PlayerState = PlayerHeroesState | PlayerTurnOrderState;

const OWN_ROW = "[data-tour='own-row']";

export const PLAYER_STEPS: Record<PlayerStepId, TourStepDef> = {
  playerName: { stage: 1, target: "[data-tour='player-name']", action: 'focus' },
  playerHero: { stage: 1, target: "[data-tour='hero']", action: 'click' },
  playerJoin: { stage: 1, target: "[data-tour='join']", action: 'click' },
  playerIntro: { stage: 2, target: OWN_ROW, action: 'advance' },
  playerInitiative: {
    stage: 3,
    target: `${OWN_ROW} [data-tour='initiative']`,
    action: 'click',
  },
  playerRoll: { stage: 3, target: "[data-tour='roll']", action: 'click' },
  playerHp: { stage: 4, target: `${OWN_ROW} [data-tour='hp']`, action: 'click' },
  playerHpApply: { stage: 4, target: HP_STEP_TARGET, action: 'dismiss' },
  playerExpand: {
    stage: 5,
    target: OWN_ROW,
    press: `${OWN_ROW} [data-tour='toggle']`,
    action: 'click',
  },
  playerMenu: { stage: 6, target: "[data-tour='menu']", action: 'finish' },
  playerTurn: { stage: 0, target: "[data-tour='turn-strip']", action: 'finish' },
};

export function playerPending(progress: TourProgress, state: PlayerState): number[] {
  if (!isStage(progress) || progress.stage >= 3) return [];
  return state.screen === 'turnOrder' && state.heroInitiative ? [3] : [];
}

export function playerSettled(progress: TourProgress, state: PlayerState): TourProgress {
  if (progress === 'unset') {
    return state.holdsHero ? { stage: 2, skipped: [1] } : { stage: 1, skipped: [] };
  }
  if (!isStage(progress) || state.screen !== 'turnOrder') return progress;
  const { stage } = progress;
  if (stage === 1 && state.holdsHero) {
    return playerSettled(advanced(progress, 1, PLAYER_STAGES), state);
  }
  if (stage === 3 && state.heroInitiative && !state.initiativeOpen) {
    return playerSettled(skippedStage(progress, 3, PLAYER_STAGES), state);
  }
  if (stage === 5 && state.expanded) return advanced(progress, 5, PLAYER_STAGES);
  return progress;
}

function heroesStep(stage: number, state: PlayerHeroesState): PlayerStepId | null {
  if (stage !== 1 || !state.calm) return null;
  if (!state.nameFilled) return 'playerName';
  if (!state.picked) return state.freeHero ? 'playerHero' : null;
  return 'playerJoin';
}

function turnOrderStep(stage: number, state: PlayerTurnOrderState): PlayerStepId | null {
  if (!state.holdsHero) return null;
  const idle = !state.initiativeOpen && !state.numpadOpen && !state.otherOpen;
  switch (stage) {
    case 2:
      return idle ? 'playerIntro' : null;
    case 3:
      if (state.initiativeOpen) return state.otherOpen ? null : 'playerRoll';
      return idle ? 'playerInitiative' : null;
    case 4:
      if (state.numpadOpen) return state.otherOpen ? null : 'playerHpApply';
      return idle ? 'playerHp' : null;
    case 5:
      return idle ? 'playerExpand' : null;
    case 6:
      return idle ? 'playerMenu' : null;
    default:
      return null;
  }
}

export function playerStep(
  progress: TourProgress,
  turn: TourProgress,
  state: PlayerState,
): PlayerStepId | null {
  if (isStage(progress)) {
    return state.screen === 'heroes'
      ? heroesStep(progress.stage, state)
      : turnOrderStep(progress.stage, state);
  }
  if (progress !== 'done' || turn !== 'unset' || state.screen !== 'turnOrder') return null;
  const idle = !state.initiativeOpen && !state.numpadOpen && !state.otherOpen;
  return state.holdsHero && state.stripShown && idle ? 'playerTurn' : null;
}
