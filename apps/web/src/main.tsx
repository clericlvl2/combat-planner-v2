import '@mantine/core/styles.layer.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import './root.css';
import { createHonoApiClient } from '@combat-planner/api/hono-client';
import { createQueryClient } from '@combat-planner/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { aboutLinks } from './about.ts';
import { browserLocale } from './locale.ts';
import { browserStorage, playerIdOf } from './playerId.ts';
import { AppProviders } from './providers.tsx';
import { RouteLocale } from './routeLocale.ts';
import { createAppRouter } from './router.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Element #root is missing');

const locale = browserLocale(navigator.languages);
const api = createHonoApiClient({ baseUrl: '/api' });
const queryClient = createQueryClient();
const router = createAppRouter({
  api,
  queryClient,
  playerId: playerIdOf(browserStorage),
  about: aboutLinks(import.meta.env),
});

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders api={api} queryClient={queryClient} locale={locale}>
      <RouteLocale router={router} locale={locale} />
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
