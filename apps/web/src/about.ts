import type { AboutLinks } from './router.tsx';

export const DEFAULT_SOURCE_URL = 'https://github.com/clericlvl2/combat-planner-v2';

export const aboutLinks = (env: ImportMetaEnv): AboutLinks => ({
  version: env.VITE_APP_VERSION,
  sourceUrl: env.VITE_SOURCE_URL || DEFAULT_SOURCE_URL,
});
