import { describe, expect, it } from 'vite-plus/test';
import { counterOf } from '../../src/tour/flow.ts';
import {
  PLAYER_STAGES,
  playerPending,
  playerSettled,
  playerStep,
} from '../../src/tour/playerTour.ts';
import type { PlayerHeroesState, PlayerTurnOrderState } from '../../src/tour/playerTour.ts';
import type { TourProgress } from '../../src/tour/progress.ts';

const heroes = (patch: Partial<PlayerHeroesState> = {}): PlayerHeroesState => ({
  screen: 'heroes',
  holdsHero: false,
  nameFilled: false,
  picked: false,
  freeHero: true,
  calm: true,
  ...patch,
});

const order = (patch: Partial<PlayerTurnOrderState> = {}): PlayerTurnOrderState => ({
  screen: 'turnOrder',
  holdsHero: true,
  status: 'setup',
  heroInitiative: false,
  expanded: false,
  initiativeOpen: false,
  numpadOpen: false,
  otherOpen: false,
  stripShown: false,
  ...patch,
});

const at = (stage: number, skipped: number[] = []): TourProgress => ({ stage, skipped });

describe('playerSettled', () => {
  it('starts a new player at the heroes', () => {
    expect(playerSettled('unset', heroes())).toEqual(at(1));
  });

  it('starts a returning player who holds a hero at the turn order', () => {
    const settled = playerSettled('unset', order());
    expect(settled).toEqual(at(2, [1]));
    expect(counterOf(settled, PLAYER_STAGES, playerPending(settled, order()))).toEqual({
      current: 1,
      total: 5,
    });
    const rolled = order({ heroInitiative: true });
    expect(counterOf(settled, PLAYER_STAGES, playerPending(settled, rolled))).toEqual({
      current: 1,
      total: 4,
    });
  });

  it('counts joining as stage 1 done', () => {
    expect(playerSettled(at(1), order())).toEqual(at(2));
    expect(playerSettled(at(1), heroes({ nameFilled: true }))).toEqual(at(1));
  });

  it('skips initiative once the hero has it', () => {
    expect(playerSettled(at(3), order({ heroInitiative: true }))).toEqual(at(4, [3]));
    expect(playerSettled(at(3), order({ heroInitiative: true, initiativeOpen: true }))).toEqual(
      at(3),
    );
  });

  it('counts expanding the own row as stage 5 done', () => {
    expect(playerSettled(at(5), order({ expanded: true }))).toEqual(at(6));
  });
});

describe('playerStep', () => {
  it('walks the heroes screen', () => {
    expect(playerStep(at(1), 'unset', heroes())).toBe('playerName');
    expect(playerStep(at(1), 'unset', heroes({ nameFilled: true }))).toBe('playerHero');
    expect(playerStep(at(1), 'unset', heroes({ nameFilled: true, picked: true }))).toBe(
      'playerJoin',
    );
    expect(playerStep(at(1), 'unset', heroes({ nameFilled: true, freeHero: false }))).toBeNull();
    expect(playerStep(at(1), 'unset', heroes({ calm: false }))).toBeNull();
  });

  it('walks the turn order', () => {
    expect(playerStep(at(2), 'unset', order())).toBe('playerIntro');
    expect(playerStep(at(3), 'unset', order())).toBe('playerInitiative');
    expect(playerStep(at(3), 'unset', order({ initiativeOpen: true }))).toBe('playerRoll');
    expect(playerStep(at(4), 'unset', order())).toBe('playerHp');
    expect(playerStep(at(4), 'unset', order({ numpadOpen: true }))).toBe('playerHpApply');
    expect(playerStep(at(5), 'unset', order())).toBe('playerExpand');
    expect(playerStep(at(6), 'unset', order())).toBe('playerMenu');
  });

  it('shows nothing while a sheet or menu of the screen is open', () => {
    expect(playerStep(at(2), 'unset', order({ otherOpen: true }))).toBeNull();
    expect(playerStep(at(6), 'unset', order({ numpadOpen: true }))).toBeNull();
  });

  it('shows nothing on the turn order without a hero', () => {
    expect(playerStep(at(2), 'unset', order({ holdsHero: false }))).toBeNull();
  });

  it('rings the turn strip once after a finished tour', () => {
    expect(playerStep('done', 'unset', order({ stripShown: true }))).toBe('playerTurn');
    expect(playerStep('done', 'done', order({ stripShown: true }))).toBeNull();
    expect(playerStep('done', 'unset', order())).toBeNull();
    expect(playerStep(at(4), 'unset', order({ stripShown: true }))).toBe('playerHp');
  });
});
