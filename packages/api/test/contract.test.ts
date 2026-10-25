import { describeApiClientContract } from '../src/contract/apiClientContract.ts';
import { createHonoApiClient, memoryPlayerKeys } from '../src/hono-client.ts';
import { createBrowser, createTestApp } from './helpers.ts';
import { inProcessEventSource, inProcessFetch } from './inProcess.ts';

describeApiClientContract('Hono client', async () => {
  const opened = createTestApp({ rateLimit: false });
  const client = () => {
    const browser = createBrowser(opened.app);
    return createHonoApiClient({
      baseUrl: 'http://localhost',
      fetch: inProcessFetch(browser),
      eventSource: inProcessEventSource(browser),
      playerKeys: memoryPlayerKeys(),
    });
  };
  return {
    dm: client(),
    player: client,
    close: async () => opened.close(),
  };
});
