import { describe, expect, it } from 'vite-plus/test';
import { anyValue, escapeRegExp, storyT } from '../../src/storybook/storyT.ts';

describe('storyT', () => {
  it('translates through the locale global of the story', () => {
    const t = storyT({ locale: 'ru' }, 'PlayerRow');
    expect(t('conditions')).toBe('Состояния');
    expect(t('Button:save')).toBe('Сохранить');
  });

  it('falls back to en without a locale global', () => {
    expect(storyT({}, 'PlayerRow')('conditions')).toBe('Conditions');
  });

  it('matches every plural form of the key it is given', () => {
    const units = anyValue(storyT({ locale: 'ru' }, 'CombatCard'), 'units', 'count');
    expect(['1 юнит', '3 юнита', '5 юнитов'].filter((label) => units.test(label))).toHaveLength(3);
    expect(units.test('5 units')).toBe(false);
  });

  it('matches a value inside a key without plural forms', () => {
    const create = anyValue(storyT({}, 'CheckList'), 'create', 'query');
    expect(create.test('Create “Orc (big)”')).toBe(true);
    expect(create.test('Create “”')).toBe(false);
  });

  it('escapes every regular expression character', () => {
    expect(new RegExp(`^${escapeRegExp('a.b*(c)')}$`).test('a.b*(c)')).toBe(true);
    expect(new RegExp(`^${escapeRegExp('a.b')}$`).test('axb')).toBe(false);
  });
});
