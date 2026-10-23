import type {
  ConnectionState,
  LinkToken,
  Locale,
  Session,
  Settings,
  SocialProvider,
} from '@combat-planner/api/client';
import type { Combat, CombatId, DisplayName, PlayerId, Preset, Tag } from '@combat-planner/domain';

export interface FakeAccount {
  userId: string;
  email: string;
  password: string;
  displayName: DisplayName;
  language: Locale;
}

export type ScenarioSession = Omit<Session, 'method'> & Partial<Pick<Session, 'method'>>;

export interface Scenario {
  session: ScenarioSession | null;
  accounts: FakeAccount[];
  combats: Combat[];
  links: Partial<Record<CombatId, LinkToken>>;
  players: Partial<Record<CombatId, Record<PlayerId, DisplayName>>>;
  playerId: PlayerId;
  presets: Preset[];
  tags: Tag[];
  settings: Settings;
  providers: SocialProvider[];
  connection: ConnectionState;
}

export const FAKE_PLAYER_ID: PlayerId = '01JP000000000000000000PME0';

export const DM_ACCOUNT: FakeAccount = {
  userId: 'dm-1',
  email: 'dm@example.com',
  password: 'correct horse battery',
  displayName: 'Dungeon Master',
  language: 'en',
};

const defaults: Scenario = {
  session: {
    userId: DM_ACCOUNT.userId,
    email: DM_ACCOUNT.email,
    displayName: DM_ACCOUNT.displayName,
    language: DM_ACCOUNT.language,
    method: 'email',
  },
  accounts: [DM_ACCOUNT],
  combats: [],
  links: {},
  players: {},
  playerId: FAKE_PLAYER_ID,
  presets: [],
  tags: [],
  settings: { language: DM_ACCOUNT.language },
  providers: [],
  connection: 'connected',
};

const notMergedByStorybook: object = Object.freeze({});

export const scenario = (overrides: Partial<Scenario> = {}): Scenario =>
  Object.assign<Scenario, Scenario, Partial<Scenario>>(
    Object.create(notMergedByStorybook),
    defaults,
    overrides,
  );

export const isScenario = (value: unknown): value is Scenario =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === notMergedByStorybook;

export const emptyScenario: Scenario = scenario();
