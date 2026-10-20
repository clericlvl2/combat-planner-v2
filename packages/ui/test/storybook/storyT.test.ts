import { describe, expect, it } from 'vite-plus/test';
import { storyT } from '../../src/storybook/storyT.ts';

describe('storyT', () => {
  it('translates through the locale global of the story', () => {
    const t = storyT({ locale: 'ru' }, 'PlayerRow');
    expect(t('conditions')).toBe('Состояния');
    expect(t('Button:save')).toBe('Сохранить');
  });

  it('falls back to en without a locale global', () => {
    expect(storyT({}, 'PlayerRow')('conditions')).toBe('Conditions');
  });
});
