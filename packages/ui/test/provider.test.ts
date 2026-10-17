import { describe, expect, it } from 'vite-plus/test';
import { createI18n, followLanguage } from '../src/provider.tsx';

describe('followLanguage', () => {
  it('sets lang to the interface language and follows every switch until stopped', async () => {
    const i18n = createI18n('de');
    const root = { lang: 'en' };
    const stop = followLanguage(i18n, root);
    expect(root.lang).toBe('de');
    await i18n.changeLanguage('ja');
    expect(root.lang).toBe('ja');
    await i18n.changeLanguage('ru');
    expect(root.lang).toBe('ru');
    stop();
    expect(root.lang).toBe('en');
    await i18n.changeLanguage('es');
    expect(root.lang).toBe('en');
  });
});
