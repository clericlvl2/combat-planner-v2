import type {
  Action,
  Combat,
  CombatFile,
  CombatId,
  PlayerCombat,
  Preset,
  PresetId,
  Tag,
  TagId,
} from '@combat-planner/domain';
import {
  LIMITS,
  actionSchema,
  colorSchema,
  combatDescriptionSchema,
  combatSchema,
  combatStatusSchema,
  combatTitleSchema,
  displayNameSchema,
  isoDateSchema,
  playerCombatSchema,
  presetSchema,
  roundSchema,
  tagNameSchema,
  ulidSchema,
} from '@combat-planner/domain';
import { z } from 'zod';

export const LOCALES = ['en', 'de', 'es', 'fr', 'ja', 'ru'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export function browserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0];
    const locale = LOCALES.find((candidate) => candidate === primary);
    if (locale) return locale;
  }
  return 'en';
}

export const acceptLanguages = (header: string | null): string[] =>
  (header ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim() ?? '')
    .filter((language) => language !== '');

export const BODY_LIMIT_BYTES = 64 * 1024;

export const versionSchema = z.number().int().nonnegative();
export const versionResultSchema = z.object({ version: versionSchema });
export type VersionResult = z.infer<typeof versionResultSchema>;

export const emailSchema = z.email();
export const passwordSchema = z.string().min(8);

export const SOCIAL_PROVIDERS = ['google', 'github'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SIGN_IN_METHODS = ['email', ...SOCIAL_PROVIDERS] as const;
export const signInMethodSchema = z.enum(SIGN_IN_METHODS);
export type SignInMethod = z.infer<typeof signInMethodSchema>;

export const sessionSchema = z.object({
  userId: z.string().min(1),
  email: emailSchema,
  displayName: displayNameSchema,
  language: localeSchema,
  method: signInMethodSchema,
});
export type Session = z.infer<typeof sessionSchema>;

export const signUpInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  language: localeSchema.optional(),
});
export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInInputSchema>;

export const combatSummarySchema = z.object({
  id: ulidSchema,
  title: combatTitleSchema,
  description: combatDescriptionSchema,
  color: colorSchema,
  status: combatStatusSchema,
  round: roundSchema.nullable(),
  unitCount: z.number().int().min(0).max(LIMITS.unitsPerCombat),
  lastPlayedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type CombatSummary = z.infer<typeof combatSummarySchema>;

export const undoSummarySchema = z.object({
  action: actionSchema,
  unitName: z.string().nullable(),
});
export type UndoSummary = z.infer<typeof undoSummarySchema>;

export const dmCombatSchema = combatSchema.safeExtend({ undo: undoSummarySchema.nullable() });
export type DmCombat = z.infer<typeof dmCombatSchema>;

export const combatCreateInputSchema = z.object({
  id: ulidSchema,
  title: combatTitleSchema,
  description: combatDescriptionSchema,
  color: colorSchema,
});
export type CombatCreateInput = z.infer<typeof combatCreateInputSchema>;

export const combatPatchSchema = combatCreateInputSchema.omit({ id: true }).partial();
export type CombatPatch = z.infer<typeof combatPatchSchema>;

export const linkTokenSchema = z.string().min(1);
export type LinkToken = z.infer<typeof linkTokenSchema>;

export const linkGenerationSchema = z.number().int().nonnegative();

export const playerLinkSchema = z.object({
  token: linkTokenSchema,
  generation: linkGenerationSchema,
});
export type PlayerLink = z.infer<typeof playerLinkSchema>;

export const linkReissueResultSchema = z.object({
  token: linkTokenSchema,
  generation: linkGenerationSchema,
});
export type LinkReissueResult = z.infer<typeof linkReissueResultSchema>;

export const playerIdentitySchema = z.object({
  playerId: ulidSchema,
  displayName: displayNameSchema,
});
export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;

export const playerKeySchema = z.string().min(1).max(64);
export type PlayerKey = z.infer<typeof playerKeySchema>;

export const playerCredentialsSchema = z.object({
  playerId: ulidSchema,
  playerKey: playerKeySchema,
});
export type PlayerCredentials = z.infer<typeof playerCredentialsSchema>;

export interface PlayerKeyStore {
  get(combatId: CombatId): PlayerCredentials | null;
  set(combatId: CombatId, credentials: PlayerCredentials): void;
  delete(combatId: CombatId): void;
}

export const playViewSchema = z.object({
  combatId: ulidSchema,
  playerId: ulidSchema,
  language: localeSchema,
  combat: playerCombatSchema,
});
export type PlayView = z.infer<typeof playViewSchema>;

export const presetCreateInputSchema = presetSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({ tags: presetSchema.shape.tags.max(LIMITS.tagsPerDm) });
export type PresetCreateInput = z.infer<typeof presetCreateInputSchema>;

export const presetPatchSchema = presetCreateInputSchema.omit({ id: true }).partial();
export type PresetPatch = z.infer<typeof presetPatchSchema>;

export const tagCreateInputSchema = z.object({
  id: ulidSchema,
  name: tagNameSchema,
});
export type TagCreateInput = z.infer<typeof tagCreateInputSchema>;

export const settingsSchema = z.object({ language: localeSchema });
export type Settings = z.infer<typeof settingsSchema>;

export const accountPatchSchema = z.object({ displayName: displayNameSchema });
export type AccountPatch = z.infer<typeof accountPatchSchema>;

export const CONNECTION_STATES = ['connected', 'reconnecting', 'offline'] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

export const API_ERROR_CODES = [
  'version',
  'forbidden',
  'notFound',
  'invalid',
  'unauthorized',
  'network',
  'linkRevoked',
  'limit',
  'rateLimited',
  'emailTaken',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorInit {
  status: number;
  code: ApiErrorCode;
  message?: string;
  retryable?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly retryable: boolean;

  constructor({ status, code, message = code, retryable = code === 'network' }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export const apiEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('document'),
    version: versionSchema,
    document: z.union([dmCombatSchema, playerCombatSchema]),
    language: localeSchema.optional(),
  }),
  z.object({ type: z.literal('deleted'), title: combatTitleSchema }),
  z.object({ type: z.literal('linkRevoked') }),
  z.object({ type: z.literal('dropped') }),
  z.object({ type: z.literal('left') }),
  z.object({ type: z.literal('playerJoined') }),
  z.object({ type: z.literal('playerLeft'), name: displayNameSchema }),
]);
export type ApiEvent = z.infer<typeof apiEventSchema>;
export type ApiEndEvent =
  | Extract<ApiEvent, { type: 'deleted' | 'linkRevoked' | 'dropped' | 'left' }>
  | { type: 'unauthorized' };
export type PresenceEvent = Extract<ApiEvent, { type: 'playerJoined' | 'playerLeft' }>;

export const isPresenceEvent = (event: ApiEvent): event is PresenceEvent =>
  event.type === 'playerJoined' || event.type === 'playerLeft';

export type Unsubscribe = () => void;
export type DocumentListener<Document extends DmCombat | PlayerCombat> = (
  document: Document,
) => void;
export type PlayerDocumentListener = (document: PlayerCombat, language?: Locale) => void;
export type EndListener = (event: ApiEndEvent) => void;
export type PresenceListener = (event: PresenceEvent) => void;
export type ConnectionListener = (state: ConnectionState) => void;

export interface ConnectionApi {
  state(): ConnectionState;
  subscribe(listener: ConnectionListener): Unsubscribe;
}

export interface AuthApi {
  signUp(input: SignUpInput): Promise<Session>;
  signIn(input: SignInInput): Promise<Session>;
  signOut(): Promise<void>;
  signOutOtherDevices(): Promise<void>;
  session(): Promise<Session | null>;
  providers(): Promise<SocialProvider[]>;
  socialSignIn(provider: SocialProvider, callbackUrl: string): Promise<{ url: string }>;
}

export interface CombatsApi {
  list(): Promise<CombatSummary[]>;
  create(input: CombatCreateInput): Promise<Combat>;
  update(id: CombatId, patch: CombatPatch): Promise<VersionResult>;
  remove(id: CombatId): Promise<void>;
  duplicate(id: CombatId, newId: CombatId): Promise<Combat>;
  importCombat(file: CombatFile): Promise<Combat>;
  open(id: CombatId): Promise<DmCombat>;
  get(id: CombatId): Promise<DmCombat>;
  dispatch(id: CombatId, action: Action): Promise<VersionResult>;
  subscribe(
    id: CombatId,
    onDocument: DocumentListener<DmCombat>,
    onEnd: EndListener,
    onPresence?: PresenceListener,
  ): Unsubscribe;
}

export interface LinkApi {
  get(id: CombatId): Promise<PlayerLink>;
  reissue(id: CombatId): Promise<LinkReissueResult>;
  stopSharing(id: CombatId): Promise<void>;
}

export interface PlayApi {
  get(token: LinkToken): Promise<PlayView>;
  dispatch(token: LinkToken, action: Action): Promise<VersionResult>;
  subscribe(token: LinkToken, onDocument: PlayerDocumentListener, onEnd: EndListener): Unsubscribe;
  leave(combatId: CombatId): Promise<void>;
}

export interface PresetsApi {
  list(): Promise<Preset[]>;
  create(input: PresetCreateInput): Promise<Preset>;
  update(id: PresetId, patch: PresetPatch): Promise<Preset>;
  remove(id: PresetId): Promise<void>;
  duplicate(id: PresetId, newId: PresetId): Promise<Preset>;
}

export interface TagsApi {
  list(): Promise<Tag[]>;
  create(input: TagCreateInput): Promise<Tag>;
  rename(id: TagId, name: Tag['name']): Promise<Tag>;
  remove(id: TagId): Promise<void>;
}

export interface SettingsApi {
  get(): Promise<Settings>;
  update(patch: Settings): Promise<Settings>;
}

export interface AccountApi {
  update(patch: AccountPatch): Promise<Session>;
  remove(): Promise<void>;
}

export interface ApiClient {
  connection: ConnectionApi;
  auth: AuthApi;
  combats: CombatsApi;
  link: LinkApi;
  play: PlayApi;
  presets: PresetsApi;
  tags: TagsApi;
  settings: SettingsApi;
  account: AccountApi;
}
