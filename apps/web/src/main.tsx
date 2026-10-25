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
import { DesktopAside, createQueryClient, guestLocale } from '@combat-planner/ui';
import { StrictMode } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { aboutLinks } from './about.ts';
import { createErrorReporter } from './errorReports.ts';
import { browserStorage, playerKeysOf } from './playerId.ts';
import { AppProviders } from './providers.tsx';
import { BindLanguage, RouteLocale, languageBridge } from './routeLocale.ts';
import { createAppRouter } from './router.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Element #root is missing');
const asideElement = document.getElementById('aside');

const currentGuestLocale = () => guestLocale(browserStorage, navigator.languages);
const locale = currentGuestLocale();
const api = createHonoApiClient({ baseUrl: '/api', playerKeys: playerKeysOf(browserStorage) });
const errorReporter = createErrorReporter({
  send: (report) => api.reportError(report),
  version: import.meta.env.VITE_APP_VERSION,
  path: () => window.location.pathname,
});
errorReporter.listen(window);
const queryClient = createQueryClient();
const { language, bind } = languageBridge();
const router = createAppRouter({
  api,
  queryClient,
  about: aboutLinks(import.meta.env),
  language,
  reportError: (error) => errorReporter.report(error),
  guestAtBoot: document.documentElement.dataset.boot === 'guest',
});

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders
      api={api}
      queryClient={queryClient}
      locale={locale}
      localeStorage={browserStorage}
    >
      <BindLanguage bind={bind} />
      <RouteLocale router={router} locale={currentGuestLocale} />
      <RouterProvider router={router} />
      {asideElement && createPortal(<DesktopAside />, asideElement)}
    </AppProviders>
  </StrictMode>,
);
