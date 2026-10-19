import type { CombatId, PlayerCombat, PlayerId, PresetId, TagId } from '@combat-planner/domain';
import {
  combatSchema,
  combatTitleSchema,
  playerCombatSchema,
  presetSchema,
  tagSchema,
} from '@combat-planner/domain';
import { hc } from 'hono/client';
import { z } from 'zod';
import type { AppType } from './app.ts';
import {
  API_ERROR_CODES,
  ApiError,
  SOCIAL_PROVIDERS,
  combatSummarySchema,
  dmCombatSchema,
  linkReissueResultSchema,
  playerLinkSchema,
  localeSchema,
  playViewSchema,
  sessionSchema,
  settingsSchema,
  signInMethodSchema,
  versionResultSchema,
  versionSchema,
} from './client.ts';
import type {
  ApiClient,
  ApiEndEvent,
  ApiErrorCode,
  ConnectionListener,
  ConnectionState,
  DmCombat,
  EndListener,
  LinkToken,
  Locale,
  Session,
  SignInInput,
  SignInMethod,
  SignUpInput,
  Unsubscribe,
} from './client.ts';

export const RECONNECTING_AFTER_MS = 10_000;
export const REOPEN_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000] as const;
export const EVENT_SOURCE_CLOSED = 2;
export const PROBE_TIMEOUT_MS = 5_000;

export interface MessageEventLike {
  type: string;
  data?: unknown;
}

export interface EventSourceLike {
  readonly readyState: number;
  addEventListener(type: string, listener: (event: MessageEventLike) => void): void;
  close(): void;
}

export type EventSourceConstructor = new (
  url: string,
  init?: { withCredentials?: boolean },
) => EventSourceLike;

export interface HonoApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  eventSource?: EventSourceConstructor;
}

const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  name: z.string(),
  language: localeSchema.default('en'),
});
const authResponseSchema = z.object({ user: authUserSchema });
const authSessionSchema = z.object({ user: authUserSchema, method: signInMethodSchema }).nullable();
const providersSchema = z.object({ providers: z.array(z.enum(SOCIAL_PROVIDERS)) });
const socialSignInSchema = z.object({ url: z.string().min(1) });
type AuthResponse = z.infer<typeof authResponseSchema>;

interface RawResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

const ERROR_CODES: Record<number, ApiErrorCode> = {
  400: 'invalid',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'version',
  410: 'linkRevoked',
  422: 'invalid',
};

const errorBodySchema = z.object({ code: z.string().optional(), message: z.string().optional() });

const apiErrorCodes: ReadonlySet<string> = new Set(API_ERROR_CODES);

const isApiErrorCode = (code: string | undefined): code is ApiErrorCode =>
  code !== undefined && apiErrorCodes.has(code);

async function errorOf(response: RawResponse): Promise<ApiError> {
  const text = await response.text().catch(() => '');
  let message = response.statusText || String(response.status);
  let bodyCode: string | undefined;
  try {
    const parsed = errorBodySchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      message = parsed.data.message || message;
      bodyCode = parsed.data.code;
    }
  } catch {
    message = text || message;
  }
  return new ApiError({
    status: response.status,
    code: isApiErrorCode(bodyCode) ? bodyCode : (ERROR_CODES[response.status] ?? 'invalid'),
    message,
  });
}

async function send(request: () => Promise<RawResponse>): Promise<RawResponse> {
  let response: RawResponse;
  try {
    response = await request();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : 'network';
    throw new ApiError({ status: 0, code: 'network', message });
  }
  if (!response.ok) throw await errorOf(response);
  return response;
}

async function json<T>(request: () => Promise<RawResponse>, schema: z.ZodType<T>): Promise<T> {
  const response = await send(request);
  return schema.parse(await response.json());
}

async function none(request: () => Promise<RawResponse>): Promise<void> {
  await send(request);
}

const sessionOf = ({ user }: AuthResponse, method: SignInMethod): Session =>
  sessionSchema.parse({
    userId: user.id,
    email: user.email,
    displayName: user.name,
    language: user.language,
    method,
  });

const EMPTY_JSON_BODY = {
  headers: { 'Content-Type': 'application/json' },
  init: { body: JSON.stringify({}) },
};

const ULID_PREFIX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}/;

const combatIdOf = (token: LinkToken): CombatId => {
  const match = ULID_PREFIX.exec(token);
  if (!match) throw new ApiError({ status: 400, code: 'invalid', message: 'malformed link token' });
  return match[0];
};

const streamEventSchema = <Document>(document: z.ZodType<Document>) =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('document'),
      version: versionSchema,
      document,
      language: localeSchema.optional(),
    }),
    z.object({ type: z.literal('deleted'), title: combatTitleSchema }),
    z.object({ type: z.literal('linkRevoked') }),
  ]);

type StreamStatus = 'connecting' | 'open' | 'error' | 'reconnecting';

interface Stream {
  status: StreamStatus;
}

function createConnection() {
  const streams = new Set<Stream>();
  const listeners = new Set<ConnectionListener>();
  let state: ConnectionState = 'offline';

  const compute = (): ConnectionState => {
    const statuses = [...streams].map((stream) => stream.status);
    if (statuses.includes('open')) return 'connected';
    if (statuses.includes('reconnecting')) return 'reconnecting';
    if (statuses.includes('error')) return state;
    return 'offline';
  };

  const update = () => {
    const next = compute();
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener(next);
  };

  return {
    api: {
      state: () => state,
      subscribe: (listener: ConnectionListener): Unsubscribe => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    track: (stream: Stream) => {
      streams.add(stream);
      update();
    },
    untrack: (stream: Stream) => {
      streams.delete(stream);
      update();
    },
    update,
  };
}

interface Delivery<Document> {
  document: Document;
  language?: Locale;
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export function createHonoApiClient({
  baseUrl,
  fetch: customFetch,
  eventSource = (globalThis as { EventSource?: EventSourceConstructor }).EventSource,
}: HonoApiClientOptions): ApiClient {
  const client = hc<AppType>(baseUrl, customFetch ? { fetch: customFetch } : {});
  const connection = createConnection();
  const playerHeaders = (playerId: PlayerId) => ({ headers: { 'X-Player-Id': playerId } });

  function openStream<Document extends DmCombat | PlayerCombat>(
    url: string,
    documentSchema: z.ZodType<Document>,
    refetch: (signal?: AbortSignal) => Promise<Delivery<Document>>,
    onDocument: (document: Document, language?: Locale) => void,
    onEnd: EndListener,
  ): Unsubscribe {
    const EventSourceImpl = eventSource;
    if (!EventSourceImpl) return () => {};
    const eventSchema = streamEventSchema(documentSchema);
    const stream: Stream = { status: 'connecting' };
    let source: EventSourceLike;
    let version = -1;
    let title = '';
    let opened = false;
    let closed = false;
    let reopens = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reopenTimer: ReturnType<typeof setTimeout> | undefined;
    let probeController: AbortController | undefined;
    let probeTimer: ReturnType<typeof setTimeout> | undefined;

    const settleProbe = () => {
      if (probeTimer !== undefined) clearTimeout(probeTimer);
      probeTimer = undefined;
      probeController = undefined;
    };

    const cancelProbe = () => {
      const controller = probeController;
      settleProbe();
      controller?.abort();
    };

    const close = () => {
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      if (reopenTimer !== undefined) clearTimeout(reopenTimer);
      timer = undefined;
      reopenTimer = undefined;
      cancelProbe();
      source.close();
      connection.untrack(stream);
    };

    const deliver = ({ document, language }: Delivery<Document>) => {
      if (document.version <= version) return;
      version = document.version;
      title = document.title;
      onDocument(document, language);
    };

    const end = (event: ApiEndEvent) => {
      if (closed) return;
      close();
      onEnd(event);
    };

    const endOf = (error: unknown): ApiEndEvent | null => {
      if (!(error instanceof ApiError)) return null;
      if (error.status === 401) return { type: 'unauthorized' };
      if (error.status === 410) return { type: 'linkRevoked' };
      if (error.status === 404) return { type: 'deleted', title };
      return null;
    };

    const reopenIfClosed = () => {
      if (closed || reopenTimer !== undefined) return;
      if (source.readyState !== EVENT_SOURCE_CLOSED) return;
      const delay = REOPEN_DELAYS_MS[Math.min(reopens, REOPEN_DELAYS_MS.length - 1)];
      reopens += 1;
      reopenTimer = setTimeout(() => {
        reopenTimer = undefined;
        if (closed) return;
        source.close();
        source = connect();
      }, delay);
    };

    const probe = () => {
      if (probeController) return;
      const controller = new AbortController();
      const current = () => probeController === controller;
      probeController = controller;
      probeTimer = setTimeout(() => {
        cancelProbe();
        reopenIfClosed();
      }, PROBE_TIMEOUT_MS);
      refetch(controller.signal).then(
        () => {
          if (!current()) return;
          settleProbe();
          reopenIfClosed();
        },
        (error: unknown) => {
          if (!current()) return;
          settleProbe();
          const ending = endOf(error);
          if (ending) end(ending);
          else reopenIfClosed();
        },
      );
    };

    let repairing = false;

    const repair = () => {
      if (repairing) return;
      repairing = true;
      refetch()
        .then(
          (document) => {
            if (!closed) deliver(document);
          },
          () => {},
        )
        .finally(() => {
          repairing = false;
        });
    };

    const connect = (): EventSourceLike => {
      const next = new EventSourceImpl(url, { withCredentials: true });
      const current = () => !closed && source === next;
      const handleEvent = (event: MessageEventLike) => {
        if (!current() || typeof event.data !== 'string') return;
        const parsed = eventSchema.safeParse(parseJson(event.data));
        if (!parsed.success) {
          repair();
          return;
        }
        if (parsed.data.type === 'document') {
          const { document, language } = parsed.data;
          deliver(language === undefined ? { document } : { document, language });
          return;
        }
        end(parsed.data);
      };
      next.addEventListener('open', () => {
        if (!current()) return;
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        reopens = 0;
        stream.status = 'open';
        connection.update();
        if (opened) refetch().then(deliver, () => {});
        opened = true;
      });
      next.addEventListener('error', () => {
        if (!current()) return;
        stream.status = 'error';
        connection.update();
        timer ??= setTimeout(() => {
          timer = undefined;
          stream.status = 'reconnecting';
          connection.update();
        }, RECONNECTING_AFTER_MS);
        probe();
      });
      for (const type of ['message', 'document', 'deleted', 'linkRevoked']) {
        next.addEventListener(type, handleEvent);
      }
      return next;
    };

    source = connect();
    connection.track(stream);
    return close;
  }

  const getCombat = (id: CombatId, signal?: AbortSignal) =>
    json(() => client.combats[':id'].$get({ param: { id } }, { init: { signal } }), dmCombatSchema);

  const getPlay = (token: LinkToken, playerId: PlayerId, signal?: AbortSignal) =>
    json(
      () =>
        client.play[':id'].$get(
          { param: { id: combatIdOf(token) }, query: { t: token } },
          { ...playerHeaders(playerId), init: { signal } },
        ),
      playViewSchema,
    );

  const combats: ApiClient['combats'] = {
    list: () => json(() => client.combats.$get(), combatSummarySchema.array()),
    create: (input) => json(() => client.combats.$post({ json: input }), combatSchema),
    update: (id, patch) =>
      json(() => client.combats[':id'].$patch({ param: { id }, json: patch }), versionResultSchema),
    remove: (id) => none(() => client.combats[':id'].$delete({ param: { id } })),
    duplicate: (id, newId) =>
      json(
        () => client.combats[':id'].duplicate.$post({ param: { id }, json: { id: newId } }),
        combatSchema,
      ),
    open: (id) => json(() => client.combats[':id'].open.$post({ param: { id } }), dmCombatSchema),
    get: (id) => getCombat(id),
    dispatch: (id, action) =>
      json(
        () => client.combats[':id'].actions.$post({ param: { id }, json: action }),
        versionResultSchema,
      ),
    subscribe: (id, onDocument, onEnd) =>
      openStream(
        `${baseUrl}/combats/${id}/events`,
        dmCombatSchema,
        async (signal) => ({ document: await getCombat(id, signal) }),
        onDocument,
        onEnd,
      ),
  };

  const play: ApiClient['play'] = {
    get: (token, playerId) => getPlay(token, playerId),
    dispatch: (token, playerId, action) =>
      json(
        () =>
          client.play[':id'].actions.$post(
            { param: { id: combatIdOf(token) }, query: { t: token }, json: action },
            playerHeaders(playerId),
          ),
        versionResultSchema,
      ),
    subscribe: (token, playerId, onDocument, onEnd) => {
      const query = new URLSearchParams({ t: token, playerId });
      return openStream(
        `${baseUrl}/play/${combatIdOf(token)}/events?${query.toString()}`,
        playerCombatSchema,
        async (signal) => {
          const view = await getPlay(token, playerId, signal);
          return { document: view.combat, language: view.language };
        },
        onDocument,
        onEnd,
      );
    },
  };

  return {
    connection: connection.api,
    auth: {
      signUp: async ({ email, password, displayName }: SignUpInput) =>
        sessionOf(
          await json(
            () =>
              client.auth['sign-up'].email.$post({ json: { email, password, name: displayName } }),
            authResponseSchema,
          ),
          'email',
        ),
      signIn: async (input: SignInInput) =>
        sessionOf(
          await json(() => client.auth['sign-in'].email.$post({ json: input }), authResponseSchema),
          'email',
        ),
      signOut: () => none(() => client.auth['sign-out'].$post({}, EMPTY_JSON_BODY)),
      session: async () => {
        const found = await json(() => client.auth['get-session'].$get(), authSessionSchema);
        return found === null ? null : sessionOf(found, found.method);
      },
      providers: async () =>
        (await json(() => client['auth-providers'].$get(), providersSchema)).providers,
      socialSignIn: async (provider, callbackUrl) => {
        const { url } = await json(
          () =>
            client.auth['sign-in'].social.$post({ json: { provider, callbackURL: callbackUrl } }),
          socialSignInSchema,
        );
        return { url };
      },
    },
    combats,
    link: {
      get: (id) => json(() => client.combats[':id'].link.$get({ param: { id } }), playerLinkSchema),
      reissue: (id) =>
        json(
          () => client.combats[':id'].link.reissue.$post({ param: { id } }),
          linkReissueResultSchema,
        ),
    },
    play,
    presets: {
      list: () => json(() => client.presets.$get(), presetSchema.array()),
      create: (input) => json(() => client.presets.$post({ json: input }), presetSchema),
      update: (id, patch) =>
        json(() => client.presets[':id'].$patch({ param: { id }, json: patch }), presetSchema),
      remove: (id) => none(() => client.presets[':id'].$delete({ param: { id } })),
      duplicate: (id, newId: PresetId) =>
        json(
          () => client.presets[':id'].duplicate.$post({ param: { id }, json: { id: newId } }),
          presetSchema,
        ),
    },
    tags: {
      list: () => json(() => client.tags.$get(), tagSchema.array()),
      create: (input) => json(() => client.tags.$post({ json: input }), tagSchema),
      rename: (id: TagId, name) =>
        json(() => client.tags[':id'].$patch({ param: { id }, json: { name } }), tagSchema),
      remove: (id) => none(() => client.tags[':id'].$delete({ param: { id } })),
    },
    settings: {
      get: () => json(() => client.settings.$get(), settingsSchema),
      update: (patch) => json(() => client.settings.$patch({ json: patch }), settingsSchema),
    },
    account: {
      update: (patch) => json(() => client.account.$patch({ json: patch }), sessionSchema),
      remove: () => none(() => client.account.$delete()),
    },
  };
}
