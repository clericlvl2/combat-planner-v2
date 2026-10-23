import { ApiError } from '@combat-planner/api/client';
import type {
  ApiClient,
  ApiEndEvent,
  ApiErrorCode,
  CombatSummary,
  ConnectionListener,
  ConnectionState,
  DmCombat,
  DocumentListener,
  EndListener,
  LinkToken,
  PlayerDocumentListener,
  Session,
  SocialProvider,
  Unsubscribe,
  VersionResult,
} from '@combat-planner/api/client';
import type {
  Action,
  Combat,
  CombatId,
  DomainErrorCode,
  LogEntry,
  PlayerId,
  Preset,
  Tag,
  Viewer,
} from '@combat-planner/domain';
import {
  DomainError,
  LIMITS,
  apply,
  authorize,
  copyCombat,
  duplicateName,
  normalizeTag,
  project,
  undoSummary,
} from '@combat-planner/domain';
import { ulid } from 'ulid';
import type { FakeAccount, Scenario, ScenarioSession } from './scenarios.ts';

export interface FakeApiClientOptions {
  scenario: Scenario;
  delay?: number;
}

export interface FakeCall {
  method: string;
  args: unknown[];
}

interface StoredCombat {
  combat: Combat;
  log: LogEntry[];
}

interface DmSubscriber {
  onDocument: DocumentListener<DmCombat>;
  onEnd: EndListener;
  version: number;
}

interface PlayerSubscriber {
  playerId: PlayerId;
  onDocument: PlayerDocumentListener;
  onEnd: EndListener;
  version: number;
}

interface IssuedLink {
  combatId: CombatId;
  generation: number;
}

export const FAKE_ERROR_STATUS: Record<ApiErrorCode, number> = {
  version: 409,
  forbidden: 403,
  notFound: 404,
  invalid: 422,
  unauthorized: 401,
  network: 0,
  linkRevoked: 410,
  limit: 422,
  rateLimited: 429,
  emailTaken: 422,
};

const DOMAIN_ERROR_CODE: Record<DomainErrorCode, ApiErrorCode> = {
  version: 'version',
  forbidden: 'forbidden',
  blocked: 'invalid',
  limit: 'limit',
  invalid: 'invalid',
  notFound: 'notFound',
};

const DM = { kind: 'dm' } as const satisfies Viewer;

const fail = (code: ApiErrorCode, message: string = code): ApiError =>
  new ApiError({ status: FAKE_ERROR_STATUS[code], code, message });

const fromDomain = (error: DomainError): ApiError =>
  fail(DOMAIN_ERROR_CODE[error.code], error.message);

const nowIso = (): string => new Date().toISOString();

const dmDocument = ({ combat, log }: StoredCombat): DmCombat => ({
  ...combat,
  undo: undoSummary(combat, log),
});

const tokenOf = (combatId: CombatId, generation: number): LinkToken =>
  `${combatId}.${generation}.fake`;

const summaryOf = (combat: Combat): CombatSummary => ({
  id: combat.id,
  title: combat.title,
  description: combat.description,
  color: combat.color,
  status: combat.status,
  round: combat.status === 'active' ? combat.round : null,
  unitCount: combat.units.length,
  lastPlayedAt: combat.lastPlayedAt,
  createdAt: combat.createdAt,
  updatedAt: combat.updatedAt,
});

const sessionOf = (account: FakeAccount): Session => ({
  userId: account.userId,
  email: account.email,
  displayName: account.displayName,
  language: account.language,
  method: 'email',
});

const scenarioSession = (session: ScenarioSession | null): Session | null =>
  session && { method: 'email', ...session };

export class FakeApiClient implements ApiClient {
  readonly calls: FakeCall[] = [];

  private readonly delay: number;
  private session: Session | null;
  private readonly accounts: FakeAccount[];
  private readonly combatStore = new Map<CombatId, StoredCombat>();
  private readonly links = new Map<LinkToken, IssuedLink>();
  private presetList: Preset[];
  private tagList: Tag[];
  private settingsValue: Scenario['settings'];
  private readonly providerList: SocialProvider[];
  private connectionState: ConnectionState;
  private readonly connectionListeners = new Set<ConnectionListener>();
  private readonly dmSubscribers = new Map<CombatId, Set<DmSubscriber>>();
  private readonly playerSubscribers = new Map<CombatId, Set<PlayerSubscriber>>();
  private pendingFailure: ApiError | null = null;
  private pendingHold = false;
  private broadcastsDeferred = false;

  constructor({ scenario, delay = 0 }: FakeApiClientOptions) {
    this.delay = delay;
    this.session = scenarioSession(scenario.session);
    this.accounts = scenario.accounts.map((account) => ({ ...account }));
    for (const combat of scenario.combats) {
      const players = { ...combat.players, ...scenario.players[combat.id] };
      this.combatStore.set(combat.id, { combat: { ...combat, players }, log: [] });
      const token = scenario.links[combat.id] ?? tokenOf(combat.id, combat.linkGeneration);
      this.links.set(token, { combatId: combat.id, generation: combat.linkGeneration });
    }
    this.presetList = [...scenario.presets];
    this.tagList = [...scenario.tags];
    this.settingsValue = { ...scenario.settings };
    this.providerList = [...scenario.providers];
    this.connectionState = scenario.connection;
  }

  setConnection(state: ConnectionState): void {
    if (state === this.connectionState) return;
    this.connectionState = state;
    for (const listener of this.connectionListeners) listener(state);
    if (state !== 'connected') return;
    for (const stored of this.combatStore.values()) this.broadcast(stored);
  }

  deferBroadcasts(): void {
    this.broadcastsDeferred = true;
  }

  expireSession(): void {
    this.session = null;
    const ended = [...this.dmSubscribers.values()].flatMap((subscribers) => [...subscribers]);
    this.dmSubscribers.clear();
    for (const subscriber of ended) subscriber.onEnd({ type: 'unauthorized' });
  }

  failNext(code: ApiErrorCode): void {
    this.pendingFailure = fail(code);
  }

  holdNext(): void {
    this.pendingHold = true;
  }

  private run<T>(method: string, args: unknown[], operation: () => T): Promise<T> {
    this.calls.push({ method, args });
    if (this.pendingHold) {
      this.pendingHold = false;
      return new Promise<T>(() => undefined);
    }
    const failure = this.pendingFailure;
    this.pendingFailure = null;
    return new Promise<T>((resolve, reject) => {
      const settle = () => {
        if (failure) {
          reject(failure);
          return;
        }
        try {
          resolve(operation());
        } catch (error) {
          reject(error);
        }
      };
      if (this.delay > 0) setTimeout(settle, this.delay);
      else settle();
    });
  }

  private requireSession(): Session {
    if (!this.session) throw fail('unauthorized', 'Sign in first');
    return this.session;
  }

  private stored(id: CombatId): StoredCombat {
    this.requireSession();
    const found = this.combatStore.get(id);
    if (!found) throw fail('notFound', 'Combat not found');
    return found;
  }

  private save(stored: StoredCombat, combat: Combat): void {
    stored.combat = combat;
    this.broadcast(stored);
  }

  private broadcast(stored: StoredCombat, audience: 'all' | 'dm' = 'all'): void {
    if (!this.broadcastsDeferred) {
      this.deliver(stored, audience);
      return;
    }
    const snapshot: StoredCombat = { combat: stored.combat, log: [...stored.log] };
    setTimeout(() => this.deliver(snapshot, audience), 0);
  }

  private deliver(stored: StoredCombat, audience: 'all' | 'dm'): void {
    if (this.connectionState !== 'connected') return;
    const { combat } = stored;
    for (const subscriber of this.dmSubscribers.get(combat.id) ?? []) {
      this.deliverToDm(subscriber, stored);
    }
    if (audience === 'dm') return;
    for (const subscriber of this.playerSubscribers.get(combat.id) ?? []) {
      this.deliverToPlayer(subscriber, combat);
    }
  }

  private deliverToDm(subscriber: DmSubscriber, stored: StoredCombat): void {
    if (stored.combat.version <= subscriber.version) return;
    subscriber.version = stored.combat.version;
    subscriber.onDocument(dmDocument(stored));
  }

  private deliverToPlayer(subscriber: PlayerSubscriber, combat: Combat): void {
    if (combat.version <= subscriber.version) return;
    subscriber.version = combat.version;
    subscriber.onDocument(
      project(combat, { kind: 'player', playerId: subscriber.playerId }),
      this.settingsValue.language,
    );
  }

  private endSubscribers(combatId: CombatId, event: ApiEndEvent, audience: 'all' | 'player'): void {
    const players = [...(this.playerSubscribers.get(combatId) ?? [])];
    this.playerSubscribers.delete(combatId);
    for (const subscriber of players) subscriber.onEnd(event);
    if (audience === 'player') return;
    const dms = [...(this.dmSubscribers.get(combatId) ?? [])];
    this.dmSubscribers.delete(combatId);
    for (const subscriber of dms) subscriber.onEnd(event);
  }

  private dispatchAs(stored: StoredCombat, viewer: Viewer, action: Action): VersionResult {
    const known = stored.log.find((entry) => entry.action.id === action.id);
    if (known) return { version: known.action.version + 1 };
    const combat = stored.combat;
    if (action.version !== combat.version) {
      throw fail(
        'version',
        `Action version ${action.version} does not match combat version ${combat.version}`,
      );
    }
    const allowed = authorize(combat, action, viewer);
    if (allowed !== true) throw fromDomain(allowed);
    const now = nowIso();
    const result = apply(combat, action, viewer, now, stored.log);
    if (result instanceof DomainError) throw fromDomain(result);
    stored.log.push({ action, author: viewer, at: now, patch: result.patch, undoneBy: null });
    if ('undone' in result) {
      stored.log = stored.log.map((entry) =>
        entry.action.id === result.undone ? { ...entry, undoneBy: action.id } : entry,
      );
    }
    this.save(stored, result.combat);
    return { version: result.combat.version };
  }

  private resolveLink(token: LinkToken): StoredCombat {
    const issued = this.links.get(token);
    const stored = issued && this.combatStore.get(issued.combatId);
    if (!issued || !stored) throw fail('notFound', 'Combat not found');
    if (stored.combat.linkGeneration !== issued.generation) {
      throw fail('linkRevoked', 'This link was reissued');
    }
    return stored;
  }

  private currentToken(combat: Combat): LinkToken {
    for (const [token, issued] of this.links) {
      if (issued.combatId === combat.id && issued.generation === combat.linkGeneration) {
        return token;
      }
    }
    const token = tokenOf(combat.id, combat.linkGeneration);
    this.links.set(token, { combatId: combat.id, generation: combat.linkGeneration });
    return token;
  }

  private storeCombat(combat: Combat): Combat {
    const existing = this.combatStore.get(combat.id);
    if (existing) return existing.combat;
    if (this.combatStore.size >= LIMITS.combatsPerDm) {
      throw fail('limit', `A DM keeps at most ${LIMITS.combatsPerDm} combats`);
    }
    this.combatStore.set(combat.id, { combat, log: [] });
    return combat;
  }

  private findPreset(id: Preset['id']): Preset {
    const preset = this.presetList.find((candidate) => candidate.id === id);
    if (!preset) throw fail('notFound', 'Preset not found');
    return preset;
  }

  private storePreset(preset: Preset): Preset {
    const existing = this.presetList.find((candidate) => candidate.id === preset.id);
    if (existing) return existing;
    if (this.presetList.length >= LIMITS.presetsPerDm) {
      throw fail('limit', `A DM keeps at most ${LIMITS.presetsPerDm} presets`);
    }
    this.checkTags(preset.tags);
    this.presetList = [preset, ...this.presetList];
    return preset;
  }

  private checkTags(tagIds: readonly Tag['id'][]): void {
    const known = new Set(this.tagList.map((tag) => tag.id));
    if (tagIds.some((id) => !known.has(id))) {
      throw fail('invalid', 'A tag does not belong to you');
    }
  }

  private checkTagName(name: string, exceptId?: Tag['id']): void {
    const taken = this.tagList.some(
      (tag) => tag.id !== exceptId && normalizeTag(tag.name) === normalizeTag(name),
    );
    if (taken) throw fail('invalid', 'A tag with this name already exists');
  }

  private signInAs(account: FakeAccount): Session {
    this.session = sessionOf(account);
    this.settingsValue = { language: account.language };
    return this.session;
  }

  private updateAccount(patch: Partial<FakeAccount>): Session {
    const session = this.requireSession();
    const index = this.accounts.findIndex((account) => account.userId === session.userId);
    const account = this.accounts[index];
    if (account) this.accounts[index] = { ...account, ...patch };
    this.session = { ...session, ...patch };
    return this.session;
  }

  readonly connection: ApiClient['connection'] = {
    state: () => this.connectionState,
    subscribe: (listener): Unsubscribe => {
      this.connectionListeners.add(listener);
      return () => {
        this.connectionListeners.delete(listener);
      };
    },
  };

  readonly auth: ApiClient['auth'] = {
    signUp: (input) =>
      this.run('auth.signUp', [input], () => {
        if (input.password.length < 8) throw fail('invalid', 'Password too short');
        if (this.accounts.some((account) => account.email === input.email)) {
          throw fail('emailTaken', 'User already exists');
        }
        const account: FakeAccount = { userId: ulid(), language: 'en', ...input };
        this.accounts.push(account);
        return this.signInAs(account);
      }),
    signIn: (input) =>
      this.run('auth.signIn', [input], () => {
        const account = this.accounts.find(
          (candidate) => candidate.email === input.email && candidate.password === input.password,
        );
        if (!account) throw fail('unauthorized', 'Invalid email or password');
        return this.signInAs(account);
      }),
    signOut: () =>
      this.run('auth.signOut', [], () => {
        this.session = null;
      }),
    signOutOtherDevices: () => this.run('auth.signOutOtherDevices', [], () => {}),
    session: () => this.run('auth.session', [], () => this.session),
    providers: () => this.run('auth.providers', [], () => [...this.providerList]),
    socialSignIn: (provider, callbackUrl) =>
      this.run('auth.socialSignIn', [provider, callbackUrl], () => {
        if (!this.providerList.includes(provider)) throw fail('notFound', 'Provider not found');
        const query = new URLSearchParams({ callbackURL: callbackUrl });
        return { url: `https://${provider}.example/authorize?${query.toString()}` };
      }),
  };

  readonly combats: ApiClient['combats'] = {
    list: () =>
      this.run('combats.list', [], () => {
        this.requireSession();
        return [...this.combatStore.values()]
          .map(({ combat }) => combat)
          .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(summaryOf);
      }),
    create: (input) =>
      this.run('combats.create', [input], () => {
        this.requireSession();
        const now = nowIso();
        return this.storeCombat({
          ...input,
          status: 'setup',
          round: LIMITS.round.min,
          escalation: LIMITS.escalation.min,
          activeUnitId: null,
          lastPlayedAt: null,
          linkGeneration: 0,
          version: 1,
          players: {},
          createdAt: now,
          updatedAt: now,
          units: [],
        });
      }),
    update: (id, patch) =>
      this.run('combats.update', [id, patch], () => {
        const stored = this.stored(id);
        const next: Combat = {
          ...stored.combat,
          ...patch,
          version: stored.combat.version + 1,
          updatedAt: nowIso(),
        };
        this.save(stored, next);
        return { version: next.version };
      }),
    remove: (id) =>
      this.run('combats.remove', [id], () => {
        const { combat } = this.stored(id);
        this.combatStore.delete(id);
        this.endSubscribers(id, { type: 'deleted', title: combat.title }, 'all');
      }),
    duplicate: (id, newId) =>
      this.run('combats.duplicate', [id, newId], () =>
        this.storeCombat(copyCombat(this.stored(id).combat, newId, nowIso())),
      ),
    open: (id) =>
      this.run('combats.open', [id], () => {
        const stored = this.stored(id);
        const now = nowIso();
        const next: Combat = {
          ...stored.combat,
          lastPlayedAt: now,
          version: stored.combat.version + 1,
          updatedAt: now,
        };
        this.save(stored, next);
        return dmDocument(stored);
      }),
    get: (id) => this.run('combats.get', [id], () => dmDocument(this.stored(id))),
    dispatch: (id, action) =>
      this.run('combats.dispatch', [id, action], () =>
        this.dispatchAs(this.stored(id), DM, action),
      ),
    subscribe: (id, onDocument, onEnd) => {
      this.calls.push({ method: 'combats.subscribe', args: [id] });
      const subscriber: DmSubscriber = { onDocument, onEnd, version: -1 };
      if (!this.session) {
        onEnd({ type: 'unauthorized' });
        return () => {};
      }
      const stored = this.combatStore.get(id);
      if (!stored) {
        onEnd({ type: 'deleted', title: '' });
        return () => {};
      }
      const subscribers = this.dmSubscribers.get(id) ?? new Set<DmSubscriber>();
      subscribers.add(subscriber);
      this.dmSubscribers.set(id, subscribers);
      if (this.connectionState === 'connected') this.deliverToDm(subscriber, stored);
      return () => {
        this.dmSubscribers.get(id)?.delete(subscriber);
      };
    },
  };

  readonly link: ApiClient['link'] = {
    get: (id) =>
      this.run('link.get', [id], () => {
        const { combat } = this.stored(id);
        return { token: this.currentToken(combat), generation: combat.linkGeneration };
      }),
    reissue: (id) =>
      this.run('link.reissue', [id], () => {
        const stored = this.stored(id);
        const now = nowIso();
        let combat = stored.combat;
        for (const unit of stored.combat.units) {
          if (unit.claimedBy === null) continue;
          const action: Action = {
            id: ulid(),
            version: combat.version,
            type: 'releaseUnit',
            unitId: unit.id,
          };
          const result = apply(combat, action, DM, now);
          if (result instanceof DomainError) throw fromDomain(result);
          stored.log.push({ action, author: DM, at: now, patch: result.patch, undoneBy: null });
          combat = result.combat;
        }
        const next: Combat = {
          ...combat,
          linkGeneration: combat.linkGeneration + 1,
          version: combat.version + 1,
          updatedAt: now,
        };
        stored.combat = next;
        this.broadcast(stored, 'dm');
        this.endSubscribers(id, { type: 'linkRevoked' }, 'player');
        return { token: this.currentToken(next), generation: next.linkGeneration };
      }),
  };

  readonly play: ApiClient['play'] = {
    get: (token, playerId) =>
      this.run('play.get', [token, playerId], () => {
        const { combat } = this.resolveLink(token);
        return {
          combatId: combat.id,
          playerId,
          language: this.settingsValue.language,
          combat: project(combat, { kind: 'player', playerId }),
        };
      }),
    dispatch: (token, playerId, action) =>
      this.run('play.dispatch', [token, playerId, action], () =>
        this.dispatchAs(this.resolveLink(token), { kind: 'player', playerId }, action),
      ),
    subscribe: (token, playerId, onDocument, onEnd) => {
      this.calls.push({ method: 'play.subscribe', args: [token, playerId] });
      let stored: StoredCombat;
      try {
        stored = this.resolveLink(token);
      } catch (error) {
        const revoked = error instanceof ApiError && error.code === 'linkRevoked';
        onEnd(revoked ? { type: 'linkRevoked' } : { type: 'deleted', title: '' });
        return () => {};
      }
      const combatId = stored.combat.id;
      const subscriber: PlayerSubscriber = { playerId, onDocument, onEnd, version: -1 };
      const subscribers = this.playerSubscribers.get(combatId) ?? new Set<PlayerSubscriber>();
      subscribers.add(subscriber);
      this.playerSubscribers.set(combatId, subscribers);
      if (this.connectionState === 'connected') this.deliverToPlayer(subscriber, stored.combat);
      return () => {
        this.playerSubscribers.get(combatId)?.delete(subscriber);
      };
    },
  };

  readonly presets: ApiClient['presets'] = {
    list: () =>
      this.run('presets.list', [], () => {
        this.requireSession();
        return [...this.presetList];
      }),
    create: (input) =>
      this.run('presets.create', [input], () => {
        this.requireSession();
        const now = nowIso();
        return this.storePreset({ ...input, createdAt: now, updatedAt: now });
      }),
    update: (id, patch) =>
      this.run('presets.update', [id, patch], () => {
        this.requireSession();
        const next: Preset = { ...this.findPreset(id), ...patch, updatedAt: nowIso() };
        this.checkTags(next.tags);
        this.presetList = this.presetList.map((preset) => (preset.id === id ? next : preset));
        return next;
      }),
    remove: (id) =>
      this.run('presets.remove', [id], () => {
        this.requireSession();
        this.findPreset(id);
        this.presetList = this.presetList.filter((preset) => preset.id !== id);
      }),
    duplicate: (id, newId) =>
      this.run('presets.duplicate', [id, newId], () => {
        this.requireSession();
        const source = this.findPreset(id);
        const now = nowIso();
        return this.storePreset({
          ...source,
          id: newId,
          name: duplicateName(
            source.name,
            this.presetList.map((preset) => preset.name),
          ),
          createdAt: now,
          updatedAt: now,
        });
      }),
  };

  readonly tags: ApiClient['tags'] = {
    list: () =>
      this.run('tags.list', [], () => {
        this.requireSession();
        return this.tagList.toSorted(
          (a, b) =>
            normalizeTag(a.name).localeCompare(normalizeTag(b.name)) || a.id.localeCompare(b.id),
        );
      }),
    create: (input) =>
      this.run('tags.create', [input], () => {
        this.requireSession();
        const existing = this.tagList.find((tag) => tag.id === input.id);
        if (existing) return existing;
        const tag: Tag = { id: input.id, name: input.name.trim() };
        this.checkTagName(tag.name);
        if (this.tagList.length >= LIMITS.tagsPerDm) {
          throw fail('limit', `A DM keeps at most ${LIMITS.tagsPerDm} tags`);
        }
        this.tagList = [...this.tagList, tag];
        return tag;
      }),
    rename: (id, name) =>
      this.run('tags.rename', [id, name], () => {
        this.requireSession();
        const tag = this.tagList.find((candidate) => candidate.id === id);
        if (!tag) throw fail('notFound', 'Tag not found');
        this.checkTagName(name, id);
        const next: Tag = { ...tag, name: name.trim() };
        this.tagList = this.tagList.map((candidate) => (candidate.id === id ? next : candidate));
        return next;
      }),
    remove: (id) =>
      this.run('tags.remove', [id], () => {
        this.requireSession();
        if (!this.tagList.some((tag) => tag.id === id)) throw fail('notFound', 'Tag not found');
        this.tagList = this.tagList.filter((tag) => tag.id !== id);
        this.presetList = this.presetList.map((preset) => ({
          ...preset,
          tags: preset.tags.filter((tagId) => tagId !== id),
        }));
      }),
  };

  readonly settings: ApiClient['settings'] = {
    get: () =>
      this.run('settings.get', [], () => {
        this.requireSession();
        return { ...this.settingsValue };
      }),
    update: (patch) =>
      this.run('settings.update', [patch], () => {
        this.updateAccount({ language: patch.language });
        this.settingsValue = { ...patch };
        return { ...this.settingsValue };
      }),
  };

  readonly account: ApiClient['account'] = {
    update: (patch) =>
      this.run('account.update', [patch], () =>
        this.updateAccount({ displayName: patch.displayName }),
      ),
    remove: () =>
      this.run('account.remove', [], () => {
        const session = this.requireSession();
        for (const { combat } of this.combatStore.values()) {
          this.combatStore.delete(combat.id);
          this.endSubscribers(combat.id, { type: 'deleted', title: combat.title }, 'all');
        }
        this.presetList = [];
        this.tagList = [];
        const index = this.accounts.findIndex((account) => account.userId === session.userId);
        if (index >= 0) this.accounts.splice(index, 1);
        this.session = null;
      }),
  };
}
