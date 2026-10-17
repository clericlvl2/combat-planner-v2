import { combineParameters } from 'storybook/preview-api';
import { describe, expect, it } from 'vite-plus/test';
import { emptyScenario, isScenario, scenario } from '../../src/api/scenarios.ts';
import { COMBAT_ID, PLAYER_ID, TOKEN, combat } from './fixtures.ts';

describe('scenario', () => {
  it('replaces the meta scenario with the story scenario when Storybook combines parameters', () => {
    const meta = scenario({
      combats: [combat()],
      links: { [COMBAT_ID]: TOKEN },
      players: { [COMBAT_ID]: { [PLAYER_ID]: 'Ильза' } },
      settings: { language: 'de' },
    });
    const story = scenario({ session: null });
    const combined: Record<string, unknown> = combineParameters(
      { scenario: meta, layout: 'fullscreen' },
      { scenario: story },
    );
    expect(combined.scenario).toBe(story);
    expect(combined.layout).toBe('fullscreen');
  });

  it('keeps the meta scenario when the story sets none', () => {
    const meta = scenario({ links: { [COMBAT_ID]: TOKEN } });
    const combined: Record<string, unknown> = combineParameters({ scenario: meta }, {});
    expect(combined.scenario).toBe(meta);
  });

  it('marks every built scenario and no plain object', () => {
    expect(isScenario(emptyScenario)).toBe(true);
    expect(isScenario(scenario({ ...emptyScenario, connection: 'offline' }))).toBe(true);
    expect(isScenario({ ...emptyScenario })).toBe(false);
    expect(emptyScenario.session).toMatchObject({ method: 'email' });
  });
});
