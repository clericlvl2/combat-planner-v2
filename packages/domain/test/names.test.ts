import { describe, expect, it } from 'vite-plus/test';
import { copyTitle, duplicateName, normalizeTag } from '../src/index.ts';

describe('duplicateName', () => {
  it('Duplicate юнита: копия под оригиналом, `<name> 2`, HP полные, инициатива скопирована.', () => {
    expect(duplicateName('Goblin', ['Goblin'])).toBe('Goblin 2');
  });

  it('Duplicate: `<name> 2`, `<name> 3`, …, right under the original, HP at max, no temp HP, no conditions, initiative copied', () => {
    expect(duplicateName('Goblin', ['Goblin', 'Goblin 2'])).toBe('Goblin 3');
    expect(duplicateName('Goblin', ['Goblin', 'Goblin 2', 'Goblin 3'])).toBe('Goblin 4');
  });

  it('continues the numbering when the name already ends with a number', () => {
    expect(duplicateName('Goblin 2', ['Goblin', 'Goblin 2'])).toBe('Goblin 3');
    expect(duplicateName('Goblin 2', ['Goblin', 'Goblin 2', 'Goblin 3'])).toBe('Goblin 4');
    expect(duplicateName('Squad 7', ['Squad 7'])).toBe('Squad 8');
  });

  it('stays within the 40-character name limit', () => {
    const long = 'Г'.repeat(40);
    const copy = duplicateName(long, [long]);
    expect(copy.length).toBeLessThanOrEqual(40);
    expect(copy.endsWith(' 2')).toBe(true);
    const second = duplicateName(long, [long, copy]);
    expect(second.length).toBeLessThanOrEqual(40);
    expect(second.endsWith(' 3')).toBe(true);
    expect(duplicateName('a'.repeat(38), ['a'.repeat(38)])).toBe(`${'a'.repeat(38)} 2`);
  });

  it('Duplicate a preset: `<name> 2`, tags copied, toast `<name> 2 created`.', () => {
    expect(duplicateName('Орк', ['Орк', 'Гоблин'])).toBe('Орк 2');
  });
});

describe('copyTitle', () => {
  it('Копия боя: `<title> (copy)`, Setup, полные HP, без захватов, ссылки, лога.', () => {
    expect(copyTitle('Ambush')).toBe('Ambush (copy)');
    expect(copyTitle('Засада (copy)')).toBe('Засада (copy) (copy)');
  });

  it('stays within the 80-character title limit', () => {
    const copy = copyTitle('t'.repeat(80));
    expect(copy.length).toBe(80);
    expect(copy).toBe(`${'t'.repeat(73)} (copy)`);
    expect(copyTitle('t'.repeat(73))).toBe(`${'t'.repeat(73)} (copy)`);
  });
});

describe('normalizeTag', () => {
  it('Тег до 24 символов, без учёта регистра. Удаление пресета не трогает юнитов.', () => {
    expect(normalizeTag('Undead')).toBe('undead');
    expect(normalizeTag('UNDEAD')).toBe(normalizeTag('undead'));
    expect(normalizeTag('a'.repeat(30)).length).toBe(24);
  });

  it("Names are compared case-insensitively; an existing tag's spelling is reused.", () => {
    expect(normalizeTag('  Boss ')).toBe('boss');
    expect(normalizeTag('Нежить')).toBe('нежить');
    expect(normalizeTag('Нежить')).toBe(normalizeTag('НЕЖИТЬ'));
  });
});
