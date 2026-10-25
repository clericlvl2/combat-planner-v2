import type { ApiClient } from '@combat-planner/api/client';
import { describeApiClientContract } from '@combat-planner/api/contract';
import { ulid } from 'ulid';
import { FakeApiClient } from '../../src/api/FakeApiClient.ts';
import { scenario } from '../../src/api/scenarios.ts';

describeApiClientContract('FakeApiClient', async () => {
  const fake = new FakeApiClient({ scenario: scenario({ session: null, accounts: [] }) });
  return {
    dm: fake,
    player: (): ApiClient => Object.assign(Object.create(fake), { play: fake.playAs(ulid()) }),
    close: async () => undefined,
  };
});
