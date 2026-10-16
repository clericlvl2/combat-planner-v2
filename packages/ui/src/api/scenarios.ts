import type {
  ApiClient,
  ConnectionState,
  LinkToken,
  Locale,
  Session,
  Settings,
} from '@combat-planner/api/client';
import type { Combat, CombatId, DisplayName, PlayerId, Preset, Tag } from '@combat-planner/domain';

export type SocialProvider = Parameters<ApiClient['auth']['socialSignIn']>[0];

export interface FakeAccount {
  userId: string;
  email: string;
  password: string;
  displayName: DisplayName;
  language: Locale;
}

export interface Scenario {
  session: Session | null;
  accounts: FakeAccount[];
  combats: Combat[];
  links: Partial<Record<CombatId, LinkToken>>;
  players: Partial<Record<CombatId, Record<PlayerId, DisplayName>>>;
  presets: Preset[];
  tags: Tag[];
  settings: Settings;
  providers: SocialProvider[];
  connection: ConnectionState;
}

export const DM_ACCOUNT: FakeAccount = {
  userId: 'dm-1',
  email: 'dm@example.com',
  password: 'correct horse battery',
  displayName: 'Dungeon Master',
  language: 'en',
};

export const emptyScenario: Scenario = {
  session: {
    userId: DM_ACCOUNT.userId,
    email: DM_ACCOUNT.email,
    displayName: DM_ACCOUNT.displayName,
    language: DM_ACCOUNT.language,
  },
  accounts: [DM_ACCOUNT],
  combats: [],
  links: {},
  players: {},
  presets: [],
  tags: [],
  settings: { language: DM_ACCOUNT.language },
  providers: [],
  connection: 'connected',
};

export const scenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  ...emptyScenario,
  ...overrides,
});
