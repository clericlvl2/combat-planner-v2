import type { Action, Combat, Preset, Tag } from '@combat-planner/domain';
import { fromCombatFile } from '@combat-planner/domain';
import { describe, expect, it } from 'vite-plus/test';
import { ApiError, acceptLanguages, apiEventSchema, browserLocale } from './client.ts';
import type {
  ApiClient,
  CombatCreateInput,
  CombatSummary,
  CombatsApi,
  ConnectionListener,
  ConnectionState,
  Session,
  Settings,
  VersionResult,
} from './client.ts';

const now = '2026-10-16T12:00:00.000Z';

const session: Session = {
  userId: 'user-1',
  email: 'dm@example.com',
  displayName: 'DM',
  language: 'en',
  method: 'email',
};

const combatOf = (input: CombatCreateInput): Combat => ({
  ...input,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 0,
  players: {},
  createdAt: now,
  updatedAt: now,
  units: [],
});

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

function createMemoryClient() {
  const combats = new Map<string, Combat>();
  const presets = new Map<string, Preset>();
  const tags = new Map<string, Tag>();
  const dispatched = new Map<string, VersionResult>();
  let settings: Settings = { language: session.language };
  const connectionState: ConnectionState = 'connected';
  const connectionListeners = new Set<ConnectionListener>();

  const combat = (id: string): Combat => {
    const found = combats.get(id);
    if (!found) throw new ApiError({ status: 404, code: 'notFound' });
    return found;
  };

  const preset = (id: string): Preset => {
    const found = presets.get(id);
    if (!found) throw new ApiError({ status: 404, code: 'notFound' });
    return found;
  };

  const combatsApi: CombatsApi = {
    list: async () => [...combats.values()].map(summaryOf),
    create: async (input) => {
      const created = combatOf(input);
      combats.set(created.id, created);
      return created;
    },
    update: async (id, patch) => {
      const updated = { ...combat(id), ...patch, version: combat(id).version + 1 };
      combats.set(id, updated);
      return { version: updated.version };
    },
    remove: async (id) => {
      combats.delete(id);
    },
    duplicate: async (id, newId) => {
      const copy = { ...combat(id), id: newId, title: `${combat(id).title} (copy)` };
      combats.set(newId, copy);
      return copy;
    },
    importCombat: async (file) => {
      let unit = 0;
      const imported = fromCombatFile(
        file,
        {
          combatId: `01ARZ3NDEKTSV4RRFFQ69G5X${combats.size.toString().padStart(2, '0')}`,
          unitId: () => `01ARZ3NDEKTSV4RRFFQ69G5Y${(unit++).toString().padStart(2, '0')}`,
        },
        now,
      );
      combats.set(imported.id, imported);
      return imported;
    },
    open: async (id) => {
      const opened = { ...combat(id), lastPlayedAt: now };
      combats.set(id, opened);
      return { ...opened, undo: null };
    },
    get: async (id) => ({ ...combat(id), undo: null }),
    dispatch: async (id, action: Action) => {
      const earlier = dispatched.get(action.id);
      if (earlier) return earlier;
      const applied = { ...combat(id), version: combat(id).version + 1 };
      combats.set(id, applied);
      const result = { version: applied.version };
      dispatched.set(action.id, result);
      return result;
    },
    subscribe: (id, onDocument) => {
      onDocument({ ...combat(id), undo: null });
      return () => {};
    },
  };

  return {
    connection: {
      state: () => connectionState,
      subscribe: (listener) => {
        connectionListeners.add(listener);
        return () => {
          connectionListeners.delete(listener);
        };
      },
    },
    auth: {
      signUp: async () => session,
      signIn: async () => session,
      signOut: async () => {},
      signOutOtherDevices: async () => {},
      session: async () => session,
      providers: async () => [],
      socialSignIn: async (provider) => ({ url: `https://${provider}.example/authorize` }),
    },
    combats: combatsApi,
    link: {
      get: async (id) => ({
        token: `${id}:${combat(id).linkGeneration}`,
        generation: combat(id).linkGeneration,
      }),
      reissue: async (id) => {
        const reissued = {
          ...combat(id),
          linkGeneration: combat(id).linkGeneration + 1,
          version: combat(id).version + 1,
        };
        combats.set(id, reissued);
        return { token: `${id}:${reissued.linkGeneration}`, generation: reissued.linkGeneration };
      },
      stopSharing: async (id) => {
        combats.set(id, {
          ...combat(id),
          linkGeneration: combat(id).linkGeneration + 1,
          version: combat(id).version + 1,
        });
      },
    },
    play: {
      get: async (token) => {
        const combatId = token.split(':')[0] ?? '';
        const { units: _units, players: _players, ...fields } = combat(combatId);
        return {
          combatId,
          playerId: combatId,
          language: settings.language,
          combat: { ...fields, myName: null, nextUnitId: null, units: [] },
        };
      },
      dispatch: async (token, action) => {
        const combatId = token.split(':')[0] ?? '';
        return combatsApi.dispatch(combatId, action);
      },
      subscribe: () => () => {},
      leave: async () => {},
    },
    presets: {
      list: async () => [...presets.values()],
      create: async (input) => {
        const created = { ...input, createdAt: now, updatedAt: now };
        presets.set(created.id, created);
        return created;
      },
      update: async (id, patch) => {
        const updated = { ...preset(id), ...patch, updatedAt: now };
        presets.set(id, updated);
        return updated;
      },
      remove: async (id) => {
        presets.delete(id);
      },
      duplicate: async (id, newId) => {
        const copy = { ...preset(id), id: newId, name: `${preset(id).name} 2` };
        presets.set(newId, copy);
        return copy;
      },
    },
    tags: {
      list: async () => [...tags.values()],
      create: async (input) => {
        tags.set(input.id, input);
        return input;
      },
      rename: async (id, name) => {
        const renamed = { id, name };
        tags.set(id, renamed);
        return renamed;
      },
      remove: async (id) => {
        tags.delete(id);
      },
    },
    settings: {
      get: async () => settings,
      update: async (patch) => {
        settings = patch;
        return settings;
      },
    },
    account: {
      update: async (patch) => ({ ...session, ...patch }),
      remove: async () => {},
    },
    reportError: () => undefined,
  } satisfies ApiClient;
}

const client: ApiClient = createMemoryClient();

describe('ApiError', () => {
  it('carries status and code', () => {
    const error = new ApiError({ status: 409, code: 'version' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(409);
    expect(error.code).toBe('version');
    expect(error.retryable).toBe(false);
  });

  it('marks a network failure retryable', () => {
    const error = new ApiError({ status: 0, code: 'network', message: 'offline' });
    expect(error.retryable).toBe(true);
    expect(error.message).toBe('offline');
  });
});

describe('ApiClient contract', () => {
  it('dispatch with a known action id resolves with the earlier result', async () => {
    const created = await client.combats.create({
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      title: 'Goblin ambush',
      description: '',
      color: 7,
    });
    const action: Action = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      version: created.version,
      type: 'setEscalation',
      escalation: 2,
    };
    const first = await client.combats.dispatch(created.id, action);
    const second = await client.combats.dispatch(created.id, action);
    expect(second).toEqual(first);
    expect((await client.combats.get(created.id)).version).toBe(first.version);
  });

  it('link.get returns the token that reissue seeded', async () => {
    const created = await client.combats.create({
      id: '01ARZ3NDEKTSV4RRFFQ69G5FB0',
      title: 'Dragon lair',
      description: '',
      color: 3,
    });
    expect(await client.link.get(created.id)).toEqual({ token: `${created.id}:0`, generation: 0 });
    const reissued = await client.link.reissue(created.id);
    expect(await client.link.get(created.id)).toEqual({ token: reissued.token, generation: 1 });
  });

  it('connection.subscribe returns an unsubscribe function', () => {
    const listener: ConnectionListener = () => {};
    const unsubscribe = client.connection.subscribe(listener);
    expect(typeof unsubscribe).toBe('function');
    expect(client.connection.state()).toBe('connected');
    unsubscribe();
  });

  it('rejects a missing combat with a notFound ApiError', async () => {
    await expect(client.combats.get('01ARZ3NDEKTSV4RRFFQ69G5FAX')).rejects.toMatchObject({
      status: 404,
      code: 'notFound',
    });
  });
});

describe('apiEventSchema', () => {
  it('parses the final events', () => {
    expect(apiEventSchema.parse({ type: 'deleted', title: 'Goblin ambush' })).toEqual({
      type: 'deleted',
      title: 'Goblin ambush',
    });
    expect(apiEventSchema.parse({ type: 'linkRevoked' })).toEqual({ type: 'linkRevoked' });
  });
});

describe('browserLocale', () => {
  it('takes the first supported language by its primary subtag', () => {
    expect(browserLocale(['nl-NL', 'ru-RU', 'en-US'])).toBe('ru');
  });

  it('falls back to en', () => {
    expect(browserLocale(['nl-NL'])).toBe('en');
    expect(browserLocale([])).toBe('en');
  });
});

describe('acceptLanguages', () => {
  it('keeps the header order and drops the quality values', () => {
    expect(acceptLanguages('ru-RU,ru;q=0.9,en;q=0.8')).toEqual(['ru-RU', 'ru', 'en']);
  });

  it('trims spaces around each language', () => {
    expect(acceptLanguages('de-DE, en;q=0.5')).toEqual(['de-DE', 'en']);
  });

  it('returns no language for a missing or empty header', () => {
    expect(acceptLanguages(null)).toEqual([]);
    expect(acceptLanguages('')).toEqual([]);
  });

  it('resolves to a locale through browserLocale', () => {
    expect(browserLocale(acceptLanguages('ru-RU,ru;q=0.9,en;q=0.8'))).toBe('ru');
    expect(browserLocale(acceptLanguages('pt-BR'))).toBe('en');
    expect(browserLocale(acceptLanguages(null))).toBe('en');
  });
});
